import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-USER-CREDITS] ${step}${detailsStr}`);
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

      // Initialize Supabase client with service role key
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get user credits
      const { data: userData, error } = await supabase
        .from('user_credits')
        .select('credits, is_admin, email')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User not found - return default free credits
          logStep("User not found - returning default credits", { userId });
          return new Response(JSON.stringify({ 
            credits: 50,
            isAdmin: false,
            isNewUser: true
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        logStep("Database error", { error: error.message });
        throw new Error(`Database error: ${error.message}`);
      }

      // Check if admin user (unlimited credits)
      if (userData.is_admin) {
        logStep("Admin user - unlimited credits", { userId });
        return new Response(JSON.stringify({ 
          credits: 999999,
          isAdmin: true,
          isNewUser: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("User credits fetched successfully", { 
        userId, 
        credits: userData.credits 
      });

      return new Response(JSON.stringify({ 
        credits: userData.credits,
        isAdmin: false,
        isNewUser: false
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
    logStep("ERROR in get-user-credits", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});