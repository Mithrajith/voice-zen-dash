import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, createAuthContext, AuthContext } from '../services/auth';
import { useToast } from '../hooks/use-toast';

interface AppAuthContextType extends AuthContext {
  isInitialized: boolean;
  error: string | null;
}

const AppAuthContext = createContext<AppAuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Create auth context
  const authContext = React.useMemo(() => createAuthContext(), []);

  // Track auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubscribe = authContext.subscribe((user) => {
      setCurrentUser(user);
      setIsLoading(authContext.isLoading());
    });

    return () => {
      unsubscribe();
    };
  }, [authContext]);

  // Initialize auth on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setError(null);
        await authContext.initialize();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication initialization failed';
        setError(message);
        console.error('Auth initialization error:', err);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [authContext]);

  // Enhanced login with error handling
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      setError(null);
      const user = await authContext.login(credentials);
      toast({
        title: 'Welcome back!',
        description: `Signed in as ${user.name}`,
      });
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: message,
      });
      throw err;
    }
  }, [authContext, toast]);

  // Enhanced register with error handling
  const register = useCallback(async (data: { name: string; email: string; password: string }) => {
    try {
      setError(null);
      const user = await authContext.register(data);
      toast({
        title: 'Account created!',
        description: `Welcome, ${user.name}!`,
      });
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: message,
      });
      throw err;
    }
  }, [authContext, toast]);

  // Enhanced logout
  const logout = useCallback(() => {
    authContext.logout();
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    });
  }, [authContext, toast]);

  // Enhanced preferences update
  const updatePreferences = useCallback(async (preferences: Partial<User['preferences']>) => {
    try {
      setError(null);
      const updatedPreferences = await authContext.updatePreferences(preferences);
      toast({
        title: 'Preferences updated',
        description: 'Your preferences have been saved.',
      });
      return updatedPreferences;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: message,
      });
      throw err;
    }
  }, [authContext, toast]);

  const contextValue: AppAuthContextType = {
    getCurrentUser: () => currentUser,
    isLoading: () => isLoading,
    subscribe: authContext.subscribe,
    initialize: authContext.initialize,
    login,
    register,
    logout,
    updatePreferences,
    isInitialized,
    error
  };

  return (
    <AppAuthContext.Provider value={contextValue}>
      {children}
    </AppAuthContext.Provider>
  );
};

export const useAuth = (): AppAuthContextType => {
  const context = useContext(AppAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Custom hook for checking if user is authenticated
export const useIsAuthenticated = (): boolean => {
  const { getCurrentUser } = useAuth();
  return getCurrentUser() !== null;
};

// Custom hook for requiring authentication
export const useRequireAuth = (): User => {
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
};

// Custom hook for protected routes
export const useAuthGuard = () => {
  const { getCurrentUser, isInitialized } = useAuth();
  
  return {
    isAuthenticated: getCurrentUser() !== null,
    isInitialized,
    user: getCurrentUser()
  };
};