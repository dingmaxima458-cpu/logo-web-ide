/**
 * Authentication Middleware
 * Validates Supabase JWT tokens and extracts user information
 */

import { getSupabase } from '../database/supabase.js';

/**
 * Mock user validation for development
 * Accepts tokens from localStorage-based mock auth
 */
async function validateMockToken(token) {
  // Mock token format: "mock-user-{userId}"
  if (token.startsWith('mock-user-')) {
    const userId = token.replace('mock-user-', '');
    return {
      id: userId,
      email: `${userId}@mock.local`,
      isMock: true
    };
  }
  return null;
}

/**
 * Validate Supabase JWT token
 */
async function validateSupabaseToken(token) {
  try {
    const supabase = getSupabase();
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      ...user
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Authentication middleware
 * Extracts and validates JWT token from Authorization header
 * Adds user object to req.user
 */
export async function authMiddleware(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        data: null,
        error: {
          message: 'Missing or invalid Authorization header',
          code: 'UNAUTHORIZED'
        }
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Try mock auth first (for development)
    let user = await validateMockToken(token);
    
    // If not mock, try Supabase auth
    if (!user) {
      user = await validateSupabaseToken(token);
    }
    
    if (!user) {
      return res.status(401).json({
        data: null,
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        }
      });
    }
    
    // Attach user to request
    req.user = user;
    req.accessToken = token;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      data: null,
      error: {
        message: 'Authentication failed',
        code: 'AUTH_ERROR',
        details: error.message
      }
    });
  }
}

/**
 * Optional auth middleware
 * Tries to extract user but doesn't fail if not present
 */
export async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Try mock auth
      let user = await validateMockToken(token);
      
      // If not mock, try Supabase
      if (!user) {
        user = await validateSupabaseToken(token);
      }
      
      if (user) {
        req.user = user;
        req.accessToken = token;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on error for optional auth
    console.warn('Optional auth failed:', error);
    next();
  }
}

