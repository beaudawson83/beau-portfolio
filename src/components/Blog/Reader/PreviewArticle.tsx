'use client';

// Auth-gated client wrapper around ArticleView. Lets the editor preview a
// post in any status (draft / scheduled / published) without exposing
// drafts via the public /blog/[slug] route.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@/types';
import AuthGate, { clearEditorSecret } from '../Builder/AuthGate';
import ArticleView from './ArticleView';

export default function PreviewArticle({
  slug,
  theme,
}: {
  slug: string;
  theme: 'dark' | 'light';
}) {
  return (
    <AuthGate>
      {(secret) => <Loader slug={slug} secret={secret} theme={theme} />}
    </AuthGate>
  );
}

function Loader({
  slug,
  secret,
  theme,
}: {
  slug: string;
  secret: string;
  theme: 'dark' | 'light';
}) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          clearEditorSecret();
          router.refresh();
          return;
        }
        if (res.status === 404) {
          setError('Post not found.');
          return;
        }
        if (!res.ok) {
          setError('Failed to load post.');
          return;
        }
        const data = await res.json();
        setPost(data.post);
      } catch {
        if (!cancelled) setError('Network error.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, secret, router]);

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--tn-mono)',
          fontSize: 12,
          color: 'var(--tn-err)',
        }}
      >
        ! {error}
      </div>
    );
  }
  if (!post) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--tn-mono)',
          fontSize: 12,
          color: 'var(--tn-dim)',
        }}
      >
        loading preview…
      </div>
    );
  }
  // Prev/next intentionally null in preview: drafts have no meaningful
  // sibling order yet.
  return <ArticleView post={post} prev={null} next={null} theme={theme} />;
}
