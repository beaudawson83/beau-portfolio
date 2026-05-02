'use client';

// Editable variants of each block type for the builder. Read-mode blocks come
// from ../blocks/Blocks; we re-render those for non-text blocks.

import { type CSSProperties, useEffect, useRef } from 'react';
import type { BlogBlock } from '@/types';
import {
  AudioBlock,
  ButtonBlock,
  ChartBlock,
  DividerBlock,
  GalleryBlock,
  TweetEmbed,
  TwoColumnBlock,
  VideoBlock,
  WordArtBlock,
} from '../blocks/Blocks';
import ImageUploadButton from './ImageUploadButton';

const IMAGE_SIZE_HINT = 'Up to 1600px wide · JPG/PNG/WEBP/GIF, max 10 MB.';

// ---------------------------------------------------------------------------
// EDITABLE LINE — h1/h2/h3/p
// ---------------------------------------------------------------------------

const LINE_STYLES: Record<'h1' | 'h2' | 'h3' | 'p', CSSProperties> = {
  h1: {
    fontFamily: 'var(--tn-sans)',
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: '-1.2px',
    lineHeight: 1.1,
    margin: '32px 0 16px',
    color: 'var(--tn-ink)',
  },
  h2: {
    fontFamily: 'var(--tn-sans)',
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.7px',
    lineHeight: 1.2,
    margin: '32px 0 14px',
    color: 'var(--tn-ink)',
  },
  h3: {
    fontFamily: 'var(--tn-sans)',
    fontSize: 19,
    fontWeight: 600,
    letterSpacing: '-0.3px',
    lineHeight: 1.3,
    margin: '24px 0 10px',
    color: 'var(--tn-ink)',
  },
  p: {
    fontFamily: 'var(--tn-serif)',
    fontSize: 17,
    lineHeight: 1.75,
    margin: '0 0 16px',
    color: 'var(--tn-ink)',
  },
};

const PLACEHOLDERS: Record<'h1' | 'h2' | 'h3' | 'p', string> = {
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  p: 'Begin writing… (type / for blocks)',
};

export function EditableLine({
  type,
  blockId,
  content,
  onChange,
  onEnter,
  onBackspaceAtStart,
  onSlash,
}: {
  type: 'h1' | 'h2' | 'h3' | 'p';
  blockId: string;
  content: string;
  onChange: (next: string) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onSlash: (rect: DOMRect, query: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // lastText tracks the visible (innerText) string so backspace-at-start +
  // slash-trigger detection work on what the user actually sees, not on the
  // raw HTML markup.
  const lastText = useRef(stripTags(content));

  // Sync DOM when the block identity changes (mount or replace), not on every
  // keystroke — that would clobber the user's caret. Content is stored as
  // HTML so inline formatting (bold / italic / links) round-trips through save.
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (content || '')) {
      ref.current.innerHTML = content || '';
      lastText.current = ref.current.innerText;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only sync on block id swap
  }, [blockId]);

  return (
    <div
      ref={ref}
      data-editable
      contentEditable
      suppressContentEditableWarning
      data-placeholder={PLACEHOLDERS[type]}
      onInput={(e) => {
        const target = e.currentTarget as HTMLDivElement;
        const txt = target.innerText;
        const html = target.innerHTML;
        lastText.current = txt;
        if (type === 'p' && txt.startsWith('/')) {
          const r = target.getBoundingClientRect();
          onSlash(r, txt.slice(1));
        }
        onChange(html);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onEnter();
        }
        if (e.key === 'Backspace' && (lastText.current === '' || lastText.current == null)) {
          e.preventDefault();
          onBackspaceAtStart();
        }
      }}
      style={{ ...LINE_STYLES[type], outline: 'none', minHeight: '1em', whiteSpace: 'pre-wrap' }}
    />
  );
}

/** Best-effort tag stripper for the lastText init value. We can't use a DOM
 * node here (this runs during render), so a single regex pass is good enough
 * for the emptiness check it feeds into. */
function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

// ---------------------------------------------------------------------------
// EDITABLE LIST — ul/ol
// ---------------------------------------------------------------------------

