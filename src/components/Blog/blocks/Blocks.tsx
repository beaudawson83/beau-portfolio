'use client';

// Terminal Notebook — read-mode block components.
//
// Ported from the design's tn-blocks.jsx. Inline-styled to stay 1:1 with the
// design's visual; the per-element styles reference the CSS variables in
// blog.css so theming and accent changes flow through naturally.

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { BlogBlock, BlogHeading } from '@/types';

// Text content (paragraphs, headings, list items, pullquote, callout) is
// stored and rendered as HTML so inline formatting (bold, italic, links) the
// editor's floating toolbar applies survives saves. Existing plain-text
// content renders identically.

const SCROLL_MARGIN = 80;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export function ParagraphBlock({ html, id }: { html: string; id?: string }) {
  return (
    <p
      id={id}
      style={{
        fontFamily: 'var(--tn-serif)',
        fontSize: 17,
        lineHeight: 1.75,
        color: 'var(--tn-ink)',
        margin: '0 0 22px',
        textWrap: 'pretty',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function HeadingBlock({
  level,
  html,
  id,
}: {
  level: 1 | 2 | 3;
  html: string;
  id?: string;
}) {
  const styles: CSSProperties =
    level === 1
      ? {
          fontFamily: 'var(--tn-sans)',
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: '-1.2px',
          lineHeight: 1.1,
          margin: '32px 0 16px',
          color: 'var(--tn-ink)',
          scrollMarginTop: SCROLL_MARGIN,
        }
      : level === 2
        ? {
            fontFamily: 'var(--tn-sans)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.7px',
            margin: '44px 0 14px',
            color: 'var(--tn-ink)',
            scrollMarginTop: SCROLL_MARGIN,
          }
        : {
            fontFamily: 'var(--tn-sans)',
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: '-0.3px',
            margin: '28px 0 10px',
            color: 'var(--tn-ink)',
            scrollMarginTop: SCROLL_MARGIN,
          };

  const inner = { __html: html };
  if (level === 1) return <h1 id={id} style={styles} dangerouslySetInnerHTML={inner} />;
  if (level === 2) return <h2 id={id} style={styles} dangerouslySetInnerHTML={inner} />;
  return <h3 id={id} style={styles} dangerouslySetInnerHTML={inner} />;
}

// =============================================================================
// LIST
// =============================================================================

export function ListBlock({
  ordered,
  items,
}: {
  ordered: boolean;
  items: string[];
}) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      style={{
        paddingLeft: 24,
        margin: '0 0 18px',
        // Explicit because the global Tailwind preflight resets list-style
        // to none on every ul/ol.
        listStyleType: ordered ? 'decimal' : 'disc',
        listStylePosition: 'outside',
      }}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            fontFamily: 'var(--tn-serif)',
            fontSize: 17,
            lineHeight: 1.7,
            color: 'var(--tn-ink)',
            marginBottom: 6,
          }}
          dangerouslySetInnerHTML={{ __html: item }}
        />
      ))}
    </Tag>
  );
}

// =============================================================================
// PULLQUOTE
// =============================================================================

export function PullquoteBlock({ text, attr }: { text: string; attr?: string }) {
  return (
    <figure
      style={{
        margin: '36px 0',
        padding: '20px 26px',
        borderLeft: '3px solid var(--tn-accent)',
        background: 'var(--tn-bg2)',
        borderRadius: '0 6px 6px 0',
      }}
    >
      <blockquote
        style={{
          margin: 0,
          fontFamily: 'var(--tn-serif)',
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1.4,
          color: 'var(--tn-ink)',
        }}
      >
        &ldquo;<span dangerouslySetInnerHTML={{ __html: text }} />&rdquo;
      </blockquote>
      {attr ? (
        <figcaption
          style={{
            marginTop: 10,
            fontFamily: 'var(--tn-mono)',
            fontSize: 11,
            color: 'var(--tn-dim)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
          }}
        >
          — <span dangerouslySetInnerHTML={{ __html: attr }} />
        </figcaption>
      ) : null}
    </figure>
  );
}

// =============================================================================
// CALLOUT
// =============================================================================

const CALLOUT_CFG: Record<string, { color: string; icon: string }> = {
  info: { color: 'var(--tn-accent)', icon: 'i' },
  warn: { color: 'var(--tn-warn)', icon: '!' },
  success: { color: 'var(--tn-ok)', icon: '✓' },
  note: { color: 'var(--tn-dim)', icon: '#' },
};

