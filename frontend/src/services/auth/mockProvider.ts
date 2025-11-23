/**
 * Mock Auth Provider - For local development without backend
 */

import { 
  AuthProvider, 
  User, 
  AuthSession, 
  SignUpCredentials, 
  SignInCredentials 
} from './types';

export class MockAuthProvider implements AuthProvider {
  private currentSession: AuthSession | null = null;
  private users: Map<string, { user: User; password: string }> = new Map();
  private listeners: ((session: AuthSession | null) => void)[] = [];

  constructor() {
    // Load from localStorage
    const savedSession = localStorage.getItem('mock_auth_session');
    if (savedSession) {
      this.currentSession = JSON.parse(savedSession);
    }

    const savedUsers = localStorage.getItem('mock_auth_users');
    if (savedUsers) {
      const usersArray = JSON.parse(savedUsers);
      this.users = new Map(usersArray);
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<{ user: User; session: AuthSession }> {
    // Check if user exists
    if (this.users.has(credentials.email)) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: credentials.email,
      name: credentials.name || credentials.email.split('@')[0],
      createdAt: new Date().toISOString()
    };

    const session: AuthSession = {
      user,
      accessToken: `mock_token_${user.id}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    this.users.set(credentials.email, { user, password: credentials.password });
    this.currentSession = session;

    this.saveToStorage();
    this.notifyListeners(session);

    return { user, session };
  }

  async signIn(credentials: SignInCredentials): Promise<{ user: User; session: AuthSession }> {
    const userData = this.users.get(credentials.email);
    
    if (!userData || userData.password !== credentials.password) {
      throw new Error('Invalid email or password');
    }

    const session: AuthSession = {
      user: userData.user,
      accessToken: `mock_token_${userData.user.id}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    this.currentSession = session;
    this.saveToStorage();
    this.notifyListeners(session);

    return { user: userData.user, session };
  }

  async signOut(): Promise<void> {
    this.currentSession = null;
    localStorage.removeItem('mock_auth_session');
    this.notifyListeners(null);
  }

  async getSession(): Promise<AuthSession | null> {
    return this.currentSession;
  }

  async refreshSession(): Promise<AuthSession | null> {
    if (!this.currentSession) return null;

    const newSession: AuthSession = {
      ...this.currentSession,
      accessToken: `mock_token_${this.currentSession.user.id}_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };

    this.currentSession = newSession;
    this.saveToStorage();

    return newSession;
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentSession?.user || null;
  }

  async updateUser(updates: Partial<User>): Promise<User> {
    if (!this.currentSession) {
      throw new Error('Not authenticated');
    }

    const updatedUser = {
      ...this.currentSession.user,
      ...updates
    };

    this.currentSession = {
      ...this.currentSession,
      user: updatedUser
    };

    // Update in users map
    const userData = this.users.get(updatedUser.email);
    if (userData) {
      this.users.set(updatedUser.email, { ...userData, user: updatedUser });
    }

    this.saveToStorage();
    return updatedUser;
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current session
    callback(this.currentSession);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private saveToStorage(): void {
    if (this.currentSession) {
      localStorage.setItem('mock_auth_session', JSON.stringify(this.currentSession));
    }
    
    const usersArray = Array.from(this.users.entries());
    localStorage.setItem('mock_auth_users', JSON.stringify(usersArray));
  }

  private notifyListeners(session: AuthSession | null): void {
    this.listeners.forEach(listener => listener(session));
  }
}

