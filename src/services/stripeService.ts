import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';

// Make sure to add your Stripe publishable key to your .env file
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51S5LfJRUOkxevul8IYRgIzRRbwRj57AaSq8KI9lhG0WZZtRpwhZ1G0gNo6AtRNAG5wyj1XbBIjllMAI78Wf04VL700XuNWyCV3';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Credit packages as defined in the requirements
export const CREDIT_PACKAGES = {
  topup: [
    { id: 'topup-5', name: '$5 - 250 Credits', price: 500, credits: 250 }, // price in cents
    { id: 'topup-10', name: '$10 - 500 Credits', price: 1000, credits: 500 }
  ],
  subscription: [
    { id: 'sub-10', name: '$10 - 1000 Credits', price: 1000, credits: 1000 },
    { id: 'sub-25', name: '$25 - 3500 Credits', price: 2500, credits: 3500 },
    { id: 'sub-50', name: '$50 - 10000 Credits', price: 5000, credits: 10000 }
  ]
};

// Function to create a Stripe checkout session
export const createCheckoutSession = async (priceId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Find the package details
    const allPackages = [...CREDIT_PACKAGES.topup, ...CREDIT_PACKAGES.subscription];
    const pkg = allPackages.find(p => p.id === priceId);
    
    if (!pkg) {
      throw new Error('Package not found');
    }

    // In a real implementation, this would call your backend API to create a Stripe checkout session
    // For now, we'll simulate a successful response
    console.log('Creating checkout session for:', { priceId, userId: user.id, credits: pkg.credits });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a simulated session object
    return {
      id: 'cs_test_' + Math.random().toString(36).substring(7),
      url: 'https://checkout.stripe.com/pay/cs_test_123'
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Function to add credits to user's account
export const addUserCredits = async (userId: string, creditsToAdd: number) => {
  try {
    // First, get the user's current credits
    const { data: userData, error: userError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine if user has no credits record yet
      throw new Error(`Error fetching user credits: ${userError.message}`);
    }

    let newCredits = creditsToAdd;
    if (userData) {
      newCredits = userData.credits + creditsToAdd;
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits: newCredits, last_updated: new Date().toISOString() })
        .eq('user_id', userId);
      
      if (updateError) {
        throw new Error(`Error updating user credits: ${updateError.message}`);
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
        throw new Error(`Error creating user credits record: ${insertError.message}`);
      }
    }

    return newCredits;
  } catch (error) {
    console.error('Error adding user credits:', error);
    throw error;
  }
};

// Function to get user's current credits
export const getUserCredits = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found, return 50 free credits for new users
        return 50;
      }
      throw new Error(`Error fetching user credits: ${error.message}`);
    }

    return data.credits;
  } catch (error) {
    console.error('Error getting user credits:', error);
    throw error;
  }
};