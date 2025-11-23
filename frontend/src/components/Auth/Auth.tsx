/**
 * Auth Component - Login and Sign Up UI
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Auth: React.FC = () => {
  const { signIn, signUp, error, loading, clearError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    // Validation
    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters');
        return;
      }
    }

    try {
      if (isSignUp) {
        await signUp({ email, password, name: name || undefined });
      } else {
        await signIn({ email, password });
      }
    } catch (err) {
      // Error is handled by context
      console.error('Auth error:', err);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setLocalError('');
    clearError();
  };

  const displayError = localError || error;

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">🐢</div>
          <h1>Logo Web IDE</h1>
          <p>{isSignUp ? 'Create your account' : 'Sign in to continue'}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-field">
              <label htmlFor="name">Name (optional)</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {isSignUp && (
            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          {displayError && (
            <div className="auth-error">
              {displayError}
            </div>
          )}

          <button type="submit" className="auth-submit-button" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>{isSignUp ? 'Sign Up' : 'Sign In'}</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button onClick={toggleMode} disabled={loading}>
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button onClick={toggleMode} disabled={loading}>
                Sign up
              </button>
            </p>
          )}
        </div>

        <div className="auth-provider-info">
          <small>
            Using: <strong>{import.meta.env.VITE_AUTH_PROVIDER || 'mock'}</strong> auth provider
          </small>
        </div>
      </div>
    </div>
  );
};

export default Auth;