export function CalloutBlock({
  kind,
  title,
  text,
}: {
  kind: 'info' | 'warn' | 'success' | 'note';
  title?: string;
  text: string;
}) {
  const cfg = CALLOUT_CFG[kind] ?? CALLOUT_CFG.info;
  return (
    <aside
      style={{
        margin: '28px 0',
        padding: '14px 18px',
        borderLeft: `3px solid ${cfg.color}`,
        background: 'var(--tn-bg2)',
        borderRadius: '0 6px 6px 0',
        display: 'flex',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: 4,
          background: cfg.color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--tn-mono)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {cfg.icon}
      </div>
      <div>
        {title ? (
          <div
            style={{
              fontFamily: 'var(--tn-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: cfg.color,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              marginBottom: 4,
            }}
          >
            {title}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: 'var(--tn-serif)',
            fontSize: 15.5,
            lineHeight: 1.55,
            color: 'var(--tn-ink)',
          }}
          dangerouslySetInnerHTML={{ __html: text }}
        />
      </div>
    </aside>
  );
}

// =============================================================================
// IMAGE PLACEHOLDER (shared by image / gallery / video)
// =============================================================================

function ImagePlaceholder({
  ratio = '16/9',
  label = 'image',
  children,
  style,
}: {
  ratio?: string;
  label?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        aspectRatio: ratio,
        background:
          'repeating-linear-gradient(135deg, var(--tn-bg2) 0 12px, var(--tn-bg3) 12px 24px)',
        border: '1px solid var(--tn-line)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--tn-mono)',
        fontSize: 11,
        color: 'var(--tn-dim)',
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children ?? <span>[ {label} ]</span>}
    </div>
  );
}

// =============================================================================
// IMAGE
// =============================================================================

