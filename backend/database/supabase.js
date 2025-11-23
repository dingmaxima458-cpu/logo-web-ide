/**
 * Supabase Database Client
 * Handles database operations with Supabase
 */

import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;
let supabaseAdmin = null;

/**
 * Initialize Supabase clients
 */
export function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  }

  // Client with anon key (for user-context operations)
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  // Admin client with service role key (bypasses RLS for admin operations)
  if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  console.log('✅ Supabase database client initialized');
  return { supabaseClient, supabaseAdmin };
}

/**
 * Get Supabase client (user-context, respects RLS)
 */
export function getSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase not initialized. Call initializeSupabase() first.');
  }
  return supabaseClient;
}

/**
 * Get Supabase admin client (bypasses RLS)
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin not initialized. Set SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  return supabaseAdmin;
}

/**
 * Create a user-scoped Supabase client with auth token
 * This ensures RLS policies are enforced for the specific user
 */
export function getSupabaseForUser(accessToken) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

