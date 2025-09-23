import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEDUCT-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get Clerk user info from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decode JWT payload to get user info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error("Token expired");
      }
      
      // Clerk JWT uses 'sub' field for user ID
      const userId = payload.sub;
      
      if (!userId) {
        throw new Error("No user ID in token");
      }
      
      logStep("Clerk user authenticated", { userId });

      // Get amount from request body (default 5 credits)
      const { amount = 5 } = await req.json();

      // Initialize Supabase client with service role key
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get current credits
      const { data: userData, error: fetchError } = await supabase
        .from('user_credits')
        .select('credits, is_admin, email')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          logStep("User not found in credits table", { userId });
          return new Response(JSON.stringify({ 
            success: false, 
            error: "User not found in credits system" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }
        logStep("Database error fetching user", { error: fetchError.message });
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // Check if admin user (unlimited credits)
      if (userData.is_admin) {
        logStep("Admin user - unlimited credits", { userId });
        return new Response(JSON.stringify({ 
          success: true, 
          remainingCredits: 999999,
          isAdmin: true 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check if user has enough credits
      if (userData.credits < amount) {
        logStep("Insufficient credits", { 
          userId, 
          currentCredits: userData.credits, 
          requiredAmount: amount 
        });
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Insufficient credits",
          currentCredits: userData.credits,
          requiredAmount: amount
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Deduct credits
      const newCredits = userData.credits - amount;
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          credits: newCredits, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId);

      if (updateError) {
        logStep("Database error updating credits", { error: updateError.message });
        throw new Error(`Failed to update credits: ${updateError.message}`);
      }

      logStep("Credits deducted successfully", { 
        userId, 
        amountDeducted: amount, 
        remainingCredits: newCredits 
      });

      return new Response(JSON.stringify({ 
        success: true, 
        remainingCredits: newCredits,
        amountDeducted: amount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (jwtError) {
      logStep("JWT decode error", { error: jwtError.message });
      throw new Error("Invalid token format");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in deduct-credits", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});