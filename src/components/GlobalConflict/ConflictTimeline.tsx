'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConflictHotspot, ConflictNewsItem } from '@/lib/conflict-data';
import NewsFeed from './NewsFeed';

const NEWS_FILTERS = ['all', 'reuters', 'ap', 'bbc', 'ocha'] as const;
type NewsFilter = (typeof NEWS_FILTERS)[number];

interface ConflictTimelineProps {
  initialNews: ConflictNewsItem[];
  selectedHotspot: ConflictHotspot | null;
  onClearSelection: () => void;
}

interface TimelineRow {
  source: string;
  headline: string;
  url: string;
  region: string | null;
  publishedAt: string | null;
  ingestedAt: string;
}

interface TimelineApiResponse {
  items?: TimelineRow[];
  nextBefore?: string | null;
}

const PAGE_SIZE = 25;

function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function rowToItem(r: TimelineRow, idx: number): ConflictNewsItem {
  return {
    id: idx + 1,
    source: r.source,
    headline: r.headline,
    url: r.url,
    region: r.region ?? '',
    time: relativeTime(r.publishedAt ?? r.ingestedAt),
  };
}

export default function ConflictTimeline({
  initialNews,
  selectedHotspot,
  onClearSelection,
}: ConflictTimelineProps) {
  const [filter, setFilter] = useState<NewsFilter>('all');
  const [items, setItems] = useState<ConflictNewsItem[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const isFiltered = !!selectedHotspot;

  const loadPage = useCallback(
    async (conflictId: string, before: string | null, append: boolean) => {
      const myReq = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          conflict: conflictId,
          limit: String(PAGE_SIZE),
        });
        if (before) params.set('before', before);
        const r = await fetch(`/api/global-conflict/news?${params.toString()}`);
        if (myReq !== reqId.current) return;
        if (!r.ok) {
          setError('Failed to load timeline');
          return;
        }
        const json = (await r.json()) as TimelineApiResponse;
        const rows = Array.isArray(json.items) ? json.items : [];
        const startIndex = append ? items.length : 0;
        const mapped = rows.map((row, i) => rowToItem(row, startIndex + i));
        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
        setNextBefore(json.nextBefore ?? null);
      } catch {
        if (myReq === reqId.current) setError('Failed to load timeline');
      } finally {
        if (myReq === reqId.current) setLoading(false);
      }
    },
    [items.length],
  );

  // When the selected hotspot changes, reset and load the first page.
  useEffect(() => {
    if (!selectedHotspot) {
      setItems([]);
      setNextBefore(null);
      setError(null);
      return;
    }
    void loadPage(selectedHotspot.id, null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotspot]);

  const sourceFiltered = useMemo(() => {
    const list = isFiltered ? items : initialNews;
    if (filter === 'all') return list;
    return list.filter((n) => n.source.toLowerCase().includes(filter));
  }, [filter, isFiltered, items, initialNews]);

  const handleLoadOlder = () => {
    if (!selectedHotspot || !nextBefore || loading) return;
    void loadPage(selectedHotspot.id, nextBefore, true);
  };

  const headerKicker = isFiltered ? 'Timeline · full archive' : 'Wire · last 24 hours';
  const headerTitle = isFiltered
    ? selectedHotspot?.name ?? 'Conflict timeline'
    : 'Breaking from the field';

  const showEmptyState = !loading && sourceFiltered.length === 0;

  return (
    <section className="gc-news-section">
      <div className="gc-news-header">
        <div>
          <div className="gc-section-kicker">{headerKicker}</div>
          <h2 className="gc-news-title">{headerTitle}</h2>
        </div>
        <div className="gc-news-controls">
          {isFiltered && (
            <button type="button" className="gc-clear-filter" onClick={onClearSelection}>
              ✕ clear filter · show global feed
            </button>
          )}
          <div className="gc-news-filters">
            {NEWS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="gc-filter-btn"
                data-active={filter === f ? 'true' : undefined}
                type="button"
              >
                {f === 'all' ? 'All sources' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && items.length === 0 && isFiltered ? (
        <div className="gc-loading-row">Loading timeline…</div>
      ) : error ? (
        <div className="gc-loading-row" data-error="true">{error}</div>
      ) : showEmptyState ? (
        <div className="gc-loading-row">
          {isFiltered
            ? 'No stories archived for this conflict yet — the journal cron will populate this on its next run.'
            : 'No stories in the last 24 hours.'}
        </div>
      ) : (
        <NewsFeed items={sourceFiltered} density="comfortable" />
      )}

      <div className="gc-news-footer">
        <span>
          {isFiltered
            ? 'Per-conflict timeline · sourced via automated agent · deduped by URL'
            : 'Headlines aggregated from public sources · agent-curated for relevance'}
        </span>
        <span>
          {sourceFiltered.length} {isFiltered ? 'archived' : 'recent'} item
          {sourceFiltered.length === 1 ? '' : 's'}
          {isFiltered && nextBefore ? (
            <>
              {' · '}
              <button
                type="button"
                onClick={handleLoadOlder}
                className="gc-load-older"
                disabled={loading}
              >
                {loading ? 'loading…' : 'load older'}
              </button>
            </>
          ) : null}
        </span>
      </div>
    </section>
  );
}
