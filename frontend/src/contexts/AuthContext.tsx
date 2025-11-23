/**
 * Auth Context - Manages authentication state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthProvider } from '../services/auth/authFactory';
import { User, AuthSession, SignUpCredentials, SignInCredentials } from '../services/auth/types';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authProvider = getAuthProvider();

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentSession = await authProvider.getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
        }
      } catch (err: any) {
        console.error('Failed to initialize auth:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const unsubscribe = authProvider.onAuthStateChange((newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user || null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [authProvider]);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      setError(null);
      setLoading(true);
      const { user: newUser, session: newSession } = await authProvider.signUp(credentials);
      setUser(newUser);
      setSession(newSession);
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authProvider]);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    try {
      setError(null);
      setLoading(true);
      const { user: newUser, session: newSession } = await authProvider.signIn(credentials);
      setUser(newUser);
      setSession(newSession);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authProvider]);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await authProvider.signOut();
      setUser(null);
      setSession(null);
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
      throw err;
    }
  }, [authProvider]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    try {
      setError(null);
      const updatedUser = await authProvider.updateUser(updates);
      setUser(updatedUser);
    } catch (err: any) {
      setError(err.message || 'Update failed');
      throw err;
    }
  }, [authProvider]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateUser,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

