
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/AppHeader';
import { CreditCard, Check, X, Loader2 } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Subscription = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Stripe products mapping
  const plans = {
    basic: {
      name: 'Basic Plan',
      monthlyPrice: 10,
      priceId: 'price_1S6jWJRXXdJaLGyuS5IdeMKA',
      productId: 'prod_T2pAukUJr0tJtH',
      credits: 1000,
      features: [
        '1,000 credits monthly',
        'AI image generation',
        'Basic templates',
        'Email support',
      ],
      missingFeatures: [
        'Priority support',
        'Advanced features',
        'API access',
      ]
    },
    premium: {
      name: 'Premium Plan',
      monthlyPrice: 25,
      priceId: 'price_1S6jXkRXXdJaLGyu0yf9Eukw',
      productId: 'prod_T2pCM8dpgeQp3X',
      credits: 3500,
      features: [
        '3,500 credits monthly',
        'AI image generation',
        'Basic templates',
        'Email support',
        'Priority support',
        'Advanced features',
        'API access',
      ],
      missingFeatures: []
    }
  };

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;
      
      try {
        setLoadingSubscription(true);
        // Get Clerk session token
        const token = await getToken();
        
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (error) throw error;
        setCurrentSubscription(data);
      } catch (error) {
        console.error('Error checking subscription:', error);
        toast.error('Failed to check subscription status');
      } finally {
        setLoadingSubscription(false);
      }
    };

    checkSubscription();
  }, [user]);

  const handlePlanSelect = (plan: 'basic' | 'premium') => {
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) {
      toast.error('Please select a plan');
      return;
    }
    
    setIsLoading(true);
    try {
      // Get Clerk session token
      const token = await getToken();
      
      const plan = plans[selectedPlan];
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          priceId: plan.priceId,
        },
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to create subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    
    try {
      // Get Clerk session token
      const token = await getToken();
      
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast.error('Failed to open customer portal');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loadingSubscription) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <AppHeader onBackToDashboard={handleBackToDashboard} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading subscription details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <AppHeader onBackToDashboard={handleBackToDashboard} />
      
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-center mb-2">Choose Your Plan</h1>
        <p className="text-gray-400 text-center mb-10">Select the plan that works best for your needs</p>
        
        {/* Current Subscription Status */}
        {currentSubscription?.subscribed && (
          <div className="mb-8 p-6 bg-[#1A1A1A] rounded-lg border border-green-500/20">
            <h2 className="text-xl font-bold text-green-400 mb-2">Current Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium">{currentSubscription.planName}</p>
                <p className="text-gray-400">{currentSubscription.creditsPerMonth} credits per month</p>
                {currentSubscription.subscriptionEnd && (
                  <p className="text-sm text-gray-500">
                    Renews on {new Date(currentSubscription.subscriptionEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button 
                onClick={handleManageSubscription}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Manage Subscription
              </Button>
            </div>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-8">
          {(Object.keys(plans) as Array<keyof typeof plans>).map((planKey) => {
            const plan = plans[planKey];
            const isCurrentPlan = currentSubscription?.subscribed && 
              ((planKey === 'basic' && currentSubscription.planName === 'Basic Plan') ||
               (planKey === 'premium' && currentSubscription.planName === 'Premium Plan'));
            
            return (
              <div 
                key={planKey}
                className={`rounded-lg p-6 border relative ${
                  isCurrentPlan 
                    ? 'border-green-500 bg-[#1A1A1A]' 
                    : selectedPlan === planKey 
                      ? 'border-blue-500 bg-[#1A1A1A]' 
                      : 'border-[#333] bg-[#171717]'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-6 bg-green-500 text-black px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </div>
                )}
                
                <div className="text-xl font-bold mb-2">{plan.name}</div>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold">${plan.monthlyPrice}</span>
                  <span className="text-gray-400 ml-1">/month</span>
                </div>
                
                <div className="flex items-center gap-2 mb-6 bg-[#222] p-2 rounded">
                  <CreditCard className="text-blue-400" />
                  <div>
                    <div className="font-bold">{plan.credits.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">credits per month</div>
                  </div>
                </div>
                
                <div className="mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center mb-2">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  
                  {plan.missingFeatures.map((feature) => (
                    <div key={feature} className="flex items-center mb-2 text-gray-500">
                      <X className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={() => handlePlanSelect(planKey)}
                  disabled={isCurrentPlan || isLoading}
                  className={`w-full mb-4 ${
                    isCurrentPlan
                      ? 'bg-green-600 cursor-not-allowed opacity-75'
                      : selectedPlan === planKey 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-[#2A2A2A] hover:bg-[#333]'
                  }`}
                >
                  {isCurrentPlan ? 'Active' : selectedPlan === planKey ? 'Selected' : 'Select Plan'}
                </Button>
              </div>
            );
          })}
        </div>
        
        {selectedPlan && !currentSubscription?.subscribed && (
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={handleSubscribe}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Subscribe to ${plans[selectedPlan].name} - $${plans[selectedPlan].monthlyPrice}/month`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
