// Centralized auth token provider for places where React hooks cannot be used
// Provides a setter that UI/hooks can call to register a token getter
// and a getter that services can call to retrieve the latest token

let tokenGetter: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  tokenGetter = getter;
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    if (!tokenGetter) return null;
    return await tokenGetter();
  } catch (e) {
    return null;
  }
};
