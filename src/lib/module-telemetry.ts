// Live telemetry for the homepage MODULES section.
//
// Each module renders a small "KEY: value" stats block; the data comes from
// the same Supabase project that powers the conflict map and the blog. The
// reads are deliberately tiny (counts + a single timestamp per module) so
// the homepage can stay on a 15-min ISR window without taxing the DB.

import { getServerSupabase, isSupabaseConfigured } from './supabase';
import type {
  BlogTelemetry,
  ConflictTelemetry,
  ModuleTelemetry,
} from '@/types';

export async function getModuleTelemetry(): Promise<ModuleTelemetry> {
  if (!isSupabaseConfigured()) {
    return { conflict: null, blog: null };
  }
  const [conflict, blog] = await Promise.all([readConflict(), readBlog()]);
  return { conflict, blog };
}

async function readConflict(): Promise<ConflictTelemetry | null> {
  try {
    const sb = getServerSupabase();
    const [hotspots, snapshot] = await Promise.all([
      sb
        .from('conflict_hotspots')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      sb
        .from('conflict_snapshots')
        .select('captured_at')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ captured_at: string }>(),
    ]);
    if (hotspots.error) {
      console.error('module-telemetry conflict hotspots:', hotspots.error);
      return null;
    }
    if (snapshot.error) {
      console.error('module-telemetry conflict snapshot:', snapshot.error);
    }
    return {
      active: hotspots.count ?? 0,
      lastIngest: snapshot.data?.captured_at ?? null,
    };
  } catch (err) {
    console.error('module-telemetry conflict:', err);
    return null;
  }
}

async function readBlog(): Promise<BlogTelemetry | null> {
  try {
    const sb = getServerSupabase();
    const nowIso = new Date().toISOString();
    const [count, latest] = await Promise.all([
      sb
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .lte('publish_at', nowIso),
      sb
        .from('blog_posts')
        .select('publish_at')
        .eq('status', 'published')
        .lte('publish_at', nowIso)
        .order('publish_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ publish_at: string }>(),
    ]);
    if (count.error) {
      console.error('module-telemetry blog count:', count.error);
      return null;
    }
    if (latest.error) {
      console.error('module-telemetry blog latest:', latest.error);
    }
    return {
      posts: count.count ?? 0,
      latest: latest.data?.publish_at ?? null,
    };
  } catch (err) {
    console.error('module-telemetry blog:', err);
    return null;
  }
}

/**
 * Coarse "Xh ago / Xd ago" label used in the cards. Anything older than 30
 * days falls back to a yyyy-mm-dd date so the card doesn't claim "63d ago"
 * for content that's effectively static.
 */
export function relativeShort(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days}d ago`;
  return iso.slice(0, 10);
}
