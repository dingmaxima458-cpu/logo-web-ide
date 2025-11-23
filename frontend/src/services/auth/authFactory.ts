/**
 * Auth Factory - Creates auth provider based on configuration
 */

import { AuthProvider, AuthProviderType } from './types';
import { SupabaseAuthProvider } from './supabaseProvider';
import { MockAuthProvider } from './mockProvider';

export function createAuthProvider(): AuthProvider {
  const providerType = (import.meta.env.VITE_AUTH_PROVIDER || 'mock') as AuthProviderType;

  switch (providerType) {
    case AuthProviderType.SUPABASE: {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials not found, falling back to mock provider');
        return new MockAuthProvider();
      }

      return new SupabaseAuthProvider(supabaseUrl, supabaseKey);
    }

    case AuthProviderType.MOCK:
    case AuthProviderType.LOCAL:
    default:
      return new MockAuthProvider();
  }
}

// Singleton instance
let authProviderInstance: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (!authProviderInstance) {
    authProviderInstance = createAuthProvider();
  }
  return authProviderInstance;
}

