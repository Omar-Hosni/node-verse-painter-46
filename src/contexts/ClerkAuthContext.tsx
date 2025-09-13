import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';

interface ClerkAuthContextType {
  user: any;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  getToken: () => Promise<string | null>;
}

const ClerkAuthContext = createContext<ClerkAuthContextType | null>(null);

export const ClerkAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const [authState, setAuthState] = useState<ClerkAuthContextType>({
    user: null,
    isLoaded: false,
    isSignedIn: false,
    userId: null,
    userEmail: null,
    getToken: async () => null,
  });

  useEffect(() => {
    setAuthState({
      user,
      isLoaded,
      isSignedIn: !!isSignedIn,
      userId: user?.id || null,
      userEmail: user?.emailAddresses?.[0]?.emailAddress || null,
      getToken: async () => {
        try {
          return await getToken();
        } catch (error) {
          console.error('Error getting Clerk token:', error);
          return null;
        }
      },
    });
  }, [user, isLoaded, isSignedIn, getToken]);

  return (
    <ClerkAuthContext.Provider value={authState}>
      {children}
    </ClerkAuthContext.Provider>
  );
};

export const useClerkAuth = () => {
  const context = useContext(ClerkAuthContext);
  if (!context) {
    throw new Error('useClerkAuth must be used within a ClerkAuthProvider');
  }
  return context;
};