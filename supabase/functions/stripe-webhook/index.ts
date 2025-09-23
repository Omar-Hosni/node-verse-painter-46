// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[STRIPE-WEBHOOK] Processing webhook request');

    // Get the Stripe signature from headers
    const signature = req.headers.get('Stripe-Signature');
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!signature || !endpointSecret) {
      console.error('[STRIPE-WEBHOOK] Missing signature or secret');
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature or webhook secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the request body as raw bytes for signature verification
    const body = await req.text();
    
    // CRITICAL SECURITY FIX: Verify webhook signature to prevent tampering
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
      console.log('[STRIPE-WEBHOOK] Signature verified successfully');
    } catch (err) {
      console.error('[STRIPE-WEBHOOK] Signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Get user ID and credits to add from metadata
        const userId = session.metadata?.userId;
        const creditsToAdd = parseInt(session.metadata?.credits || '0');
        
        if (userId && creditsToAdd > 0) {
          // Add credits to user's account
          const { data, error } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user credits:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch user credits' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }

          if (data) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('user_credits')
              .update({ 
                credits: data.credits + creditsToAdd,
                last_updated: new Date().toISOString()
              })
              .eq('user_id', userId);
            
            if (updateError) {
              console.error('Error updating user credits:', updateError);
              return new Response(
                JSON.stringify({ error: 'Failed to update user credits' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
              );
            }
          } else {
            // Create new record
            const { error: insertError } = await supabase
              .from('user_credits')
              .insert({
                user_id: userId,
                credits: creditsToAdd,
                last_updated: new Date().toISOString()
              });
            
            if (insertError) {
              console.error('Error creating user credits record:', insertError);
              return new Response(
                JSON.stringify({ error: 'Failed to create user credits record' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }
        }
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});