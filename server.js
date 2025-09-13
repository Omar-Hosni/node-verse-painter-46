import express from 'express';
import cors from 'cors';
import stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Initialize Stripe
const stripeInstance = stripe('sk_test_your_stripe_secret_key_here');

// Initialize Supabase client
const supabase = createClient(
  'https://hssxrcsnxhegtcpchxhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3hyY3NueGhlZ3RjcGNoeGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MjIzMzYsImV4cCI6MjA2MjQ5ODMzNn0.5LO_G1x91Xa1a_tAO5HquPPcpSmepu8ePMReaqr-hlc'
);

app.use(cors());
app.use(express.json());
app.use(express.raw({type: 'application/json'}));

// Stripe webhook endpoint
app.post('/webhook', async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(request.body, sig, 'whsec_your_webhook_signing_secret');
  } catch (err) {
    console.log(`Webhook Error: ${err.message}`);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // Get user ID and credits to add from metadata
      const userId = session.metadata?.userId;
      const creditsToAdd = parseInt(session.metadata?.credits || '0');
      
      if (userId && creditsToAdd > 0) {
        try {
          // Add credits to user's account
          const { data, error } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('user_id', userId)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user credits:', error);
            break;
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
            }
          }
        } catch (error) {
          console.error('Error processing payment:', error);
        }
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  response.json({received: true});
});

// Create checkout session endpoint
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, credits } = req.body;
    
    // Create a checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Credits Package - ${credits} credits`,
            },
            unit_amount: priceId.includes('topup-5') ? 500 : 
                         priceId.includes('topup-10') ? 1000 : 
                         priceId.includes('sub-10') ? 1000 : 
                         priceId.includes('sub-25') ? 2500 : 5000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:8080/dashboard',
      cancel_url: 'http://localhost:8080/dashboard',
      metadata: {
        userId: userId,
        credits: credits.toString()
      }
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));