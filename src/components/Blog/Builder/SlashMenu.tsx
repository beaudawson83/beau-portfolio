'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BlogBlockType } from '@/types';
import { BLOCK_KINDS, type BlockKind } from './blockKinds';

export default function SlashMenu({
  anchorBlockId,
  query = '',
  replace = false,
  containerId,
  onPick,
  onClose,
}: {
  anchorBlockId: string;
  query?: string;
  replace?: boolean;
  containerId: string;
  onPick: (type: BlogBlockType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase();
    return BLOCK_KINDS.filter(
      (b) => !q || b.label.toLowerCase().includes(q) || b.type.includes(q),
    );
  }, [query]);

  // Reset highlight to top when the query changes (render-phase, not effect).
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setIdx(0);
  }

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[idx]) onPick(filtered[idx].type);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, idx, onPick, onClose]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  // Group by category
  const groups: Record<string, BlockKind[]> = { text: [], media: [], rich: [] };
  filtered.forEach((b) => groups[b.cat].push(b));

  // Position the menu under the anchor block
  const blockEl = typeof document !== 'undefined' ? document.getElementById('block-' + anchorBlockId) : null;
  const containerEl = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
  const blockRect = blockEl?.getBoundingClientRect();
  const containerRect = containerEl?.getBoundingClientRect();
  const x = (blockRect?.left ?? 100) - (containerRect?.left ?? 0) + 10;
  const y = (blockRect?.bottom ?? 100) - (containerRect?.top ?? 0) + 6 + (containerEl?.scrollTop ?? 0);

  return (
    <div
      ref={ref}
      className="tn-fade"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 320,
        background: 'var(--tn-bg3)',
        border: '1px solid var(--tn-line2)',
        borderRadius: 8,
        padding: 6,
        boxShadow: 'var(--tn-shadow)',
        zIndex: 40,
        maxHeight: 380,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: '6px 10px',
          fontFamily: 'var(--tn-mono)',
          fontSize: 11,
          color: 'var(--tn-dim)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          {replace ? 'replace block' : 'insert block'} · {query ? `"${query}"` : 'type to filter'}
        </span>
        <span>{filtered.length}</span>
      </div>
      {Object.entries(groups).map(([cat, items]) =>
        items.length === 0 ? null : (
          <div key={cat}>
            <div
              style={{
                padding: '4px 10px',
                fontFamily: 'var(--tn-mono)',
                fontSize: 10,
                color: 'var(--tn-dim2)',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
              }}
            >
              {cat}
            </div>
            {items.map((it) => {
              const i = filtered.indexOf(it);
              const active = i === idx;
              return (
                <button
                  key={it.type}
                  type="button"
                  onClick={() => onPick(it.type)}
                  onMouseEnter={() => setIdx(i)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 10px',
                    borderRadius: 5,
                    border: 0,
                    background: active ? 'var(--tn-accent-glow)' : 'transparent',
                    color: 'var(--tn-ink)',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      background: 'var(--tn-bg2)',
                      border: '1px solid var(--tn-line2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--tn-mono)',
                      fontSize: 12,
                      color: active ? 'var(--tn-accent)' : 'var(--tn-dim)',
                    }}
                  >
                    {it.icon}
                  </span>
                  <span style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: 'var(--tn-sans)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--tn-ink)',
                      }}
                    >
                      {it.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--tn-mono)',
                        fontSize: 11,
                        color: 'var(--tn-dim)',
                      }}
                    >
                      {it.desc}
                    </div>
                  </span>
                  {active ? (
                    <span
                      style={{
                        fontFamily: 'var(--tn-mono)',
                        fontSize: 10,
                        color: 'var(--tn-dim)',
                      }}
                    >
                      ↵
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ),
      )}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            fontFamily: 'var(--tn-mono)',
            fontSize: 12,
            color: 'var(--tn-dim)',
          }}
        >
          no matches
        </div>
      ) : null}
    </div>
  );
}
