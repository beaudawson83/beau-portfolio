'use client';

// Client wrapper for /blog/edit/[slug]:
// 1. Auth-gates via the editor secret
// 2. Loads the post (any status) with Bearer
// 3. Renders the Editor

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@/types';
import AuthGate, { clearEditorSecret } from './AuthGate';
import Editor from './Editor';

export default function EditorPage({
  slug,
  theme,
}: {
  slug: string;
  theme: 'dark' | 'light';
}) {
  return <AuthGate>{(secret) => <Loader slug={slug} secret={secret} theme={theme} />}</AuthGate>;
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

  if (error) return <Center>! {error}</Center>;
  if (!post) return <Center>loading post…</Center>;
  return <Editor post={post} secret={secret} theme={theme} />;
}

function Center({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}
