import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { supabase } from '@/integrations/supabase/client';
import { useUser, useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Credit packages for top-up
const CREDIT_PACKAGES = {
  topup: [
    { id: 'topup-5', name: '$5 - 250 Credits', price: 500, credits: 250 }, // price in cents
    { id: 'topup-10', name: '$10 - 500 Credits', price: 1000, credits: 500 },
    { id: 'topup-25', name: '$25 - 1,500 Credits', price: 2500, credits: 1500 },
  ]
};

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const credits = useCanvasStore(state => state.credits);
  const { user } = useUser();
  const { getToken } = useAuth();

  const handlePayment = async () => {
    if (!selectedPackage || !user) {
      toast.error('Please select a package');
      return;
    }

    const pkg = CREDIT_PACKAGES.topup.find(p => p.id === selectedPackage);
    if (!pkg) {
      toast.error('Package not found');
      return;
    }

    setIsLoading(true);
    try {
      // Get Clerk session token
      const token = await getToken();
      
      // Call the create-credit-checkout edge function with Clerk auth
      const { data, error } = await supabase.functions.invoke('create-credit-checkout', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          packageType: 'topup',
          credits: pkg.credits,
          amount: pkg.price,
        },
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
              selectedPackage && `Pay $${((CREDIT_PACKAGES.topup.find(p => p.id === selectedPackage)?.price || 0) / 100).toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};