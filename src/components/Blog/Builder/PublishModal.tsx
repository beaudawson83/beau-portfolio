'use client';

import { type CSSProperties, useState } from 'react';
import type { BlogPostStatus } from '@/types';

type Mode = 'publish' | 'schedule' | 'draft';

export default function PublishModal({
  initialStatus,
  initialPublishAt,
  pending,
  onConfirm,
  onClose,
}: {
  initialStatus: BlogPostStatus;
  initialPublishAt: string | null;
  pending?: boolean;
  onConfirm: (next: { status: BlogPostStatus; publishAt: string | null }) => void;
  onClose: () => void;
}) {
  const initialMode: Mode = initialStatus === 'scheduled' ? 'schedule' : initialStatus === 'published' ? 'publish' : 'publish';
  const [mode, setMode] = useState<Mode>(initialMode);
  const initialDate = initialPublishAt ? initialPublishAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const initialTime = initialPublishAt ? initialPublishAt.slice(11, 16) : '09:00';
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  const onSubmit = () => {
    if (mode === 'publish') onConfirm({ status: 'published', publishAt: new Date().toISOString() });
    else if (mode === 'schedule') {
      const iso = new Date(`${date}T${time}:00`).toISOString();
      onConfirm({ status: 'scheduled', publishAt: iso });
    } else {
      onConfirm({ status: 'draft', publishAt: null });
    }
  };

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="tn-fade"
        style={{
          width: 460,
          background: 'var(--tn-bg2)',
          border: '1px solid var(--tn-line2)',
          borderRadius: 10,
          boxShadow: 'var(--tn-shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--tn-line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--tn-mono)',
              fontSize: 12,
              color: 'var(--tn-accent)',
              letterSpacing: '.1em',
            }}
          >
            $ publish ./post
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--tn-dim)',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {(['publish', 'schedule', 'draft'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 11.5,
                  background: mode === m ? 'var(--tn-accent-glow)' : 'var(--tn-bg)',
                  color: mode === m ? 'var(--tn-accent)' : 'var(--tn-dim)',
                  border: `1px solid ${mode === m ? 'var(--tn-accent-dim)' : 'var(--tn-line2)'}`,
                  borderRadius: 5,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  cursor: 'pointer',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === 'publish' ? (
            <p style={blurbStyle}>
              Publish now. Post goes live on beaudawson.com/blog at this moment.
            </p>
          ) : null}
          {mode === 'schedule' ? (
            <div style={{ marginBottom: 16 }}>
              <p style={blurbStyle}>Schedule for a later time. Saves as scheduled until then.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle()}
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={inputStyle()}
                />
              </div>
            </div>
          ) : null}
          {mode === 'draft' ? (
            <p style={blurbStyle}>Save as draft. Only visible to you. Resume editing anytime.</p>
          ) : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="tn-btn" onClick={onClose}>
              cancel
            </button>
            <button
              type="button"
              className="tn-btn pri"
              onClick={onSubmit}
              disabled={pending}
              style={{ opacity: pending ? 0.6 : 1 }}
            >
              {pending
                ? 'working…'
                : mode === 'publish'
                  ? 'publish now →'
                  : mode === 'schedule'
                    ? `schedule for ${date} →`
                    : 'save draft →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const blurbStyle: CSSProperties = {
  fontFamily: 'var(--tn-serif)',
  fontSize: 15,
  color: 'var(--tn-ink)',
  lineHeight: 1.55,
  margin: '0 0 16px',
};

function inputStyle(): CSSProperties {
  return {
    flex: 1,
    fontFamily: 'var(--tn-mono)',
    fontSize: 13,
    color: 'var(--tn-ink)',
    background: 'transparent',
    border: '1px solid var(--tn-line2)',
    padding: '8px 10px',
    borderRadius: 3,
    outline: 'none',
  };
}