export function EditableList({
  ordered,
  items,
  onChange,
}: {
  ordered: boolean;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const Tag = ordered ? 'ol' : 'ul';
  const listRef = useRef<HTMLOListElement | HTMLUListElement>(null);

  // After deleting an item, focus the previous item's contenteditable so the
  // caret lands somewhere sensible.
  const focusItem = (idx: number) => {
    queueMicrotask(() => {
      const root = listRef.current;
      if (!root) return;
      const editables = root.querySelectorAll<HTMLElement>('[data-editable]');
      const target = editables[Math.max(0, Math.min(editables.length - 1, idx))];
      if (!target) return;
      target.focus();
      // Caret to end of the focused item.
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  };

  return (
    <Tag
      ref={listRef as React.Ref<HTMLOListElement & HTMLUListElement>}
      style={{
        paddingLeft: 24,
        margin: '0 0 18px',
        // Explicit because the global Tailwind preflight resets list-style
        // to none on every ul/ol.
        listStyleType: ordered ? 'decimal' : 'disc',
        listStylePosition: 'outside',
      }}
    >
      {items.map((it, i) => (
        <li
          key={i}
          style={{
            fontFamily: 'var(--tn-serif)',
            fontSize: 17,
            lineHeight: 1.7,
            color: 'var(--tn-ink)',
            marginBottom: 6,
          }}
        >
          <EditableListItem
            html={it}
            isOnly={items.length === 1}
            onUpdate={(html) => {
              const next = [...items];
              next[i] = html;
              onChange(next);
            }}
            onEnter={() => {
              const next = [...items];
              next.splice(i + 1, 0, '');
              onChange(next);
              focusItem(i + 1);
            }}
            onBackspaceEmpty={() => {
              if (items.length <= 1) return;
              const next = items.filter((_, idx) => idx !== i);
              onChange(next);
              focusItem(i - 1);
            }}
          />
        </li>
      ))}
    </Tag>
  );
}

/**
 * Single editable list item. The `useEffect` below guards against the classic
 * React + contentEditable bug: rendering with `dangerouslySetInnerHTML` on
 * every change can clobber the caret and re-instate stale content if a parent
 * re-renders while the user is mid-edit. We only mutate the DOM when its
 * innerHTML genuinely differs from the source-of-truth string — which it
 * doesn't after a local keystroke (because onInput already pushed that value
 * into state).
 */
function EditableListItem({
  html,
  isOnly,
  onUpdate,
  onEnter,
  onBackspaceEmpty,
}: {
  html: string;
  isOnly: boolean;
  onUpdate: (html: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [html]);

  return (
    <span
      ref={ref}
      data-editable
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => {
        onUpdate((e.currentTarget as HTMLSpanElement).innerHTML);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
          return;
        }
        if (e.key === 'Backspace' && (e.currentTarget as HTMLSpanElement).innerText === '') {
          e.preventDefault();
          if (!isOnly) onBackspaceEmpty();
        }
      }}
      style={{ outline: 'none' }}
    />
  );
}

// ---------------------------------------------------------------------------
// EDITABLE PULLQUOTE
// ---------------------------------------------------------------------------

export function EditablePullquote({
  text,
  attr,
  onChange,
}: {
  text: string;
  attr?: string;
  onChange: (next: { text: string; attr?: string }) => void;
}) {
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
      <div
        data-editable
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) =>
          onChange({ text: (e.currentTarget as HTMLDivElement).innerHTML, attr })
        }
        style={{
          fontFamily: 'var(--tn-serif)',
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1.4,
          color: 'var(--tn-ink)',
          outline: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--tn-mono)',
          fontSize: 11,
          color: 'var(--tn-dim)',
          textTransform: 'uppercase',
          letterSpacing: '.1em',
        }}
      >
        <span style={{ userSelect: 'none' }}>— </span>
        <span
          data-editable
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) =>
            onChange({ text, attr: (e.currentTarget as HTMLSpanElement).innerHTML })
          }
          style={{ outline: 'none' }}
          dangerouslySetInnerHTML={{ __html: attr ?? '' }}
        />
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// EDITABLE CALLOUT
// ---------------------------------------------------------------------------

const CALLOUT_COLOR: Record<string, string> = {
  info: 'var(--tn-accent)',
  warn: 'var(--tn-warn)',
  success: 'var(--tn-ok)',
  note: 'var(--tn-dim)',
};

