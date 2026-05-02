'use client';

import { useEffect, useRef, useState } from 'react';
import { normalizeCategory } from '@/lib/blog-utils';
import { readEditorSecret } from './AuthGate';

/**
 * Category picker for the editor sidebar.
 *
 * Click → dropdown of: existing categories (from /api/blog/categories?admin)
 * + 'none' + '+ new category…'. The "+ new" option opens an inline input;
 * pressing Enter normalizes (uppercase, trim, ≤32 chars) and commits.
 *
 * The dropdown reads the editor secret from localStorage to pull the admin
 * scope (drafts + published) so a category typed-in just now appears the
 * next time the dropdown opens, even before the post is published.
 */
export default function CategoryDropdown({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load categories once when the dropdown first opens.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      const secret = readEditorSecret();
      const res = await fetch('/api/blog/categories', {
        headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
      }).catch(() => null);
      if (cancelled || !res || !res.ok) {
        setLoaded(true);
        return;
      }
      const data = await res.json().catch(() => ({ categories: [] }));
      if (cancelled) return;
      const list = Array.isArray(data.categories) ? (data.categories as string[]) : [];
      setCategories(list);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setDraft('');
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  // Focus the inline input when "adding" toggles on.
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commitNew = () => {
    const next = normalizeCategory(draft);
    if (!next) {
      setAdding(false);
      setDraft('');
      return;
    }
    // Optimistically add to the local list so the dropdown reflects it
    // immediately; the server will see this category once the post saves.
    setCategories((prev) => (prev.includes(next) ? prev : [...prev, next].sort()));
    onChange(next);
    setAdding(false);
    setDraft('');
    setOpen(false);
  };

  const pick = (cat: string | null) => {
    onChange(cat);
    setOpen(false);
    setAdding(false);
    setDraft('');
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'var(--tn-bg)',
          border: '1px solid var(--tn-line2)',
          borderRadius: 5,
          padding: '7px 10px',
          fontFamily: 'var(--tn-mono)',
          fontSize: 12,
          color: value ? 'var(--tn-accent)' : 'var(--tn-dim)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'none'}
        </span>
        <span style={{ color: 'var(--tn-dim2)', fontSize: 10 }}>{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div
          className="tn-fade"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'var(--tn-bg3)',
            border: '1px solid var(--tn-line2)',
            borderRadius: 6,
            padding: 4,
            boxShadow: 'var(--tn-shadow)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          <Row
            label="none"
            active={value === null}
            muted
            onClick={() => pick(null)}
          />
          {!loaded ? (
            <div
              style={{
                padding: '6px 10px',
                fontFamily: 'var(--tn-mono)',
                fontSize: 11,
                color: 'var(--tn-dim2)',
              }}
            >
              loading…
            </div>
          ) : (
            categories.map((c) => (
              <Row key={c} label={c} active={value === c} onClick={() => pick(c)} />
            ))
          )}
          <div
            style={{
              borderTop: '1px solid var(--tn-line)',
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            {adding ? (
              <div style={{ display: 'flex', gap: 4, padding: '2px' }}>
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitNew();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setAdding(false);
                      setDraft('');
                    }
                  }}
                  placeholder="new category…"
                  className="tn-focus"
                  style={{
                    flex: 1,
                    background: 'var(--tn-bg)',
                    border: '1px solid var(--tn-line2)',
                    borderRadius: 4,
                    padding: '5px 8px',
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 11,
                    color: 'var(--tn-ink)',
                    outline: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}
                />
                <button
                  type="button"
                  onClick={commitNew}
                  style={{
                    background: 'var(--tn-accent)',
                    color: '#fff',
                    border: 0,
                    borderRadius: 4,
                    padding: '0 10px',
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  ↵
                </button>
              </div>
            ) : (
              <Row
                label="+ new category"
                active={false}
                muted
                onClick={() => setAdding(true)}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  active,
  muted,
  onClick,
}: {
  label: string;
  active: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        borderRadius: 4,
        border: 0,
        background: active ? 'var(--tn-accent-glow)' : 'transparent',
        color: active ? 'var(--tn-accent)' : muted ? 'var(--tn-dim)' : 'var(--tn-ink)',
        fontFamily: 'var(--tn-mono)',
        fontSize: 11.5,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--tn-bg2)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}
