import { useEffect } from 'react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { setClerkAuthContext } from '@/store/dbUtils';
import { setAuthTokenGetter } from '@/services/authToken';

export const useClerkIntegration = () => {
  const clerkAuth = useClerkAuth();

  useEffect(() => {
    // Bridge Clerk auth to non-React modules
    if (clerkAuth.isLoaded) {
      setClerkAuthContext(clerkAuth);
      if (clerkAuth.getToken) {
        setAuthTokenGetter(clerkAuth.getToken);
      }
    }
  }, [clerkAuth.isLoaded, clerkAuth.userId, clerkAuth.userEmail]);

  return clerkAuth;
};