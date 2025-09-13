// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  try {
    // Get the Stripe signature from headers
    const signature = req.headers.get('Stripe-Signature');
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!signature || !endpointSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature or webhook secret' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the request body
    const body = await req.text();
    
    // In a real implementation, you would verify the webhook signature here
    // For now, we'll parse the event directly
    let event;
    try {
      event = JSON.parse(body);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in webhook body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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