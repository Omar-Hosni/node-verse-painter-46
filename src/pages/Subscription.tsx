
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
  const [selectedPlan, setSelectedPlan] = useState<'test' | 'basic' | 'premium' | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Stripe products mapping
  const plans = {
    test: {
      name: 'Test Plan',
      monthlyPrice: 2,
      priceId: 'price_1S8MgoRXXdJaLGyuwK3xxzxW',
      productId: 'prod_T4VijoKEKcIRbX',
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

  const handlePlanSelect = (plan: 'test' | 'basic' | 'premium') => {
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
    <div className="min-h-screen bg-black text-white">
      <AppHeader onBackToDashboard={handleBackToDashboard} />
      
      <div className="w-full min-h-screen bg-black flex justify-center items-center p-10 box-border">
        {/* Current Subscription Status */}
        {currentSubscription?.subscribed && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 mb-8 p-6 bg-[#0D0D0D] rounded-3xl border border-green-500/20">
            <h2 className="text-xl font-bold text-green-400 mb-2">Current Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium">{currentSubscription.planName}</p>
                <p className="text-white/40">{currentSubscription.creditsPerMonth} credits per month</p>
                {currentSubscription.subscriptionEnd && (
                  <p className="text-sm text-white/40">
                    Renews on {new Date(currentSubscription.subscriptionEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button 
                onClick={handleManageSubscription}
                className="bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-full h-8 px-4 text-sm font-normal"
              >
                Manage Subscription
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-row gap-5 max-w-none">
          {(Object.keys(plans) as Array<keyof typeof plans>).slice(1).map((planKey) => {
            const plan = plans[planKey];
            const isCurrentPlan = currentSubscription?.subscribed && 
              ((planKey === 'basic' && currentSubscription.planName === 'Basic Plan') ||
               (planKey === 'premium' && currentSubscription.planName === 'Premium Plan'));
            const isPremium = planKey === 'premium';
            
            return (
              <div 
                key={planKey}
                className={`w-full max-w-[300px] bg-[#0D0D0D] ${
                  isPremium ? 'border border-[#007AFF]' : 'border border-[#151515]'
                } p-4 rounded-3xl flex flex-col gap-5 box-border font-sans`}
              >
                {/* Top horizontal stack */}
                <div className="flex justify-between items-center w-full gap-2">
                  <CreditCard className="w-5 h-5 opacity-40" />
                  <span className="text-2xl font-semibold text-white/40 w-full text-left">
                    {planKey === 'basic' ? 'Mini' : 'Pro'}
                  </span>
                  <span className={`${
                    isPremium 
                      ? 'bg-[#007AFF] text-white' 
                      : 'bg-[#1C1C1C] text-white/40'
                  } rounded-2xl px-[6px] py-[2px] text-xs font-medium`}>
                    {isCurrentPlan ? 'ACTIVE' : 'Discovery'}
                  </span>
                </div>

                {/* Price horizontal stack */}
                <div className="flex items-end gap-[6px] w-full">
                  <span className="text-[32px] font-semibold text-white leading-none">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-white/40">/month</span>
                </div>

                {/* Plan description */}
                <p className="text-sm text-white/40 m-0">
                  Perfect for {planKey === 'basic' ? 'getting started with AI image generation' : 'power users who need more credits and advanced features'}.
                </p>

                {/* Divider */}
                <div className="w-full h-px rounded bg-white/[0.07]"></div>

                {/* Features vertical stack */}
                <div className="flex flex-col gap-2 w-full">
                  {plan.features.slice(0, 3).map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <svg className="w-[14px] h-[14px] fill-[#007AFF]" viewBox="0 0 24 24">
                        <path d="M20.285 6.709a1 1 0 0 0-1.414-1.418l-9.17 9.176-4.59-4.59a1 1 0 0 0-1.414 1.414l5.296 5.296a1 1 0 0 0 1.414 0l9.878-9.878z"/>
                      </svg>
                      <span className="text-sm text-white/40">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Button container */}
                <div className="pt-8">
                  <button 
                    onClick={() => handlePlanSelect(planKey)}
                    disabled={isCurrentPlan || isLoading}
                    className={`${
                      isCurrentPlan
                        ? 'bg-green-600 cursor-not-allowed opacity-75'
                        : isPremium 
                          ? 'bg-[#007AFF] hover:opacity-90' 
                          : 'bg-black hover:opacity-90'
                    } text-white border-none h-[33px] rounded-full text-sm font-normal cursor-pointer w-full transition-opacity`}
                  >
                    {isCurrentPlan ? 'Active' : selectedPlan === planKey ? 'Selected' : 'Get Started'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {selectedPlan && !currentSubscription?.subscribed && (
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
            <Button 
              onClick={handleSubscribe}
              disabled={isLoading}
              className="bg-[#007AFF] hover:bg-[#007AFF]/90 px-8 py-3 text-lg rounded-full"
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
