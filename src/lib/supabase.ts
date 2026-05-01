import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Resolve Supabase config in priority order:
//   1. BEAU_SUPABASE_*      — owned by us; Marketplace integration can't touch these
//   2. SUPABASE_URL / *_SECRET_KEY / *_PUBLISHABLE_KEY — Marketplace native
//   3. NEXT_PUBLIC_SUPABASE_URL / *_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — legacy
// All current callers are server-side, so no NEXT_PUBLIC_ prefix is needed.
const supabaseUrl =
  process.env.BEAU_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const supabaseServiceKey =
  process.env.BEAU_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

export function getServerSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy equivalents) are required for server operations');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}
