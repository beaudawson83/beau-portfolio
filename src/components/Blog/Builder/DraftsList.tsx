'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPostSummary, BlogPostStatus } from '@/types';
import AuthGate, { clearEditorSecret } from './AuthGate';
import Topbar from '../Topbar';

const STATUS_TINT: Record<BlogPostStatus, string> = {
  draft: 'var(--tn-dim)',
  scheduled: 'var(--tn-warn)',
  published: 'var(--tn-ok)',
};

export default function DraftsList({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <AuthGate>
      {(secret) => (
        <>
          <Topbar
            theme={theme}
            crumb={[
              { text: '~/' },
              { text: 'beaudawson', accent: true },
              { text: 'blog' },
              { text: 'drafts', accent: true, bold: true },
            ]}
          />
          <Listing secret={secret} />
        </>
      )}
    </AuthGate>
  );
}

function Listing({ secret }: { secret: string }) {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/blog/posts', {
          headers: { Authorization: `Bearer ${secret}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          clearEditorSecret();
          router.refresh();
          return;
        }
        if (!res.ok) {
          setError('Failed to load drafts.');
          return;
        }
        const data = await res.json();
        setPosts(data.posts ?? []);
      } catch {
        if (!cancelled) setError('Network error.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [secret, router]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--tn-bg)' }}>
      <header
        style={{
          padding: '56px 48px 32px',
          borderBottom: '1px solid var(--tn-line)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--tn-mono)',
                fontSize: 11,
                color: 'var(--tn-accent)',
                letterSpacing: '.1em',
                marginBottom: 14,
              }}
            >
              $ ls -lh ~/blog/drafts
            </div>
            <h1
              style={{
                fontFamily: 'var(--tn-sans)',
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: '-1.6px',
                lineHeight: 1,
                margin: 0,
                color: 'var(--tn-ink)',
              }}
            >
              Editor
            </h1>
          </div>
          <Link href="/blog/edit/new" className="tn-btn pri" style={{ textDecoration: 'none' }}>
            + new draft
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 48px 80px' }}>
        {error ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              fontFamily: 'var(--tn-mono)',
              color: 'var(--tn-err)',
              fontSize: 13,
            }}
          >
            ! {error}
          </div>
        ) : posts === null ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              fontFamily: 'var(--tn-mono)',
              color: 'var(--tn-dim)',
              fontSize: 13,
            }}
          >
            loading…
          </div>
        ) : posts.length === 0 ? (
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
            <div>no posts yet</div>
            <div style={{ fontSize: 11, color: 'var(--tn-dim2)', marginTop: 8 }}>
              start one with the &ldquo;new draft&rdquo; button above.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/blog/edit/${encodeURIComponent(p.slug)}`}
                style={{
                  display: 'block',
                  padding: 16,
                  background: 'var(--tn-bg2)',
                  border: '1px solid var(--tn-line)',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: '.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--tn-accent-dim)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--tn-line)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--tn-mono)',
                      fontSize: 10,
                      color: STATUS_TINT[p.status],
                      textTransform: 'uppercase',
                      letterSpacing: '.1em',
                    }}
                  >
                    ● {p.status}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--tn-mono)',
                      fontSize: 10,
                      color: 'var(--tn-dim)',
                    }}
                  >
                    {p.updatedAt.slice(0, 10)}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--tn-sans)',
                    fontSize: 16.5,
                    fontWeight: 600,
                    color: 'var(--tn-ink)',
                    letterSpacing: '-.3px',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.title || <span style={{ color: 'var(--tn-dim)' }}>Untitled</span>}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 11,
                    color: 'var(--tn-dim)',
                  }}
                >
                  /blog/{p.slug}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
