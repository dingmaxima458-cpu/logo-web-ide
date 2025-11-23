/**
 * Auth Types - Backend-agnostic authentication interfaces
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthProvider {
  // Authentication
  signUp(credentials: SignUpCredentials): Promise<{ user: User; session: AuthSession }>;
  signIn(credentials: SignInCredentials): Promise<{ user: User; session: AuthSession }>;
  signOut(): Promise<void>;
  
  // Session management
  getSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
  
  // User management
  getCurrentUser(): Promise<User | null>;
  updateUser(updates: Partial<User>): Promise<User>;
  
  // Auth state listener
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}

export enum AuthProviderType {
  SUPABASE = 'supabase',
  MOCK = 'mock',
  LOCAL = 'local'
}

