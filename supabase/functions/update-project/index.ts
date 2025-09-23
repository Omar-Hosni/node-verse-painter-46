import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-PROJECT] ${step}${detailsStr}`);
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
      
      const userId = payload.sub;
      
      if (!userId) {
        throw new Error("No user ID in token");
      }
      
      logStep("Clerk user authenticated", { userId });

      // Get request data
      const { projectId, canvasData, name, description } = await req.json();
      
      if (!projectId) {
        throw new Error("Project ID is required");
      }

      // Initialize Supabase client with service role key
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Verify project ownership and update
      const { data: project, error } = await supabase
        .from('projects')
        .update({
          ...(canvasData && { canvas_data: canvasData }),
          ...(name && { name }),
          ...(description !== undefined && { description }),
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logStep("Project not found or access denied", { projectId, userId });
          return new Response(JSON.stringify({ error: "Project not found or access denied" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }
        logStep("Database error", { error: error.message });
        throw new Error(`Database error: ${error.message}`);
      }

      logStep("Project updated successfully", { projectId });

      return new Response(JSON.stringify({ project }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (jwtError) {
      logStep("JWT decode error", { error: jwtError.message });
      throw new Error("Invalid token format");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in update-project", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});