export function ImageBlock({
  url,
  caption,
  label,
}: {
  url?: string;
  caption?: string;
  label?: string;
}) {
  return (
    <figure style={{ margin: '28px 0' }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-provided URL, dimensions unknown
        <img
          src={url}
          alt={caption ?? ''}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 6,
            border: '1px solid var(--tn-line)',
            display: 'block',
          }}
        />
      ) : (
        <ImagePlaceholder ratio="16/9" label={label} />
      )}
      {caption ? (
        <figcaption
          style={{
            marginTop: 8,
            fontFamily: 'var(--tn-mono)',
            fontSize: 11.5,
            color: 'var(--tn-dim)',
            letterSpacing: '.02em',
          }}
        >
          ↳ {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

// =============================================================================
// GALLERY
// =============================================================================

export function GalleryBlock({
  items = [],
  caption,
}: {
  items: string[];
  caption?: string;
}) {
  const list = items.length ? items : ['shot 01', 'shot 02', 'shot 03', 'shot 04'];
  const [active, setActive] = useState(0);
  const prev = () => setActive((a) => (a - 1 + list.length) % list.length);
  const next = () => setActive((a) => (a + 1) % list.length);
  return (
    <figure style={{ margin: '28px 0' }}>
      <div style={{ position: 'relative' }}>
        <ImagePlaceholder ratio="16/9" label={list[active]} />
        <button
          type="button"
          onClick={prev}
          aria-label="Previous"
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,.6)',
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,.6)',
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ›
        </button>
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
          }}
        >
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i === active ? 'var(--tn-accent)' : 'rgba(255,255,255,.4)',
                border: 0,
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontFamily: 'var(--tn-mono)',
            fontSize: 10,
            color: '#fff',
            background: 'rgba(0,0,0,.6)',
            padding: '3px 8px',
            borderRadius: 99,
            letterSpacing: '.08em',
          }}
        >
          {active + 1}/{list.length}
        </div>
      </div>
      {caption ? (
        <figcaption
          style={{
            marginTop: 8,
            fontFamily: 'var(--tn-mono)',
            fontSize: 11.5,
            color: 'var(--tn-dim)',
          }}
        >
          ↳ {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

// =============================================================================
// VIDEO
// =============================================================================

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const x = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
}

export function VideoBlock({
  url,
  caption,
  label = 'video',
}: {
  url?: string;
  caption?: string;
  label?: string;
}) {
  // If a real URL is provided, embed it; otherwise show the design's
  // simulated player (a placeholder + fake progress).
  if (url) {
    const embed = toVideoEmbedSrc(url);
    return (
      <figure style={{ margin: '28px 0' }}>
        <div
          style={{
            position: 'relative',
            aspectRatio: '16/9',
            borderRadius: 6,
            overflow: 'hidden',
            background: '#000',
            border: '1px solid var(--tn-line)',
          }}
        >
          {embed ? (
            <iframe
              src={embed}
              title={caption ?? 'video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <video src={url} controls style={{ width: '100%', height: '100%', display: 'block' }} />
          )}
        </div>
        {caption ? (
          <figcaption
            style={{
              marginTop: 8,
              fontFamily: 'var(--tn-mono)',
              fontSize: 11.5,
              color: 'var(--tn-dim)',
            }}
          >
            ↳ {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return <SimulatedVideo caption={caption} label={label} />;
}

function SimulatedVideo({ caption, label }: { caption?: string; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(12);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((x) => {
        if (x >= 100) {
          setPlaying(false);
          return 100;
        }
        return x + 0.6;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing]);
  return (
    <figure style={{ margin: '28px 0' }}>
      <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', background: '#000' }}>
        <ImagePlaceholder ratio="16/9" label={label} style={{ borderRadius: 0, border: 0 }} />
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Play'}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.25)',
            border: 0,
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--tn-accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              paddingLeft: playing ? 0 : 4,
              boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}
          >
            {playing ? '❚❚' : '▶'}
          </span>
        </button>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 12,
            background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: '#fff', fontFamily: 'var(--tn-mono)', fontSize: 11 }}>
            {fmtTime(t * 1.32)} / 02:12
          </span>
          <div
            style={{
              flex: 1,
              height: 3,
              background: 'rgba(255,255,255,.25)',
              borderRadius: 99,
            }}
          >
            <div
              style={{
                width: `${t}%`,
                height: '100%',
                background: 'var(--tn-accent)',
                borderRadius: 99,
              }}
            />
          </div>
          <span style={{ color: '#fff', fontFamily: 'var(--tn-mono)', fontSize: 11 }}>HD</span>
        </div>
      </div>
      {caption ? (
        <figcaption
          style={{
            marginTop: 8,
            fontFamily: 'var(--tn-mono)',
            fontSize: 11.5,
            color: 'var(--tn-dim)',
          }}
        >
          ↳ {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function toVideoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.endsWith('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      // /embed/<id>
      const m = u.pathname.match(/^\/embed\/([^/]+)/);
      if (m) return url;
    }
    // Vimeo
    if (u.hostname.endsWith('vimeo.com')) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// AUDIO
// =============================================================================

export function AudioBlock({
  title = 'Audio note',
  duration = '04:32',
  url,
}: {
  title?: string;
  duration?: string;
  url?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(28);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((x) => {
        if (x >= 100) {
          setPlaying(false);
          return 100;
        }
        return x + 0.4;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing]);
  const bars = useMemo(
    () =>
      Array.from(
        { length: 64 },
        (_, i) => 18 + Math.abs(Math.sin(i * 0.7) * 22) + Math.abs(Math.cos(i * 0.3) * 8),
      ),
    [],
  );
  if (url) {
    return (
      <div style={{ margin: '28px 0' }}>
        <audio controls src={url} style={{ width: '100%' }} />
      </div>
    );
  }
  return (
    <div
      style={{
        margin: '28px 0',
        padding: '14px 16px',
        background: 'var(--tn-bg2)',
        border: '1px solid var(--tn-line)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: 0,
          background: 'var(--tn-accent)',
          color: '#fff',
          fontSize: 14,
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--tn-mono)',
            fontSize: 12,
            color: 'var(--tn-ink)',
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, height: 28 }}>
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: h,
                background: (i / bars.length) * 100 < t ? 'var(--tn-accent)' : 'var(--tn-line2)',
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--tn-mono)',
          fontSize: 11,
          color: 'var(--tn-dim)',
          flexShrink: 0,
        }}
      >
        01:16 / {duration}
      </div>
    </div>
  );
}

// =============================================================================
// CODE
// =============================================================================

export function CodeBlock({
  language = 'typescript',
  filename,
  body,
}: {
  language?: string;
  filename?: string;
  body: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = body.replace(/^\n/, '').replace(/\n$/, '');
  const lines = text.split('\n');
  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <div
      style={{
        margin: '28px 0',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--tn-line)',
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          background: 'var(--tn-bg2)',
          borderBottom: '1px solid var(--tn-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--tn-mono)',
          fontSize: 11,
          color: 'var(--tn-dim)',
        }}
      >
        <span>{filename || language}</span>
        <button
          type="button"
          onClick={onCopy}
          style={{
            background: 'transparent',
            border: 0,
            color: copied ? 'var(--tn-ok)' : 'var(--tn-dim)',
            fontSize: 11,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px 0', background: 'var(--tn-bg)', overflow: 'auto' }}>
        <code
          style={{
            fontFamily: 'var(--tn-mono)',
            fontSize: 13,
            lineHeight: 1.7,
            display: 'block',
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex' }}>
              <span
                style={{
                  width: 40,
                  textAlign: 'right',
                  paddingRight: 14,
                  color: 'var(--tn-dim2)',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{ flex: 1, paddingRight: 14 }}
                dangerouslySetInnerHTML={{ __html: highlight(line) }}
              />
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HL_KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|async|await|import|from|export|class|new|null|true|false|interface|type)\b/g;

function highlight(rawLine: string): string {
  // Order matters: escape first, then layer in spans.
  let s = escapeHtml(rawLine);
  s = s.replace(/(\/\/.*$)/g, '<span style="color:var(--tn-dim)">$1</span>');
  s = s.replace(HL_KEYWORDS, '<span style="color:var(--tn-accent)">$1</span>');
  s = s.replace(
    /(&#39;|&quot;|`)((?:\\.|(?!\1).)*?)\1/g,
    '<span style="color:var(--tn-ok)">$1$2$1</span>',
  );
  s = s.replace(/\b(\d+)\b/g, '<span style="color:var(--tn-warn)">$1</span>');
  return s;
}

// =============================================================================
// TABLE
// =============================================================================

export function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div
      style={{
        margin: '28px 0',
        overflowX: 'auto',
        border: '1px solid var(--tn-line)',
        borderRadius: 6,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--tn-sans)',
          fontSize: 14,
        }}
      >
        <thead>
          <tr style={{ background: 'var(--tn-bg2)' }}>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--tn-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  borderBottom: '1px solid var(--tn-line)',
                }}
                dangerouslySetInnerHTML={{ __html: h }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--tn-line)' : 0 }}
            >
              {r.map((c, j) => {
                // Strip tags for the mono-font heuristic so a numeric cell
                // wrapped in <b> still renders as mono.
                const stripped = c.replace(/<[^>]*>/g, '');
                return (
                  <td
                    key={j}
                    style={{
                      padding: '10px 14px',
                      color: 'var(--tn-ink)',
                      fontFamily: /^[\d$%.+-]/.test(stripped)
                        ? 'var(--tn-mono)'
                        : 'var(--tn-sans)',
                    }}
                    dangerouslySetInnerHTML={{ __html: c }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// CHART (simple bar)
// =============================================================================

export function ChartBlock({
  title,
  unit = '',
  data,
}: {
  title?: string;
  unit?: string;
  data: { label: string; value: number; highlight?: boolean }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      style={{
        margin: '28px 0',
        padding: 18,
        background: 'var(--tn-bg2)',
        border: '1px solid var(--tn-line)',
        borderRadius: 6,
      }}
    >
      {title ? (
        <div
          style={{
            fontFamily: 'var(--tn-mono)',
            fontSize: 11,
            color: 'var(--tn-dim)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            marginBottom: 14,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--tn-mono)',
                fontSize: 11,
                color: 'var(--tn-ink)',
                fontWeight: 500,
              }}
            >
              {d.value}
              {unit}
            </div>
            <div
              style={{
                width: '100%',
                height: `${(d.value / max) * 140}px`,
                background: d.highlight ? 'var(--tn-accent)' : 'var(--tn-line2)',
                borderRadius: '3px 3px 0 0',
                transition: 'height .3s',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--tn-mono)',
                fontSize: 10,
                color: 'var(--tn-dim)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// DIVIDER
// =============================================================================

export function DividerBlock({ kind = 'line' }: { kind?: 'line' | 'dots' }) {
  if (kind === 'dots') {
    return (
      <div
        style={{
          textAlign: 'center',
          margin: '40px 0',
          letterSpacing: '1em',
          color: 'var(--tn-dim)',
          fontFamily: 'var(--tn-mono)',
        }}
      >
        · · ·
      </div>
    );
  }
  return <hr style={{ border: 0, borderTop: '1px solid var(--tn-line)', margin: '40px 0' }} />;
}

// =============================================================================
// WORD ART
// =============================================================================

const WORDART_STYLES: Record<string, CSSProperties> = {
  gradient: {
    background:
      'linear-gradient(135deg, var(--tn-accent) 0%, #7c3aed 50%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
  },
  outline: {
    WebkitTextStroke: '2px var(--tn-accent)',
    color: 'transparent',
  },
  fill: {
    background: 'var(--tn-accent)',
    color: '#fff',
    padding: '20px 28px',
    borderRadius: 8,
  },
  chrome: {
    background: 'linear-gradient(180deg, #fff 0%, #999 50%, #666 51%, #ccc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
};

export function WordArtBlock({
  text,
  variant = 'gradient',
}: {
  text: string;
  variant?: 'gradient' | 'outline' | 'fill' | 'chrome';
}) {
  return (
    <div
      style={{
        margin: '32px 0',
        textAlign: 'center',
        fontFamily: 'var(--tn-sans)',
        fontSize: 72,
        fontWeight: 900,
        letterSpacing: '-3px',
        lineHeight: 0.95,
        ...WORDART_STYLES[variant],
      }}
    >
      {text}
    </div>
  );
}

// =============================================================================
// EMBED (tweet)
// =============================================================================

export function TweetEmbed({
  author,
  handle,
  content,
  time,
  stat,
}: {
  author?: string;
  handle?: string;
  content?: string;
  time?: string;
  stat?: { likes?: number; retweets?: number; views?: string };
}) {
  return (
    <div
      style={{
        margin: '28px 0',
        padding: 16,
        background: 'var(--tn-bg2)',
        border: '1px solid var(--tn-line)',
        borderRadius: 8,
        display: 'flex',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--tn-accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--tn-mono)',
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {(author || 'U').slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <b style={{ color: 'var(--tn-ink)', fontFamily: 'var(--tn-sans)' }}>
            {author || 'Beau Dawson'}
          </b>
          <span style={{ color: 'var(--tn-dim)', fontFamily: 'var(--tn-mono)', fontSize: 12 }}>
            @{handle || 'beaudaw'}
          </span>
          <span
            style={{
              color: 'var(--tn-dim)',
              fontFamily: 'var(--tn-mono)',
              fontSize: 11,
              marginLeft: 'auto',
            }}
          >
            {time || '2d'}
          </span>
        </div>
        <div
          style={{
            color: 'var(--tn-ink)',
            fontFamily: 'var(--tn-sans)',
            fontSize: 14.5,
            lineHeight: 1.5,
            margin: '6px 0 8px',
          }}
        >
          {content || 'The best operations are invisible. The worst are unforgettable.'}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            fontFamily: 'var(--tn-mono)',
            fontSize: 11,
            color: 'var(--tn-dim)',
          }}
        >
          <span>♡ {stat?.likes ?? 247}</span>
          <span>↻ {stat?.retweets ?? 32}</span>
          <span>↗ {stat?.views ?? '4.1k'}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CTA BUTTON
// =============================================================================

export function ButtonBlock({ children }: { children: ReactNode }) {
  return (
    <div style={{ margin: '24px 0', textAlign: 'center' }}>
      <button type="button" className="tn-btn pri" style={{ padding: '11px 22px', fontSize: 13 }}>
        {children} →
      </button>
    </div>
  );
}

// =============================================================================
// TWO COLUMN
// =============================================================================

export function TwoColumnBlock({ left, right }: { left?: string; right?: string }) {
  return (
    <div style={{ margin: '28px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, lineHeight: 1.75, color: 'var(--tn-ink)' }}>
        {left}
      </div>
      <div style={{ fontFamily: 'var(--tn-serif)', fontSize: 17, lineHeight: 1.75, color: 'var(--tn-ink)' }}>
        {right}
      </div>
    </div>
  );
}

// =============================================================================
// TOC (with scrollspy)
// =============================================================================

export function TableOfContents({
  headings,
  scrollRoot,
}: {
  headings: BlogHeading[];
  scrollRoot?: React.RefObject<HTMLElement | null>;
}) {
  const [active, setActive] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    const root = scrollRoot?.current ?? null;
    const onScroll = () => {
      const offset = (root ? root.scrollTop : window.scrollY) + 120;
      let cur = headings[0]?.id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.offsetTop <= offset) cur = h.id;
      }
      setActive(cur);
    };
    const target: Window | HTMLElement = root ?? window;
    target.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener('scroll', onScroll);
  }, [headings, scrollRoot]);

  return (
    <nav style={{ position: 'sticky', top: 24, fontFamily: 'var(--tn-mono)', fontSize: 12 }}>
      <div
        style={{
          color: 'var(--tn-dim)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          fontSize: 10,
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: '1px solid var(--tn-line)',
        }}
      >
        ~/contents
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(h.id);
                if (!el) return;
                const root = scrollRoot?.current;
                if (root) root.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
                else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{
                display: 'block',
                padding: '6px 10px',
                paddingLeft: 10 + (h.depth - 2) * 14,
                color: active === h.id ? 'var(--tn-accent)' : 'var(--tn-dim)',
                borderLeft: `2px solid ${active === h.id ? 'var(--tn-accent)' : 'transparent'}`,
                textDecoration: 'none',
                transition: '.15s',
                lineHeight: 1.4,
              }}
            >
              {h.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// =============================================================================
// READING PROGRESS
// =============================================================================

export function ReadingProgress({
  scrollRoot,
}: {
  scrollRoot?: React.RefObject<HTMLElement | null>;
}) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const root = scrollRoot?.current ?? null;
    const onScroll = () => {
      const target = root ?? document.documentElement;
      const max = target.scrollHeight - target.clientHeight;
      const cur = root ? root.scrollTop : window.scrollY;
      setPct(max > 0 ? Math.min(100, (cur / max) * 100) : 0);
    };
    const el: Window | HTMLElement = root ?? window;
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRoot]);
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'transparent',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: 'var(--tn-accent)',
          transition: 'width .15s',
        }}
      />
    </div>
  );
}

// =============================================================================
// BLOCK RENDERER — switch on block.type
// =============================================================================

export function BlockRenderer({
  block,
  headingId,
}: {
  block: BlogBlock;
  headingId?: string;
}) {
  switch (block.type) {
    case 'h1':
      return <HeadingBlock level={1} id={headingId} html={block.content} />;
    case 'h2':
      return <HeadingBlock level={2} id={headingId} html={block.content} />;
    case 'h3':
      return <HeadingBlock level={3} id={headingId} html={block.content} />;
    case 'p':
      return <ParagraphBlock html={block.content} />;
    case 'ul':
      return <ListBlock ordered={false} items={block.content} />;
    case 'ol':
      return <ListBlock ordered items={block.content} />;
    case 'pullquote':
      return <PullquoteBlock text={block.content.text} attr={block.content.attr} />;
    case 'callout':
      return (
        <CalloutBlock
          kind={block.content.kind}
          title={block.content.title}
          text={block.content.text}
        />
      );
    case 'divider':
      return <DividerBlock kind={block.content} />;
    case 'image':
      return (
        <ImageBlock
          url={block.content.url}
          caption={block.content.caption}
          label={block.content.label}
        />
      );
    case 'gallery':
      return <GalleryBlock items={block.content.items} caption={block.content.caption} />;
    case 'video':
      return (
        <VideoBlock
          url={block.content.url}
          caption={block.content.caption}
          label={block.content.label}
        />
      );
    case 'audio':
      return (
        <AudioBlock
          url={block.content.url}
          title={block.content.title}
          duration={block.content.duration}
        />
      );
    case 'code':
      return (
        <CodeBlock
          language={block.content.language}
          filename={block.content.filename}
          body={block.content.body}
        />
      );
    case 'table':
      return <TableBlock headers={block.content.headers} rows={block.content.rows} />;
    case 'chart':
      return (
        <ChartBlock
          title={block.content.title}
          unit={block.content.unit}
          data={block.content.data}
        />
      );
    case 'wordart':
      return <WordArtBlock text={block.content.text} variant={block.content.variant} />;
    case 'embed':
      return (
        <TweetEmbed
          author={block.content.author}
          handle={block.content.handle}
          content={block.content.content}
          time={block.content.time}
          stat={block.content.stat}
        />
      );
    case 'button':
      return <ButtonBlock>{block.content}</ButtonBlock>;
    case 'twocol':
      return <TwoColumnBlock left={block.content.left} right={block.content.right} />;
  }
}
