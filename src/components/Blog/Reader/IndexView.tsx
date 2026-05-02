'use client';

import Link from 'next/link';
import { type CSSProperties, useMemo, useState } from 'react';
import type { BlogCategory, BlogPostSummary } from '@/types';
import { categoryColorIndex } from '@/lib/blog-utils';
import Topbar from '../Topbar';

// Stable colors for the four legacy seeds keep their look across the
// existing index; everything else falls back to the hash palette below.
const LEGACY_CATEGORY_COLOR: Record<string, string> = {
  OPS: 'var(--tn-accent)',
  AI: 'var(--tn-ok)',
  CRAFT: 'var(--tn-warn)',
  NOTE: 'var(--tn-dim)',
};

const HASH_PALETTE = [
  'var(--tn-accent)',
  'var(--tn-ok)',
  'var(--tn-warn)',
  'var(--tn-err)',
  'var(--tn-dim)',
];

function categoryColor(category: string): string {
  return (
    LEGACY_CATEGORY_COLOR[category] ??
    HASH_PALETTE[categoryColorIndex(category, HASH_PALETTE.length)]
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  // YYYY-MM-DD slice; matches the design's mono date column.
  return iso.slice(0, 10);
}

function postNum(index: number, total: number): string {
  // Stable per-post number: oldest = 0001, newest = total. We render the list
  // newest-first, so num = total - index.
  return String(total - index).padStart(4, '0');
}

export default function IndexView({
  posts,
  theme,
}: {
  posts: BlogPostSummary[];
  theme: 'dark' | 'light';
}) {
  const [filter, setFilter] = useState<'all' | BlogCategory>('all');
  const [query, setQuery] = useState('');

  // Filter chips reflect what categories are actually used by the visible
  // (published) posts — empty buckets shouldn't appear.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.category) set.add(p.category);
    return ['all' as const, ...Array.from(set).sort()];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return posts.filter(
      (p) =>
        (filter === 'all' || p.category === filter) &&
        (q === '' || p.title.toLowerCase().includes(q)),
    );
  }, [posts, filter, query]);

  return (
    <>
      <Topbar
        theme={theme}
        crumb={[
          { text: '~/', href: '/' },
          { text: 'beaudawson', accent: true, href: '/' },
          { text: 'blog', bold: true },
        ]}
      />

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--tn-bg)' }}>
        <header
          style={{
            padding: '56px 48px 32px',
            borderBottom: '1px solid var(--tn-line)',
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h1
              style={{
                fontFamily: 'var(--tn-sans)',
                fontSize: 64,
                fontWeight: 800,
                letterSpacing: '-2.4px',
                lineHeight: 0.98,
                margin: '0 0 14px',
                color: 'var(--tn-ink)',
              }}
            >
              Field notes from the chaos.
            </h1>
            <p
              style={{
                fontFamily: 'var(--tn-serif)',
                fontSize: 19,
                color: 'var(--tn-dim)',
                maxWidth: 640,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Twenty years in the field, operating and building. Now it&rsquo;s AI, and I&rsquo;m talking through all of it.
            </p>
          </div>
        </header>

        {/* Filter row */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--tn-bg)',
            borderBottom: '1px solid var(--tn-line)',
            padding: '12px 48px',
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  style={{
                    padding: '5px 11px',
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 11,
                    background: filter === c ? 'var(--tn-accent-glow)' : 'transparent',
                    color: filter === c ? 'var(--tn-accent)' : 'var(--tn-dim)',
                    border: `1px solid ${filter === c ? 'var(--tn-accent-dim)' : 'var(--tn-line)'}`,
                    borderRadius: 5,
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="grep title…"
                className="tn-focus"
                style={{
                  background: 'var(--tn-bg2)',
                  border: '1px solid var(--tn-line)',
                  padding: '6px 10px 6px 28px',
                  borderRadius: 5,
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 12,
                  color: 'var(--tn-ink)',
                  width: 220,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 9,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tn-dim)',
                  fontSize: 12,
                  fontFamily: 'var(--tn-mono)',
                }}
              >
                $
              </span>
            </div>
            <span
              style={{ fontFamily: 'var(--tn-mono)', fontSize: 11, color: 'var(--tn-dim)' }}
            >
              {filtered.length} entries
            </span>
          </div>
        </div>

        {/* List */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px 80px' }}>
          {posts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 96px 80px 1fr 80px 60px',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--tn-line)',
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 10,
                  color: 'var(--tn-dim2)',
                  textTransform: 'uppercase',
                  letterSpacing: '.12em',
                }}
              >
                <span>num</span>
                <span>date</span>
                <span>cat</span>
                <span>title</span>
                <span style={{ textAlign: 'right' }}>words</span>
                <span style={{ textAlign: 'right' }}>min</span>
              </div>
              {filtered.map((p) => {
                const total = posts.length;
                const idxInAll = posts.findIndex((x) => x.id === p.id);
                const num = postNum(idxInAll, total);
                return (
                  <PostRow
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    num={num}
                    date={formatDate(p.publishAt)}
                    category={p.category}
                    title={p.title}
                    wordCount={p.wordCount}
                    readTime={p.readTime}
                  />
                );
              })}
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: '60px 0',
                    textAlign: 'center',
                    fontFamily: 'var(--tn-mono)',
                    color: 'var(--tn-dim)',
                    fontSize: 13,
                  }}
                >
                  no results — try another query
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PostRow({
  href,
  num,
  date,
  category,
  title,
  wordCount,
  readTime,
}: {
  href: string;
  num: string;
  date: string;
  category: BlogCategory | null;
  title: string;
  wordCount: number;
  readTime: number;
}) {
  const [hover, setHover] = useState(false);
  const cellMono: CSSProperties = {
    fontFamily: 'var(--tn-mono)',
    fontSize: 12,
    color: 'var(--tn-dim)',
  };
  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 96px 80px 1fr 80px 60px',
        padding: '16px 0',
        borderBottom: '1px solid var(--tn-line)',
        textDecoration: 'none',
        alignItems: 'center',
        transition: '.15s',
        background: hover ? 'var(--tn-bg2)' : 'transparent',
      }}
    >
      <span style={{ ...cellMono, color: 'var(--tn-dim2)' }}>{num}</span>
      <span style={cellMono}>{date}</span>
      <span>
        {category ? (
          <span
            style={{
              fontFamily: 'var(--tn-mono)',
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 3,
              background: 'var(--tn-bg2)',
              border: '1px solid var(--tn-line2)',
              color: categoryColor(category),
              letterSpacing: '.08em',
            }}
          >
            {category}
          </span>
        ) : null}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontFamily: 'var(--tn-sans)',
            fontSize: 16.5,
            fontWeight: 600,
            color: 'var(--tn-ink)',
            letterSpacing: '-.3px',
          }}
        >
          {title}
        </span>
      </span>
      <span style={{ ...cellMono, textAlign: 'right' }}>
        {wordCount.toLocaleString()}
      </span>
      <span style={{ ...cellMono, textAlign: 'right' }}>{readTime}</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '80px 0',
        textAlign: 'center',
        fontFamily: 'var(--tn-mono)',
        color: 'var(--tn-dim)',
        fontSize: 13,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 14 }}>∅</div>
      <div style={{ marginBottom: 8 }}>no entries yet</div>
      <div style={{ fontSize: 11, color: 'var(--tn-dim2)' }}>
        the journal is empty. check back when the first post lands.
      </div>
    </div>
  );
}
