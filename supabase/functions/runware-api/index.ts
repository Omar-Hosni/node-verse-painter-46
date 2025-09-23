import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RUNWARE-API] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get the Runware API key from environment variables (secure)
    const runwareApiKey = Deno.env.get('REACT_APP_RUNWARE_API_KEY');
    if (!runwareApiKey) {
      throw new Error("REACT_APP_RUNWARE_API_KEY is not configured");
    }

    // Authenticate user using Clerk JWT (decode without Supabase auth)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");

    // Decode JWT payload (base64url) to extract user id and validate expiration
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid authorization token format");
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if necessary
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error("Authorization token expired");
    }

    const userId = payload.sub || payload.user_id || payload.userId;
    if (!userId) {
      throw new Error("Authorization token missing user id");
    }

    logStep("User authenticated", { userId });

    // Get request body
    const requestBody = await req.json();
    logStep("Request received", { taskType: requestBody.taskType });

    // Prepare the request to Runware API
    const runwareRequest = [{
      taskType: "authentication",
      apiKey: runwareApiKey
    }];

    // Add the user's request to the batch
    if (requestBody.taskType) {
      runwareRequest.push({
        taskUUID: crypto.randomUUID(),
        ...requestBody
      });
    }

    // Make request to Runware API
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(runwareRequest)
    });

    if (!response.ok) {
      throw new Error(`Runware API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logStep("Runware API response received", { success: true });

    // Filter out authentication response and return only the user's requested data
    const filteredData = data.data?.filter((item: any) => item.taskType !== "authentication") || [];

    return new Response(JSON.stringify({ data: filteredData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in runware-api", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});