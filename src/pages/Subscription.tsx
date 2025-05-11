
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/AppHeader';
import { CreditCard, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvasStore } from '@/store/useCanvasStore';
import { toast } from 'sonner';

type PaymentMethod = 'paypal' | 'card';

const Subscription = () => {
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'standard' | 'premium' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const navigate = useNavigate();
  
  const plans = {
    free: {
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      credits: {
        monthly: 100,
        annually: 1200,
      },
      features: [
        '100 credits monthly',
        'Basic templates',
        'Community support',
      ],
      missingFeatures: [
        'Priority support',
        'Advanced templates',
        'API access',
      ]
    },
    standard: {
      name: 'Standard',
      monthlyPrice: 10,
      annualPrice: 100, // 10*12 = 120, 20 discount
      credits: {
        monthly: 1000,
        annually: 12000,
      },
      features: [
        '1,000 credits monthly',
        'Basic templates',
        'Community support',
        'Priority support',
      ],
      missingFeatures: [
        'Advanced templates',
        'API access',
      ]
    },
    premium: {
      name: 'Premium',
      monthlyPrice: 50,
      annualPrice: 500, // 50*12 = 600, 100 discount
      credits: {
        monthly: 10000,
        annually: 120000,
      },
      features: [
        '10,000 credits monthly',
        'Basic templates',
        'Community support',
        'Priority support',
        'Advanced templates',
        'API access',
      ],
      missingFeatures: []
    }
  };

  const handlePlanSelect = (plan: 'free' | 'standard' | 'premium') => {
    setSelectedPlan(plan);
  };

  const handlePayment = () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }
    
    // In a real application, we would process payment here
    toast.success(`Subscribed to ${plans[selectedPlan].name} plan`);
    navigate('/dashboard');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <AppHeader onBackToDashboard={handleBackToDashboard} />
      
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-center mb-2">Choose a Plan</h1>
        <p className="text-gray-400 text-center mb-10">Select the plan that works best for you</p>
        
        <Tabs defaultValue="monthly" className="max-w-3xl mx-auto">
          <TabsList className="grid grid-cols-2 mb-8 bg-[#1A1A1A]">
            <TabsTrigger 
              value="monthly" 
              onClick={() => setBilling('monthly')}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Monthly Billing
            </TabsTrigger>
            <TabsTrigger 
              value="annually" 
              onClick={() => setBilling('annually')}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Annual Billing <span className="ml-2 bg-blue-900 text-xs py-0.5 px-2 rounded-full">Save 15%</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="grid md:grid-cols-3 gap-6">
            {(Object.keys(plans) as Array<keyof typeof plans>).map((planKey) => {
              const plan = plans[planKey];
              const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
              const credits = billing === 'monthly' ? plan.credits.monthly : plan.credits.annually;
              
              return (
                <div 
                  key={planKey}
                  className={`rounded-lg p-6 border ${selectedPlan === planKey 
                    ? 'border-blue-500 bg-[#1A1A1A]' 
                    : 'border-[#333] bg-[#171717]'}`}
                >
                  <div className="text-xl font-bold mb-2">{plan.name}</div>
                  <div className="flex items-baseline mb-6">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-gray-400 ml-1">/{billing === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-6 bg-[#222] p-2 rounded">
                    <CreditCard className="text-blue-400" />
                    <div>
                      <div className="font-bold">{credits.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">credits per {billing}</div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center mb-2">
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    
                    {plan.missingFeatures.map((feature) => (
                      <div key={feature} className="flex items-center mb-2 text-gray-500">
                        <X className="h-5 w-5 mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => handlePlanSelect(planKey)}
                    className={`w-full ${selectedPlan === planKey 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-[#2A2A2A] hover:bg-[#333]'}`}
                  >
                    {planKey === 'free' ? 'Select' : 'Subscribe'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Tabs>
        
        {selectedPlan && selectedPlan !== 'free' && (
          <div className="mt-12 max-w-md mx-auto bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            
            <div className="flex gap-4 mb-6">
              <Button 
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
                className={paymentMethod === 'card' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#222] hover:bg-[#333]'}
              >
                Credit Card
              </Button>
              <Button 
                variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('paypal')}
                className={paymentMethod === 'paypal' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#222] hover:bg-[#333]'}
              >
                PayPal
              </Button>
            </div>
            
            {/* This would be replaced with an actual payment form */}
            <div className="mb-6 bg-[#222] p-4 rounded border border-[#333]">
              <p className="text-center text-gray-400">
                {paymentMethod === 'card' 
                  ? 'Credit card payment form would be here' 
                  : 'PayPal checkout would be here'}
              </p>
            </div>
            
            <Button 
              onClick={handlePayment}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Complete Payment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
