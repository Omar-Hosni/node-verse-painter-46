
import React, { useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { CreditCard } from 'lucide-react';

export const CreditsDisplay = () => {
  const credits = useCanvasStore(state => state.credits);
  const fetchUserCredits = useCanvasStore(state => state.fetchUserCredits);

  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  return (
    <div className="flex items-center gap-2 bg-[#1E1E1E] rounded-md px-3 py-1.5 text-sm">
      <CreditCard className="h-4 w-4 text-blue-400" />
      <span className="font-medium">
        {credits !== null ? credits.toLocaleString() : '...'}
      </span>
      <span className="text-gray-400">credits</span>
    </div>
  );
};
