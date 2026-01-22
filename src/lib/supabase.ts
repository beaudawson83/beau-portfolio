import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  NewsletterSubscriber,
  PostAnalytics,
  AdminWhitelist,
} from '@/types/blog';

// ============================================
// Supabase Client Setup
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (for client-side operations)
// Only create if URL is available (may not be during build)
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server client with service role (for protected operations)
export function getServerSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for server operations');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================
// Newsletter Functions
// ============================================

export async function subscribeToNewsletter(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: 'Database not configured' };
  }
  const serverClient = getServerSupabase();

  // Check if already subscribed
  const { data: existing } = await serverClient
    .from('newsletter_subscribers')
    .select('id, is_active')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    if (existing.is_active) {
      return { success: true }; // Already subscribed
    }
    // Reactivate subscription
    const { error } = await serverClient
      .from('newsletter_subscribers')
      .update({ is_active: true })
      .eq('id', existing.id);

    if (error) {
      return { success: false, error: 'Failed to reactivate subscription' };
    }
    return { success: true };
  }

  // Create new subscription
  const { error } = await serverClient.from('newsletter_subscribers').insert({
    email: email.toLowerCase(),
  });

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return { success: true };
    }
    return { success: false, error: 'Failed to subscribe' };
  }

  return { success: true };
}

export async function unsubscribeFromNewsletter(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: 'Database not configured' };
  }
  const serverClient = getServerSupabase();

  const { error } = await serverClient
    .from('newsletter_subscribers')
    .update({ is_active: false })
    .eq('email', email.toLowerCase());

  if (error) {
    return { success: false, error: 'Failed to unsubscribe' };
  }

  return { success: true };
}

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return [];
  }
  const serverClient = getServerSupabase();

  const { data, error } = await serverClient
    .from('newsletter_subscribers')
    .select('*')
    .eq('is_active', true)
    .order('subscribed_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscribers:', error);
    return [];
  }

  return data || [];
}

// ============================================
// Analytics Functions
// ============================================

export async function trackPostView(
  slug: string,
  visitorHash?: string
): Promise<void> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }
  const serverClient = getServerSupabase();

  // Upsert post analytics
  const { data: existing } = await serverClient
    .from('post_analytics')
    .select('id, view_count')
    .eq('post_slug', slug)
    .single();

  if (existing) {
    await serverClient
      .from('post_analytics')
      .update({
        view_count: existing.view_count + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await serverClient.from('post_analytics').insert({
      post_slug: slug,
      view_count: 1,
    });
  }

  // Track individual view for unique visitor counting (optional)
  if (visitorHash) {
    await serverClient.from('post_views').insert({
      post_slug: slug,
      visitor_hash: visitorHash,
    });
  }
}

export async function getPostAnalytics(slug: string): Promise<PostAnalytics | null> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  const serverClient = getServerSupabase();

  const { data, error } = await serverClient
    .from('post_analytics')
    .select('*')
    .eq('post_slug', slug)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getAllPostAnalytics(): Promise<PostAnalytics[]> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return [];
  }
  const serverClient = getServerSupabase();

  const { data, error } = await serverClient
    .from('post_analytics')
    .select('*')
    .order('view_count', { ascending: false });

  if (error) {
    console.error('Error fetching analytics:', error);
    return [];
  }

  return data || [];
}

// ============================================
// Admin Whitelist Functions
// ============================================

export async function isEmailWhitelisted(email: string): Promise<boolean> {
  // During build time, return false if Supabase isn't configured
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase not configured, whitelist check skipped');
    return false;
  }

  const serverClient = getServerSupabase();

  const { data, error } = await serverClient
    .from('admin_whitelist')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

export async function getWhitelistedEmails(): Promise<AdminWhitelist[]> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return [];
  }
  const serverClient = getServerSupabase();

  const { data, error } = await serverClient
    .from('admin_whitelist')
    .select('*')
    .eq('is_active', true)
    .order('email', { ascending: true });

  if (error) {
    console.error('Error fetching whitelist:', error);
    return [];
  }

  return data || [];
}

export async function addToWhitelist(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: 'Database not configured' };
  }
  const serverClient = getServerSupabase();

  const { error } = await serverClient.from('admin_whitelist').insert({
    email: email.toLowerCase(),
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Email already in whitelist' };
    }
    return { success: false, error: 'Failed to add email' };
  }

  return { success: true };
}

export async function removeFromWhitelist(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: 'Database not configured' };
  }
  const serverClient = getServerSupabase();

  const { error } = await serverClient
    .from('admin_whitelist')
    .update({ is_active: false })
    .eq('email', email.toLowerCase());

  if (error) {
    return { success: false, error: 'Failed to remove email' };
  }

  return { success: true };
}

// ============================================
// Utility Functions
// ============================================

export function generateVisitorHash(ip: string, userAgent: string): string {
  // Simple hash function for visitor identification
  const str = `${ip}:${userAgent}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
