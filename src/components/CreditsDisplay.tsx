import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { CreditCard, Plus } from 'lucide-react';
import { PaymentModal } from './PaymentModal';

export const CreditsDisplay = () => {
  const credits = useCanvasStore(state => state.credits);
  const fetchUserCredits = useCanvasStore(state => state.fetchUserCredits);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  return (
    <>
      <div className="flex items-center gap-2 bg-[#1E1E1E] rounded-md px-3 py-1.5 text-sm">
        <CreditCard className="h-4 w-4 text-blue-400" />
        <span className="font-medium">
          {credits !== null ? credits.toLocaleString() : '...'}
        </span>
        <span className="text-gray-400">credits</span>
        <button 
          onClick={() => setIsPaymentModalOpen(true)}
          className="ml-2 p-1 rounded hover:bg-[#333] transition-colors"
          title="Add credits"
        >
          <Plus className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      
      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
      />
    </>
  );
};