'use client';

import { type ReactNode, useState } from 'react';
import type { BlogCategory, BlogCoverId, BlogPostStatus } from '@/types';
import CoverPicker from './CoverPicker';

interface SidebarProps {
  slug: string;
  status: BlogPostStatus;
  category: BlogCategory | null;
  tags: string[];
  coverId: BlogCoverId;
  coverUrl: string | null;
  seoDescription: string;
  title: string;
  dek: string;
  wordCount: number;
  readTime: number;
  lastSavedLabel: string;

  onSlugChange: (next: string) => void;
  onStatusChange: (next: BlogPostStatus) => void;
  onCategoryChange: (next: BlogCategory | null) => void;
  onTagsChange: (next: string[]) => void;
  onCoverChange: (next: { coverId: BlogCoverId; coverUrl?: string | null }) => void;
  onSeoDescriptionChange: (next: string) => void;
}

const CATEGORIES: BlogCategory[] = ['OPS', 'AI', 'CRAFT', 'NOTE'];
const STATUSES: BlogPostStatus[] = ['draft', 'scheduled', 'published'];

export default function Sidebar(props: SidebarProps) {
  const [tagDraft, setTagDraft] = useState('');

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || props.tags.includes(t)) return;
    props.onTagsChange([...props.tags, t]);
    setTagDraft('');
  };
  const removeTag = (t: string) => props.onTagsChange(props.tags.filter((x) => x !== t));

  return (
    <aside
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: '1px solid var(--tn-line)',
        background: 'var(--tn-bg2)',
        overflowY: 'auto',
        fontFamily: 'var(--tn-sans)',
        fontSize: 13,
      }}
    >
      <Section title="metadata">
        <Field label="slug">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--tn-bg)',
              border: '1px solid var(--tn-line2)',
              borderRadius: 5,
              padding: '0 8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--tn-mono)',
                fontSize: 11,
                color: 'var(--tn-dim)',
              }}
            >
              /blog/
            </span>
            <input
              value={props.slug}
              onChange={(e) => props.onSlugChange(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                outline: 'none',
                fontFamily: 'var(--tn-mono)',
                fontSize: 12,
                padding: '7px 0',
                color: 'var(--tn-ink)',
              }}
            />
          </div>
        </Field>
        <Field label="status">
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => props.onStatusChange(s)}
                style={{
                  flex: 1,
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 11,
                  padding: '6px 0',
                  borderRadius: 4,
                  background: props.status === s ? 'var(--tn-accent-glow)' : 'var(--tn-bg)',
                  color: props.status === s ? 'var(--tn-accent)' : 'var(--tn-dim)',
                  border: `1px solid ${
                    props.status === s ? 'var(--tn-accent-dim)' : 'var(--tn-line2)'
                  }`,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="category">
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => props.onCategoryChange(null)}
              style={catBtnStyle(props.category === null)}
            >
              none
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => props.onCategoryChange(c)}
                style={catBtnStyle(props.category === c)}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="tags">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              padding: 6,
              border: '1px solid var(--tn-line2)',
              borderRadius: 5,
              background: 'var(--tn-bg)',
              minHeight: 36,
            }}
          >
            {props.tags.map((t) => (
              <span
                key={t}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  background: 'var(--tn-accent-glow)',
                  color: 'var(--tn-accent)',
                  border: '1px solid var(--tn-accent-dim)',
                  borderRadius: 99,
                  fontFamily: 'var(--tn-mono)',
                  fontSize: 11,
                }}
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: 'inherit',
                    padding: 0,
                    fontSize: 12,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ',') && tagDraft.trim()) {
                  e.preventDefault();
                  addTag(tagDraft);
                }
                if (e.key === 'Backspace' && tagDraft === '' && props.tags.length) {
                  props.onTagsChange(props.tags.slice(0, -1));
                }
              }}
              placeholder={props.tags.length ? '' : 'add tag…'}
              style={{
                flex: 1,
                minWidth: 80,
                background: 'transparent',
                border: 0,
                outline: 'none',
                fontFamily: 'var(--tn-mono)',
                fontSize: 11,
                color: 'var(--tn-ink)',
              }}
            />
          </div>
        </Field>
      </Section>

      <Section title="cover image">
        <CoverPicker
          value={props.coverId}
          url={props.coverUrl}
          onChange={props.onCoverChange}
          compact
        />
      </Section>

      <Section title="seo">
        <Field label="meta description">
          <textarea
            value={props.seoDescription}
            onChange={(e) => props.onSeoDescriptionChange(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              resize: 'vertical',
              background: 'var(--tn-bg)',
              border: '1px solid var(--tn-line2)',
              borderRadius: 5,
              padding: '8px 10px',
              color: 'var(--tn-ink)',
              fontFamily: 'var(--tn-sans)',
              fontSize: 12.5,
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              marginTop: 4,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--tn-mono)',
              fontSize: 10,
              color:
                props.seoDescription.length > 160 ? 'var(--tn-warn)' : 'var(--tn-dim)',
            }}
          >
            <span>recommended ≤ 160</span>
            <span>{props.seoDescription.length}</span>
          </div>
        </Field>
        <SerpPreview
          title={props.title}
          dek={props.seoDescription || props.dek}
          slug={props.slug}
        />
      </Section>

      <Section title="stats">
        <Stat k="words" v={props.wordCount.toLocaleString()} />
        <Stat k="read time" v={`${props.readTime} min`} />
        <Stat k="last edit" v={props.lastSavedLabel} />
      </Section>
    </aside>
  );
}

function catBtnStyle(active: boolean) {
  return {
    flex: 1,
    fontFamily: 'var(--tn-mono)',
    fontSize: 10,
    padding: '6px 0',
    borderRadius: 4,
    background: active ? 'var(--tn-accent-glow)' : 'var(--tn-bg)',
    color: active ? 'var(--tn-accent)' : 'var(--tn-dim)',
    border: `1px solid ${active ? 'var(--tn-accent-dim)' : 'var(--tn-line2)'}`,
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em',
    cursor: 'pointer' as const,
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: 16, borderBottom: '1px solid var(--tn-line)' }}>
      <div
        style={{
          fontFamily: 'var(--tn-mono)',
          fontSize: 10,
          color: 'var(--tn-dim2)',
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--tn-mono)',
          fontSize: 10,
          color: 'var(--tn-dim)',
          marginBottom: 5,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--tn-mono)',
        fontSize: 11.5,
      }}
    >
      <span style={{ color: 'var(--tn-dim)' }}>{k}</span>
      <span style={{ color: 'var(--tn-ink)' }}>{v}</span>
    </div>
  );
}

function SerpPreview({ title, dek, slug }: { title: string; dek: string; slug: string }) {
  return (
    <div
      style={{
        padding: 10,
        background: 'var(--tn-bg)',
        border: '1px solid var(--tn-line2)',
        borderRadius: 5,
        fontFamily: 'var(--tn-sans)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--tn-dim)', marginBottom: 2 }}>
        beaudawson.com › blog › {slug}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--tn-accent)',
          fontWeight: 500,
          marginBottom: 3,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--tn-dim)', lineHeight: 1.4 }}>
        {(dek || '').slice(0, 160)}
      </div>
    </div>
  );
}
