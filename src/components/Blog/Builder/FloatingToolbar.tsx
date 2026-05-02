'use client';

import { type ReactNode } from 'react';

const COLOR_SWATCHES: { value: string; label: string }[] = [
  { value: '#60a5fa', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
];

const SIZE_SMALL = '14px';
const SIZE_LARGE = '22px';

/**
 * Wrap the current selection in a <span> with the given inline style and
 * manually fire an 'input' event on the host contentEditable so React's
 * onInput handler picks up the change (direct DOM mutation alone doesn't
 * fire input).
 */
function wrapSelectionInSpan(style: Partial<CSSStyleDeclaration>) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);

  const span = document.createElement('span');
  Object.assign(span.style, style);
  span.appendChild(range.extractContents());
  range.insertNode(span);

  range.setStartAfter(span);
  range.setEndAfter(span);
  sel.removeAllRanges();
  sel.addRange(range);

  const editable = span.closest('[data-editable]');
  editable?.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function FloatingToolbar({ x, y }: { x: number; y: number }) {
  // document.execCommand is deprecated but is still the simplest way to do
  // inline formatting on a contentEditable selection. We only handle bold /
  // italic / underline / strike / link / quote / color — sufficient for this
  // scope. Size uses manual range wrapping because execCommand('fontSize')
  // produces deprecated <font size> markup that can't take pixel values.
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
  };

  return (
    <div
      className="tn-fade"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translateX(-50%)',
        background: 'var(--tn-bg3)',
        border: '1px solid var(--tn-line2)',
        borderRadius: 6,
        padding: 3,
        display: 'flex',
        gap: 1,
        boxShadow: 'var(--tn-shadow)',
        zIndex: 30,
        fontFamily: 'var(--tn-mono)',
      }}
    >
      <Btn cmd="bold" exec={exec} title="Bold">
        <b>B</b>
      </Btn>
      <Btn cmd="italic" exec={exec} title="Italic">
        <i>I</i>
      </Btn>
      <Btn cmd="underline" exec={exec} title="Underline">
        <u>U</u>
      </Btn>
      <Btn cmd="strikeThrough" exec={exec} title="Strike">
        <s>S</s>
      </Btn>
      <Sep />
      <Btn
        cmd="createLink"
        val=""
        exec={(c) => {
          // Capture the current selection range BEFORE the prompt steals
          // focus — otherwise execCommand has nothing to wrap when we get back.
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
          const saved = sel.getRangeAt(0).cloneRange();

          const url = window.prompt('Link URL:', 'https://');
          if (!url) return;

          // Restore the selection (the prompt may have collapsed it).
          sel.removeAllRanges();
          sel.addRange(saved);

          document.execCommand(c, false, url);
        }}
        title="Link"
      >
        ↗ link
      </Btn>
      <Btn cmd="formatBlock" val="<blockquote>" exec={exec} title="Quote">
        &quot;
      </Btn>
      <Sep />
      {COLOR_SWATCHES.map((c) => (
        <button
          key={c.label}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('foreColor', false, c.value);
          }}
          title={`Color: ${c.label}`}
          style={{
            width: 16,
            height: 16,
            background: c.value,
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 3,
            margin: '5px 2px',
            padding: 0,
            cursor: 'pointer',
          }}
        />
      ))}
      <Sep />
      <Btn
        cmd="size-smaller"
        exec={() => wrapSelectionInSpan({ fontSize: SIZE_SMALL })}
        title="Smaller text"
      >
        A−
      </Btn>
      <Btn
        cmd="size-larger"
        exec={() => wrapSelectionInSpan({ fontSize: SIZE_LARGE })}
        title="Larger text"
      >
        A+
      </Btn>
    </div>
  );
}

function Sep() {
  return (
    <span
      style={{
        width: 1,
        background: 'var(--tn-line)',
        margin: '4px 2px',
      }}
    />
  );
}

function Btn({
  cmd,
  val,
  exec,
  children,
  title,
}: {
  cmd: string;
  val?: string;
  exec: (cmd: string, val?: string) => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        exec(cmd, val);
      }}
      title={title}
      style={{
        padding: '5px 8px',
        background: 'transparent',
        color: 'var(--tn-ink)',
        border: 0,
        borderRadius: 4,
        fontFamily: 'var(--tn-mono)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168,85,247,.18)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}
