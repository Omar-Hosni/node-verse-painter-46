import { useEffect } from 'react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { setClerkAuthContext } from '@/store/dbUtils';

export const useClerkIntegration = () => {
  const clerkAuth = useClerkAuth();

  useEffect(() => {
    // Set the Clerk auth context for the dbUtils module
    if (clerkAuth.isLoaded) {
      setClerkAuthContext(clerkAuth);
    }
  }, [clerkAuth.isLoaded, clerkAuth.userId, clerkAuth.userEmail]);

  return clerkAuth;
};