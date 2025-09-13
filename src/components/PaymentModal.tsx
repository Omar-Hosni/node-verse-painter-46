import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { CREDIT_PACKAGES, createCheckoutSession, getStripe } from '@/services/stripeService';
import { useCanvasStore } from '@/store/useCanvasStore';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const credits = useCanvasStore(state => state.credits);
  const fetchUserCredits = useCanvasStore(state => state.fetchUserCredits);

  const handlePayment = async () => {
    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    setIsLoading(true);
    try {
      // Get Stripe instance
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to initialize Stripe');
      }

      // Create a checkout session
      const session = await createCheckoutSession(selectedPackage);

      // Redirect to Stripe checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
      setIsLoading(false);
    }
  };

  const getPackageById = (id: string) => {
    const allPackages = [...CREDIT_PACKAGES.topup, ...CREDIT_PACKAGES.subscription];
    return allPackages.find(pkg => pkg.id === id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#1A1A1A] border-[#333] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Credits</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Current Credits</h3>
            <div className="flex items-center gap-2 bg-[#222] p-3 rounded-lg">
              <CreditCard className="text-blue-400" />
              <span className="text-xl font-bold">{credits !== null ? credits.toLocaleString() : '0'}</span>
              <span className="text-gray-400">credits</span>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Top-up Packages</h3>
            <div className="space-y-3">
              {CREDIT_PACKAGES.topup.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPackage === pkg.id 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-[#333] hover:border-[#444]'
                  }`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-gray-400">{pkg.credits} credits</div>
                    </div>
                    {selectedPackage === pkg.id && (
                      <CheckCircle className="text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Subscription Plans</h3>
            <div className="space-y-3">
              {CREDIT_PACKAGES.subscription.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPackage === pkg.id 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-[#333] hover:border-[#444]'
                  }`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-gray-400">{pkg.credits} credits</div>
                    </div>
                    {selectedPackage === pkg.id && (
                      <CheckCircle className="text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handlePayment}
            disabled={!selectedPackage || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${((getPackageById(selectedPackage!)?.price || 0) / 100).toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};