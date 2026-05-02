'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate, { clearEditorSecret } from './AuthGate';
import Topbar from '../Topbar';
import { newPlaceholderSlug } from '@/lib/blog-utils';

export default function NewPostFlow({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <AuthGate>
      {(secret) => (
        <>
          <Topbar
            theme={theme}
            crumb={[
              { text: '~/', href: '/' },
              { text: 'beaudawson', accent: true, href: '/' },
              { text: 'blog', href: '/blog' },
              { text: 'drafts', accent: true, href: '/blog/edit' },
              { text: 'new', bold: true },
            ]}
          />
          <Creator secret={secret} />
        </>
      )}
    </AuthGate>
  );
}

function Creator({ secret }: { secret: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      const slug = newPlaceholderSlug();
      try {
        const res = await fetch('/api/blog/posts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slug }),
        });
        if (res.status === 401) {
          clearEditorSecret();
          router.refresh();
          return;
        }
        if (!res.ok) {
          setError('Failed to create post.');
          return;
        }
        const data = await res.json();
        const newSlug = data.post?.slug ?? slug;
        router.replace(`/blog/edit/${encodeURIComponent(newSlug)}`);
      } catch {
        setError('Network error.');
      }
    })();
  }, [secret, router]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--tn-mono)',
        fontSize: 12,
        color: error ? 'var(--tn-err)' : 'var(--tn-dim)',
      }}
    >
      {error ? `! ${error}` : 'creating new draft…'}
    </div>
  );
}
