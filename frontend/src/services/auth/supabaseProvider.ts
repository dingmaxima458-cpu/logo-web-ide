/**
 * Supabase Auth Provider Implementation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AuthProvider, 
  User, 
  AuthSession, 
  SignUpCredentials, 
  SignInCredentials 
} from './types';

export class SupabaseAuthProvider implements AuthProvider {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async signUp(credentials: SignUpCredentials): Promise<{ user: User; session: AuthSession }> {
    const { data, error } = await this.client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name
        }
      }
    });

    if (error) throw new Error(error.message);
    if (!data.user || !data.session) throw new Error('Sign up failed');

    return {
      user: this.mapUser(data.user),
      session: this.mapSession(data.session, data.user)
    };
  }

  async signIn(credentials: SignInCredentials): Promise<{ user: User; session: AuthSession }> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) throw new Error(error.message);
    if (!data.user || !data.session) throw new Error('Sign in failed');

    return {
      user: this.mapUser(data.user),
      session: this.mapSession(data.session, data.user)
    };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session) return null;

    return this.mapSession(data.session, data.session.user);
  }

  async refreshSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.refreshSession();
    if (error) throw new Error(error.message);
    if (!data.session) return null;

    return this.mapSession(data.session, data.session.user);
  }

  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user) return null;

    return this.mapUser(data.user);
  }

  async updateUser(updates: Partial<User>): Promise<User> {
    const { data, error } = await this.client.auth.updateUser({
      data: {
        name: updates.name,
        avatar_url: updates.avatarUrl
      }
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Update failed');

    return this.mapUser(data.user);
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      if (session) {
        callback(this.mapSession(session, session.user));
      } else {
        callback(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  private mapUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name,
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      createdAt: supabaseUser.created_at
    };
  }

  private mapSession(supabaseSession: any, supabaseUser: any): AuthSession {
    return {
      user: this.mapUser(supabaseUser),
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt: supabaseSession.expires_at
    };
  }
}

