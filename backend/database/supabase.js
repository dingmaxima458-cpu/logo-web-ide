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

  console.log('[Supabase Init] URL:', supabaseUrl);
  console.log('[Supabase Init] Has anon key:', !!supabaseAnonKey);
  console.log('[Supabase Init] Anon key length:', supabaseAnonKey?.length);
  console.log('[Supabase Init] Has service key:', !!supabaseServiceKey);
  console.log('[Supabase Init] Service key length:', supabaseServiceKey?.length);
  console.log('[Supabase Init] Service key preview:', supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING');
  
  // Verify keys are different
  if (supabaseAnonKey === supabaseServiceKey) {
    console.error('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is the same as ANON_KEY! This will not bypass RLS!');
  }

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
    console.log('✅ Supabase admin client initialized with service role key');
  } else {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - admin operations will fail!');
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
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin not initialized. Set SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  return supabaseAdmin;
}

