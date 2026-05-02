'use client';

import { type CSSProperties, useState } from 'react';
import type { BlogCoverId } from '@/types';
import ImageUploadButton from './ImageUploadButton';

const COVER_SIZE_HINT =
  'Recommended: 1600 × 400 (4:1 banner) · JPG/PNG/WEBP/GIF, max 10 MB.';

interface CoverOption {
  id: BlogCoverId;
  label: string;
  bg: string;
  none?: boolean;
  placeholder?: boolean;
}

export const COVER_OPTIONS: CoverOption[] = [
  {
    id: 'cover-mesh',
    label: 'gradient mesh',
    bg: 'radial-gradient(at 30% 20%, #a855f7, transparent 50%), radial-gradient(at 80% 60%, #ec4899, transparent 50%), radial-gradient(at 50% 90%, #7c3aed, transparent 50%), #0e0c14',
  },
  {
    id: 'cover-grid',
    label: 'grid lines',
    bg: 'linear-gradient(var(--tn-bg2),var(--tn-bg2)), repeating-linear-gradient(0deg, transparent 0 19px, rgba(168,85,247,.4) 19px 20px), repeating-linear-gradient(90deg, transparent 0 19px, rgba(168,85,247,.4) 19px 20px)',
  },
  {
    id: 'cover-stripe',
    label: 'stripes',
    bg: 'repeating-linear-gradient(135deg, var(--tn-bg2) 0 16px, var(--tn-bg3) 16px 32px)',
  },
  {
    id: 'cover-photo',
    label: 'paste url',
    bg: 'repeating-linear-gradient(45deg, var(--tn-bg2) 0 12px, var(--tn-bg3) 12px 24px)',
    placeholder: true,
  },
  { id: 'none', label: 'no cover', bg: 'transparent', none: true },
];

export function coverBackground(coverId: BlogCoverId, coverUrl?: string | null): string {
  if (coverId === 'cover-photo' && coverUrl) {
    return `center/cover no-repeat url(${JSON.stringify(coverUrl)})`;
  }
  const opt = COVER_OPTIONS.find((o) => o.id === coverId);
  return opt?.bg ?? 'transparent';
}

export default function CoverPicker({
  value,
  url,
  onChange,
  compact = false,
}: {
  value: BlogCoverId;
  url?: string | null;
  onChange: (next: { coverId: BlogCoverId; coverUrl?: string | null }) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const opt = COVER_OPTIONS.find((o) => o.id === value) || COVER_OPTIONS[0];

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {COVER_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange({ coverId: o.id, coverUrl: o.id === 'cover-photo' ? url ?? '' : null })}
              style={tileStyle(o, value)}
            >
              <span
                style={{
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 9,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                {o.label}
              </span>
            </button>
          ))}
        </div>
        {value === 'cover-photo' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <input
                value={url || ''}
                onChange={(e) => onChange({ coverId: 'cover-photo', coverUrl: e.target.value })}
                placeholder="paste cover image URL…"
                className="tn-focus"
                style={{
                  flex: 1,
                  background: 'var(--tn-bg)',
                  border: '1px solid var(--tn-line2)',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 11,
                  color: 'var(--tn-ink)',
                  outline: 'none',
                }}
              />
              <ImageUploadButton
                compact
                onUploaded={(publicUrl) =>
                  onChange({ coverId: 'cover-photo', coverUrl: publicUrl })
                }
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--tn-mono)',
                fontSize: 10,
                color: 'var(--tn-dim2)',
                lineHeight: 1.4,
              }}
            >
              {COVER_SIZE_HINT}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {opt.none ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: '100%',
            height: 80,
            border: '1px dashed var(--tn-line2)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--tn-dim)',
            fontFamily: 'var(--tn-mono)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          + add cover image
        </button>
      ) : (
        <div
          onClick={() => setOpen((o) => !o)}
          style={{
            width: '100%',
            aspectRatio: '4/1',
            borderRadius: 6,
            background: coverBackground(value, url),
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid var(--tn-line)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0,0,0,.6)',
              color: '#fff',
              fontFamily: 'var(--tn-mono)',
              fontSize: 10,
              padding: '4px 10px',
              borderRadius: 99,
              letterSpacing: '.08em',
            }}
          >
            change cover ↓
          </div>
        </div>
      )}
      {open ? (
        <div
          className="tn-fade"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'var(--tn-bg3)',
            border: '1px solid var(--tn-line2)',
            borderRadius: 8,
            padding: 10,
            boxShadow: 'var(--tn-shadow)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {COVER_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange({ coverId: o.id, coverUrl: o.id === 'cover-photo' ? url ?? '' : null });
                  setOpen(false);
                }}
                style={tileStyle(o, value)}
              >
                <span
                  style={{
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 9,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                  }}
                >
                  {o.label}
                </span>
              </button>
            ))}
          </div>
          {value === 'cover-photo' ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <input
                  value={url || ''}
                  onChange={(e) => onChange({ coverId: 'cover-photo', coverUrl: e.target.value })}
                  placeholder="paste cover image URL…"
                  className="tn-focus"
                  style={{
                    flex: 1,
                    background: 'var(--tn-bg)',
                    border: '1px solid var(--tn-line2)',
                    borderRadius: 4,
                    padding: '6px 10px',
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 11,
                    color: 'var(--tn-ink)',
                    outline: 'none',
                  }}
                />
                <ImageUploadButton
                  compact
                  onUploaded={(publicUrl) =>
                    onChange({ coverId: 'cover-photo', coverUrl: publicUrl })
                  }
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 10,
                  color: 'var(--tn-dim2)',
                  lineHeight: 1.4,
                }}
              >
                {COVER_SIZE_HINT}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function tileStyle(o: CoverOption, active: BlogCoverId): CSSProperties {
  return {
    aspectRatio: '16/9',
    background: o.bg,
    border: `2px solid ${active === o.id ? 'var(--tn-accent)' : 'var(--tn-line)'}`,
    borderRadius: 5,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-end',
    padding: 6,
  };
}