export function EditableCallout({
  kind,
  title,
  text,
  onChange,
}: {
  kind: 'info' | 'warn' | 'success' | 'note';
  title?: string;
  text: string;
  onChange: (next: { kind: 'info' | 'warn' | 'success' | 'note'; title?: string; text: string }) => void;
}) {
  const color = CALLOUT_COLOR[kind] ?? 'var(--tn-accent)';
  return (
    <aside
      style={{
        margin: '28px 0',
        padding: '14px 18px',
        borderLeft: `3px solid ${color}`,
        background: 'var(--tn-bg2)',
        borderRadius: '0 6px 6px 0',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <select
          value={kind}
          onChange={(e) =>
            onChange({
              kind: e.target.value as 'info' | 'warn' | 'success' | 'note',
              title,
              text,
            })
          }
          style={{
            fontFamily: 'var(--tn-mono)',
            fontSize: 10,
            background: 'transparent',
            border: '1px solid var(--tn-line2)',
            color,
            padding: '2px 6px',
            borderRadius: 3,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
          }}
        >
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="success">success</option>
          <option value="note">note</option>
        </select>
        <input
          value={title || ''}
          onChange={(e) => onChange({ kind, title: e.target.value, text })}
          placeholder="title"
          style={{
            fontFamily: 'var(--tn-mono)',
            fontSize: 11,
            color,
            fontWeight: 600,
            background: 'transparent',
            border: 0,
            outline: 'none',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            flex: 1,
          }}
        />
      </div>
      <div
        data-editable
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) =>
          onChange({ kind, title, text: (e.currentTarget as HTMLDivElement).innerHTML })
        }
        style={{
          fontFamily: 'var(--tn-serif)',
          fontSize: 15.5,
          lineHeight: 1.55,
          color: 'var(--tn-ink)',
          outline: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// EDITABLE IMAGE
// ---------------------------------------------------------------------------

export function EditableImage({
  url,
  caption,
  label,
  onChange,
}: {
  url?: string;
  caption?: string;
  label?: string;
  onChange: (next: { url?: string; caption?: string; label?: string }) => void;
}) {
  return (
    <figure style={{ margin: '28px 0' }}>
      <div
        style={{
          aspectRatio: '16/9',
          background: url
            ? 'transparent'
            : 'repeating-linear-gradient(135deg, var(--tn-bg2) 0 12px, var(--tn-bg3) 12px 24px)',
          border: '1px solid var(--tn-line)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- editor preview, user-provided URL
          <img
            src={url}
            alt={caption ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--tn-mono)',
                fontSize: 11,
                color: 'var(--tn-dim)',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
              }}
            >
              [ {label || 'image'} ]
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
        <input
          value={url || ''}
          onChange={(e) => onChange({ url: e.target.value || undefined, caption, label })}
          placeholder="paste image URL…"
          className="tn-focus"
          style={{
            flex: 1,
            background: 'var(--tn-bg2)',
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
          onUploaded={(publicUrl) => onChange({ url: publicUrl, caption, label })}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--tn-mono)',
          fontSize: 10,
          color: 'var(--tn-dim2)',
          marginTop: 4,
        }}
      >
        {IMAGE_SIZE_HINT}
      </div>
      <input
        value={caption || ''}
        onChange={(e) => onChange({ url, caption: e.target.value, label })}
        placeholder="↳ caption (optional)"
        style={{
          width: '100%',
          marginTop: 8,
          fontFamily: 'var(--tn-mono)',
          fontSize: 11.5,
          color: 'var(--tn-dim)',
          background: 'transparent',
          border: 0,
          outline: 'none',
          padding: 0,
        }}
      />
    </figure>
  );
}

// ---------------------------------------------------------------------------
// EDITABLE CODE
// ---------------------------------------------------------------------------

const miniInputStyle = (w: number): CSSProperties => ({
  width: w,
  fontFamily: 'var(--tn-mono)',
  fontSize: 11,
  color: 'var(--tn-ink)',
  background: 'transparent',
  border: '1px solid var(--tn-line2)',
  padding: '3px 7px',
  borderRadius: 3,
  outline: 'none',
});

export function EditableCode({
  language,
  filename,
  body,
  onChange,
}: {
  language?: string;
  filename?: string;
  body: string;
  onChange: (next: { language?: string; filename?: string; body: string }) => void;
}) {
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
          padding: '6px 10px',
          background: 'var(--tn-bg2)',
          borderBottom: '1px solid var(--tn-line)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          value={language || ''}
          onChange={(e) => onChange({ language: e.target.value, filename, body })}
          placeholder="language"
          style={miniInputStyle(80)}
        />
        <input
          value={filename || ''}
          onChange={(e) => onChange({ language, filename: e.target.value, body })}
          placeholder="filename"
          style={miniInputStyle(180)}
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => onChange({ language, filename, body: e.target.value })}
        rows={Math.max(6, body.split('\n').length)}
        style={{
          width: '100%',
          resize: 'vertical',
          background: 'var(--tn-bg)',
          color: 'var(--tn-ink)',
          border: 0,
          outline: 'none',
          fontFamily: 'var(--tn-mono)',
          fontSize: 13,
          lineHeight: 1.7,
          padding: '12px 14px',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EDITABLE TABLE — header row + body cells, with row/col add/remove
// ---------------------------------------------------------------------------

const cellEditableStyle: CSSProperties = {
  outline: 'none',
  display: 'block',
  minWidth: 24,
  minHeight: '1em',
};

export function EditableTable({
  headers,
  rows,
  onChange,
}: {
  headers: string[];
  rows: string[][];
  onChange: (next: { headers: string[]; rows: string[][] }) => void;
}) {
  const cols = headers.length;

  const updateHeader = (i: number, html: string) => {
    const next = [...headers];
    next[i] = html;
    onChange({ headers: next, rows });
  };
  const updateCell = (r: number, c: number, html: string) => {
    const next = rows.map((row) => [...row]);
    next[r][c] = html;
    onChange({ headers, rows: next });
  };
  const addRow = () => onChange({ headers, rows: [...rows, Array(cols).fill('')] });
  const addCol = () =>
    onChange({
      headers: [...headers, `Col ${headers.length + 1}`],
      rows: rows.map((r) => [...r, '']),
    });
  const delRow = () => {
    if (rows.length <= 1) return;
    onChange({ headers, rows: rows.slice(0, -1) });
  };
  const delCol = () => {
    if (cols <= 1) return;
    onChange({
      headers: headers.slice(0, -1),
      rows: rows.map((r) => r.slice(0, -1)),
    });
  };

  return (
    <div style={{ margin: '28px 0' }}>
      <div
        style={{
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
                >
                  <span
                    data-editable
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      updateHeader(i, (e.currentTarget as HTMLSpanElement).innerHTML)
                    }
                    style={cellEditableStyle}
                    dangerouslySetInnerHTML={{ __html: h }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                style={{
                  borderBottom: ri < rows.length - 1 ? '1px solid var(--tn-line)' : 0,
                }}
              >
                {row.map((cell, ci) => {
                  const stripped = cell.replace(/<[^>]*>/g, '');
                  return (
                    <td
                      key={ci}
                      style={{
                        padding: '10px 14px',
                        color: 'var(--tn-ink)',
                        fontFamily: /^[\d$%.+-]/.test(stripped)
                          ? 'var(--tn-mono)'
                          : 'var(--tn-sans)',
                      }}
                    >
                      <span
                        data-editable
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) =>
                          updateCell(ri, ci, (e.currentTarget as HTMLSpanElement).innerHTML)
                        }
                        style={cellEditableStyle}
                        dangerouslySetInnerHTML={{ __html: cell }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" className="tn-btn sm" onClick={addRow}>
          + row
        </button>
        <button type="button" className="tn-btn sm" onClick={addCol}>
          + column
        </button>
        <button
          type="button"
          className="tn-btn sm"
          onClick={delRow}
          disabled={rows.length <= 1}
          style={{ opacity: rows.length <= 1 ? 0.4 : 1 }}
          title="Remove last row"
        >
          − row
        </button>
        <button
          type="button"
          className="tn-btn sm"
          onClick={delCol}
          disabled={cols <= 1}
          style={{ opacity: cols <= 1 ? 0.4 : 1 }}
          title="Remove last column"
        >
          − column
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EDITABLE WORD ART
// ---------------------------------------------------------------------------

const WORDART_VARIANTS = ['gradient', 'outline', 'fill', 'chrome'] as const;
type WordArtVariant = (typeof WORDART_VARIANTS)[number];

export function EditableWordArt({
  text,
  variant = 'gradient',
  onChange,
}: {
  text: string;
  variant?: WordArtVariant;
  onChange: (next: { text: string; variant: WordArtVariant }) => void;
}) {
  return (
    <div style={{ margin: '32px 0' }}>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 10 }}>
        {WORDART_VARIANTS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange({ text, variant: v })}
            style={{
              fontFamily: 'var(--tn-mono)',
              fontSize: 10,
              padding: '3px 8px',
              borderRadius: 3,
              background: variant === v ? 'var(--tn-accent-glow)' : 'transparent',
              color: variant === v ? 'var(--tn-accent)' : 'var(--tn-dim)',
              border: `1px solid ${variant === v ? 'var(--tn-accent-dim)' : 'var(--tn-line2)'}`,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              cursor: 'pointer',
            }}
          >
            {v}
          </button>
        ))}
      </div>
      <WordArtBlock text={text} variant={variant} />
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <input
          value={text}
          onChange={(e) => onChange({ text: e.target.value, variant })}
          placeholder="BIG IDEA"
          className="tn-focus"
          style={{
            background: 'var(--tn-bg2)',
            border: '1px solid var(--tn-line2)',
            borderRadius: 4,
            padding: '6px 10px',
            fontFamily: 'var(--tn-mono)',
            fontSize: 11,
            color: 'var(--tn-ink)',
            outline: 'none',
            textAlign: 'center',
            width: 240,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EDIT-MODE BLOCK RENDERER
// Switches on block.type and dispatches to either an editable variant (for
// blocks the design supports inline-editing) or the read-mode component
// (for rich blocks where the editor falls back to a static preview).
// ---------------------------------------------------------------------------

export function EditBlockRenderer({
  block,
  onUpdate,
  onEnter,
  onBackspaceAtStart,
  onSlash,
}: {
  block: BlogBlock;
  onUpdate: (patch: Partial<BlogBlock>) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onSlash: (rect: DOMRect, query: string) => void;
}) {
  switch (block.type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'p':
      return (
        <EditableLine
          type={block.type}
          blockId={block.id}
          content={block.content}
          onChange={(content) => onUpdate({ content })}
          onEnter={onEnter}
          onBackspaceAtStart={onBackspaceAtStart}
          onSlash={onSlash}
        />
      );
    case 'ul':
    case 'ol':
      return (
        <EditableList
          ordered={block.type === 'ol'}
          items={block.content}
          onChange={(content) => onUpdate({ content })}
        />
      );
    case 'pullquote':
      return (
        <EditablePullquote
          text={block.content.text}
          attr={block.content.attr}
          onChange={(content) => onUpdate({ content })}
        />
      );
    case 'callout':
      return (
        <EditableCallout
          kind={block.content.kind}
          title={block.content.title}
          text={block.content.text}
          onChange={(content) => onUpdate({ content })}
        />
      );
    case 'image':
      return (
        <EditableImage
          url={block.content.url}
          caption={block.content.caption}
          label={block.content.label}
          onChange={(content) => onUpdate({ content })}
        />
      );
    case 'code':
      return (
        <EditableCode
          language={block.content.language}
          filename={block.content.filename}
          body={block.content.body}
          onChange={(content) => onUpdate({ content })}
        />
      );
    case 'wordart':
      return (
        <EditableWordArt
          text={block.content.text}
          variant={block.content.variant}
          onChange={(content) => onUpdate({ content })}
        />
      );
    case 'divider':
      return <DividerBlock kind={block.content} />;
    case 'gallery':
      return <GalleryBlock items={block.content.items} caption={block.content.caption} />;
    case 'video':
      return <VideoBlock url={block.content.url} caption={block.content.caption} label={block.content.label} />;
    case 'audio':
      return <AudioBlock url={block.content.url} title={block.content.title} duration={block.content.duration} />;
    case 'table':
      return (
        <EditableTable
          headers={block.content.headers}
          rows={block.content.rows}
          onChange={(content) => onUpdate({ content })}
        />
      );
    case 'chart':
      return <ChartBlock title={block.content.title} unit={block.content.unit} data={block.content.data} />;
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
