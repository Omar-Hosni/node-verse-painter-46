import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-USER-PROJECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { name, description } = await req.json();
    
    if (!name?.trim()) {
      throw new Error("Project name is required");
    }

    // Get Clerk user info from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decode JWT payload to get user info (basic validation)
    let userId;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error("Token expired");
      }
      
      userId = payload.sub;
      
      if (!userId) {
        throw new Error("No user ID in token");
      }
    } catch (jwtError) {
      logStep("JWT decode error", { error: jwtError.message });
      throw new Error("Invalid token format");
    }

    logStep("Clerk user authenticated", { userId });

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create new project
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        canvas_data: { nodes: [], edges: [] }
      })
      .select()
      .single();

    if (error) {
      logStep("Database error", { error: error.message });
      throw new Error(`Database error: ${error.message}`);
    }

    logStep("Project created successfully", { projectId: data.id });

    return new Response(JSON.stringify({ project: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-user-project", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});