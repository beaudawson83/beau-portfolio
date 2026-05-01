'use client';

import { useEffect, useState } from 'react';

export interface PaletteCommand {
  label: string;
  kbd?: string;
  do: () => void;
}

export default function CommandPalette({
  commands,
  onClose,
}: {
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const filtered = commands.filter((c) => !q || c.label.toLowerCase().includes(q.toLowerCase()));

  // Reset highlight to top when the query changes (render-phase, not effect).
  const [prevQ, setPrevQ] = useState(q);
  if (prevQ !== q) {
    setPrevQ(q);
    setIdx(0);
  }

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
        const c = filtered[idx];
        if (c) {
          c.do();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, idx, onClose]);

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="tn-fade"
        style={{
          width: 560,
          background: 'var(--tn-bg3)',
          border: '1px solid var(--tn-line2)',
          borderRadius: 10,
          boxShadow: 'var(--tn-shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--tn-line)',
          }}
        >
          <span style={{ fontFamily: 'var(--tn-mono)', fontSize: 14, color: 'var(--tn-accent)' }}>
            ⌘K
          </span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search commands, blocks, posts…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              color: 'var(--tn-ink)',
              fontFamily: 'var(--tn-sans)',
              fontSize: 16,
            }}
          />
          <span className="tn-chip">{filtered.length}</span>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: 6 }}>
          {filtered.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                c.do();
                onClose();
              }}
              onMouseEnter={() => setIdx(i)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '9px 12px',
                borderRadius: 5,
                background: i === idx ? 'var(--tn-accent-glow)' : 'transparent',
                color: 'var(--tn-ink)',
                border: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                fontFamily: 'var(--tn-sans)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <span>{c.label}</span>
              {c.kbd ? (
                <span
                  style={{
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 11,
                    color: 'var(--tn-dim)',
                  }}
                >
                  {c.kbd}
                </span>
              ) : null}
            </button>
          ))}
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 30,
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
      </div>
    </div>
  );
}
