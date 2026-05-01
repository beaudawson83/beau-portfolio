'use client';

import { type ReactNode, useEffect, useState } from 'react';

const SECRET_KEY = 'tn-editor-secret';

/** Read the cached editor secret from localStorage. SSR-safe. */
export function readEditorSecret(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SECRET_KEY);
  } catch {
    return null;
  }
}

export function clearEditorSecret() {
  try {
    window.localStorage.removeItem(SECRET_KEY);
  } catch {
    // ignore
  }
}

export function setEditorSecret(secret: string) {
  try {
    window.localStorage.setItem(SECRET_KEY, secret);
  } catch {
    // ignore
  }
}

/**
 * Wraps the builder. Until the user has provided a valid editor secret
 * (verified via /api/blog/admin/auth), shows a password prompt.
 *
 * The render-prop signature gives child components access to the verified
 * secret so they can attach it as a Bearer header on save/load calls.
 */
export default function AuthGate({
  children,
}: {
  children: (secret: string) => ReactNode;
}) {
  const [secret, setSecretState] = useState<string | null>(null);
  const [checked, setChecked] = useState(false); // initial check finished
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: try the cached secret. If it works, render the editor.
  // The setState calls inside the effect are necessary for the SSR→CSR
  // transition (no localStorage on server) — the lint rule's recommended
  // alternatives can't bridge that gap without causing hydration mismatches.
  useEffect(() => {
    const cached = readEditorSecret();
    if (!cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR bridge: no localStorage on server
      setChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const ok = await probe(cached);
      if (cancelled) return;
      if (ok) setSecretState(cached);
      else clearEditorSecret();
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || pending) return;
    setPending(true);
    setError(null);
    const ok = await probe(input);
    setPending(false);
    if (ok) {
      setEditorSecret(input);
      setSecretState(input);
    } else {
      setError('Wrong secret.');
    }
  };

  if (!checked) {
    return <ShellMessage>checking credentials…</ShellMessage>;
  }

  if (secret) return <>{children(secret)}</>;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 380,
          background: 'var(--tn-bg2)',
          border: '1px solid var(--tn-line2)',
          borderRadius: 10,
          padding: 24,
          boxShadow: 'var(--tn-shadow)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--tn-mono)',
            fontSize: 11,
            color: 'var(--tn-accent)',
            letterSpacing: '.1em',
            marginBottom: 16,
          }}
        >
          $ sudo open ./editor
        </div>
        <h2
          style={{
            fontFamily: 'var(--tn-sans)',
            fontSize: 22,
            fontWeight: 700,
            margin: '0 0 8px',
            color: 'var(--tn-ink)',
            letterSpacing: '-0.4px',
          }}
        >
          Editor access
        </h2>
        <p
          style={{
            fontFamily: 'var(--tn-serif)',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--tn-dim)',
            margin: '0 0 18px',
          }}
        >
          Paste the editor secret. Stored in this browser&rsquo;s localStorage so you only enter
          it once per device.
        </p>
        <input
          autoFocus
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="BLOG_EDITOR_SECRET"
          className="tn-focus"
          style={{
            width: '100%',
            background: 'var(--tn-bg)',
            border: '1px solid var(--tn-line2)',
            borderRadius: 6,
            padding: '10px 12px',
            fontFamily: 'var(--tn-mono)',
            fontSize: 13,
            color: 'var(--tn-ink)',
            outline: 'none',
          }}
        />
        {error ? (
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--tn-mono)',
              fontSize: 11,
              color: 'var(--tn-err)',
            }}
          >
            ! {error}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 18,
          }}
        >
          <button
            type="submit"
            className="tn-btn pri"
            disabled={!input || pending}
            style={{ opacity: !input || pending ? 0.6 : 1 }}
          >
            {pending ? 'verifying…' : 'unlock →'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ShellMessage({ children }: { children: ReactNode }) {
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

async function probe(secret: string): Promise<boolean> {
  try {
    const res = await fetch('/api/blog/admin/auth', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
