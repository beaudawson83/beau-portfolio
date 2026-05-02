'use client';

import { useRouter } from 'next/navigation';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  BlogBlock,
  BlogBlockType,
  BlogCategory,
  BlogCoverId,
  BlogPost,
  BlogPostStatus,
} from '@/types';
import { computeReadTime, computeWordCount } from '@/lib/blog-utils';
import Topbar from '../Topbar';
import CoverBand from '../CoverBand';
import { EditBlockRenderer } from './editableBlocks';
import { makeBlock } from './blockKinds';
import SlashMenu from './SlashMenu';
import FloatingToolbar from './FloatingToolbar';
import CommandPalette, { type PaletteCommand } from './CommandPalette';
import PublishModal from './PublishModal';
import Sidebar from './Sidebar';
import { BLOCK_KINDS } from './blockKinds';

const AUTOSAVE_DEBOUNCE_MS = 800;
const CONTAINER_ID = 'tn-builder-area';

interface SlashState {
  blockId: string;
  query: string;
  replace: boolean;
}

interface FloatingState {
  x: number;
  y: number;
}

export default function Editor({
  post: initial,
  secret,
  theme,
}: {
  post: BlogPost;
  secret: string;
  theme: 'dark' | 'light';
}) {
  const router = useRouter();

  // Editor state — this is the source of truth, sync'd to Supabase via PATCH.
  const [title, setTitle] = useState(initial.title);
  const [dek, setDek] = useState(initial.dek);
  // Auto-seed a single empty paragraph for posts with no body — saves the
  // user from clicking "+ start writing" before they can type anything.
  // The autosave skip-first guard means this seed isn't persisted until
  // the user actually edits something.
  const [blocks, setBlocks] = useState<BlogBlock[]>(() =>
    initial.body.length > 0 ? initial.body : [makeBlock('p')],
  );
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [category, setCategory] = useState<BlogCategory | null>(initial.category);
  const [coverId, setCoverId] = useState<BlogCoverId>(initial.coverId);
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.coverUrl);
  const [slug, setSlug] = useState(initial.slug);
  const [seoDesc, setSeoDesc] = useState(initial.seoDescription);
  const [status, setStatus] = useState<BlogPostStatus>(initial.status);
  const [publishAt, setPublishAt] = useState<string | null>(initial.publishAt);

  const [autosave, setAutosave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(Date.now());

  const [slash, setSlash] = useState<SlashState | null>(null);
  const [floating, setFloating] = useState<FloatingState | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Track previous slug — when it changes after a save, we need to update the URL.
  const savedSlugRef = useRef(initial.slug);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const dekRef = useRef<HTMLTextAreaElement>(null);
  const autoSize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };
  useEffect(() => {
    autoSize(titleRef.current);
    autoSize(dekRef.current);
  }, []);

  // ----------------------------------------------------------------
  // Stats
  // ----------------------------------------------------------------
  const stats = useMemo(
    () => ({
      words: computeWordCount(blocks, title, dek),
      read: computeReadTime(blocks, title, dek),
    }),
    [blocks, title, dek],
  );

  // ----------------------------------------------------------------
  // Autosave
  // ----------------------------------------------------------------
  // Pack everything we send to PATCH into one snapshot. The slug isn't
  // included here unless it changed — we use savedSlugRef to detect that.
  const buildPatch = useCallback(() => {
    return {
      title,
      dek,
      body: blocks,
      tags,
      category,
      coverId,
      coverUrl,
      seoDescription: seoDesc,
      // Don't ship slug or status from autosave — those go through explicit
      // user actions (sidebar slug edit, publish modal).
    };
  }, [title, dek, blocks, tags, category, coverId, coverUrl, seoDesc]);

  // Mounted-skip guard — the first effect run after mount shouldn't autosave
  // because nothing has actually changed yet.
  const skipFirstAutosaveRef = useRef(true);

  useEffect(() => {
    if (skipFirstAutosaveRef.current) {
      skipFirstAutosaveRef.current = false;
      return;
    }
    setAutosave('saving');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/blog/posts/${encodeURIComponent(savedSlugRef.current)}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPatch()),
        });
        if (!res.ok) {
          setAutosave('error');
          return;
        }
        setAutosave('saved');
        setLastSavedAt(Date.now());
      } catch {
        setAutosave('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [buildPatch, secret]);

  // ----------------------------------------------------------------
  // Block ops
  // ----------------------------------------------------------------
  const updateBlock = (id: string, patch: Partial<BlogBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as BlogBlock) : b)));

  const insertBlock = (afterId: string, type: BlogBlockType) => {
    const newB = makeBlock(type);
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === afterId);
      const next = [...bs];
      next.splice(i + 1, 0, newB);
      return next;
    });
    setSlash(null);
    setTimeout(() => {
      const el = document.getElementById('block-' + newB.id);
      const inp = el?.querySelector(
        '[contenteditable], input, textarea',
      ) as HTMLElement | null;
      inp?.focus();
    }, 30);
  };

  const replaceBlock = (id: string, type: BlogBlockType) => {
    const fresh = makeBlock(type);
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...fresh, id: b.id } : b)));
    setSlash(null);
  };

  const deleteBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id));

  const moveBlock = (fromId: string, toId: string, after = true) => {
    setBlocks((bs) => {
      const from = bs.findIndex((b) => b.id === fromId);
      if (from < 0 || fromId === toId) return bs;
      const next = [...bs];
      const [moved] = next.splice(from, 1);
      let insertAt = next.findIndex((b) => b.id === toId);
      if (insertAt < 0) return bs;
      if (after) insertAt += 1;
      next.splice(insertAt, 0, moved);
      return next;
    });
  };

  // ----------------------------------------------------------------
  // Selection → floating toolbar
  // ----------------------------------------------------------------
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setFloating(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const node = range.startContainer.parentElement;
      if (!node || !node.closest('[data-editable]')) {
        setFloating(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const containerRect = document.getElementById(CONTAINER_ID)?.getBoundingClientRect();
      const containerEl = document.getElementById(CONTAINER_ID);
      if (!containerRect || !containerEl) return;
      setFloating({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 44 + containerEl.scrollTop,
      });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  // ----------------------------------------------------------------
  // ⌘K hotkey (the layout doesn't wrap this — handle it here)
  // ----------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setStatus('draft');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ----------------------------------------------------------------
  // Slug change — explicit save endpoint
  // ----------------------------------------------------------------
  const onSlugChange = (next: string) => {
    setSlug(next);
  };

  const commitSlug = useCallback(async () => {
    if (slug === savedSlugRef.current) return;
    try {
      const res = await fetch(
        `/api/blog/posts/${encodeURIComponent(savedSlugRef.current)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slug }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const newSlug = data.post?.slug ?? slug;
        savedSlugRef.current = newSlug;
        setSlug(newSlug);
        router.replace(`/blog/edit/${encodeURIComponent(newSlug)}`);
      }
    } catch {
      // ignore — autosave indicator will show error elsewhere
    }
  }, [slug, secret, router]);

  // ----------------------------------------------------------------
  // Publish action — calls PATCH with the requested status + publishAt
  // ----------------------------------------------------------------
  const onConfirmPublish = async (next: { status: BlogPostStatus; publishAt: string | null }) => {
    setPublishing(true);
    try {
      const res = await fetch(
        `/api/blog/posts/${encodeURIComponent(savedSlugRef.current)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: next.status, publishAt: next.publishAt }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setStatus(data.post.status);
          setPublishAt(data.post.publishAt);
        }
        setShowPublishModal(false);
      }
    } finally {
      setPublishing(false);
    }
  };

  // ----------------------------------------------------------------
  // ⌘K palette commands
  // ----------------------------------------------------------------
  const paletteCmds: PaletteCommand[] = [
    {
      label: 'Open in Reader (preview)',
      kbd: '↗',
      do: () => window.open(`/blog/preview/${encodeURIComponent(savedSlugRef.current)}`, '_blank'),
    },
    { label: 'Publish post…', kbd: '⌘P', do: () => setShowPublishModal(true) },
    { label: 'Save as draft', kbd: '⌘S', do: () => setStatus('draft') },
    ...BLOCK_KINDS.map((b) => ({
      label: 'Insert ' + b.label,
      kbd: '/' + b.type,
      do: () => {
        const lastId = blocks[blocks.length - 1]?.id;
        if (lastId) insertBlock(lastId, b.type);
      },
    })),
  ];

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const lastSavedLabel = autosave === 'saving' ? 'saving…' : 'just now';

  return (
    <>
      <Topbar
        theme={theme}
        crumb={[
          { text: '~/', href: '/' },
          { text: 'beaudawson', accent: true, href: '/' },
          { text: 'blog', href: '/blog' },
          { text: 'drafts', accent: true, href: '/blog/edit' },
          { text: `${slug}.md`, bold: true },
        ]}
        actions={
          <>
            <button
              type="button"
              className="iconbtn"
              onClick={() => setPaletteOpen(true)}
              title="Command palette"
            >
              ⌘K <span className="kbd">⌘K</span>
            </button>
          </>
        }
      />

      <div
        id={CONTAINER_ID}
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          position: 'relative',
          background: 'var(--tn-bg)',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {/* Status strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 56px',
              borderBottom: '1px solid var(--tn-line)',
              background: 'var(--tn-bg2)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              fontFamily: 'var(--tn-mono)',
              fontSize: 11.5,
              color: 'var(--tn-dim)',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background:
                      autosave === 'saving'
                        ? 'var(--tn-warn)'
                        : autosave === 'error'
                          ? 'var(--tn-err)'
                          : 'var(--tn-ok)',
                  }}
                  className={autosave === 'saving' ? 'tn-pulse' : ''}
                />
                {autosave === 'saving'
                  ? 'saving…'
                  : autosave === 'error'
                    ? 'error saving'
                    : lastSavedAt
                      ? `saved · ${relTime(lastSavedAt)}`
                      : 'idle'}
              </span>
              <span>·</span>
              <span>
                <b style={{ color: 'var(--tn-ink)', fontWeight: 500 }}>{stats.words}</b> words
              </span>
              <span>·</span>
              <span>
                <b style={{ color: 'var(--tn-ink)', fontWeight: 500 }}>{stats.read}</b> min read
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                className={`tn-chip ${
                  status === 'published' ? 'ok' : status === 'scheduled' ? 'warn' : ''
                }`}
              >
                ● {status}
              </span>
              <button
                type="button"
                className="tn-btn sm"
                onClick={() => window.open(`/blog/preview/${encodeURIComponent(savedSlugRef.current)}`, '_blank')}
              >
                preview ↗
              </button>
              <button
                type="button"
                className="tn-btn sm pri"
                onClick={() => setShowPublishModal(true)}
              >
                publish →
              </button>
            </div>
          </div>

          {/* Cover band — same component the article view uses, so the
              editor stays WYSIWYG. CoverBand returns null for 'none', so
              we render a dashed placeholder with the sidebar hint instead. */}
          <div style={{ padding: '32px 56px 0' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
              {coverId === 'none' ? (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4/1',
                    borderRadius: 6,
                    border: '1px dashed var(--tn-line2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--tn-dim)',
                    fontFamily: 'var(--tn-mono)',
                    fontSize: 11,
                    letterSpacing: '.08em',
                  }}
                >
                  no cover · pick one in the sidebar →
                </div>
              ) : (
                <>
                  <CoverBand coverId={coverId} coverUrl={coverUrl} />
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
                    cover · edit in sidebar →
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Title + dek */}
          <div style={{ padding: '24px 56px 8px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  autoSize(e.target);
                }}
                onInput={(e) => autoSize(e.currentTarget)}
                placeholder="Title"
                rows={1}
                style={{
                  width: '100%',
                  resize: 'none',
                  overflow: 'hidden',
                  fontFamily: 'var(--tn-sans)',
                  fontSize: 50,
                  fontWeight: 800,
                  letterSpacing: '-1.7px',
                  lineHeight: 1.05,
                  background: 'transparent',
                  border: 0,
                  color: 'var(--tn-ink)',
                  outline: 'none',
                  padding: 0,
                  marginBottom: 14,
                }}
              />
              <textarea
                ref={dekRef}
                value={dek}
                onChange={(e) => {
                  setDek(e.target.value);
                  autoSize(e.target);
                }}
                onInput={(e) => autoSize(e.currentTarget)}
                placeholder="Subtitle — one sentence."
                rows={2}
                style={{
                  width: '100%',
                  resize: 'none',
                  overflow: 'hidden',
                  fontFamily: 'var(--tn-serif)',
                  fontSize: 19,
                  lineHeight: 1.5,
                  background: 'transparent',
                  border: 0,
                  color: 'var(--tn-dim)',
                  outline: 'none',
                  padding: 0,
                  marginBottom: 32,
                }}
              />
            </div>
          </div>

          {/* Blocks */}
          <div style={{ padding: '0 56px 200px' }}>
            <div className="tn-prose" style={{ maxWidth: 720, margin: '0 auto' }}>
              {blocks.map((b) => (
                <BlockRow
                  key={b.id}
                  block={b}
                  isHover={hoverId === b.id}
                  isDragOver={dragOver === b.id}
                  onHover={() => setHoverId(b.id)}
                  onLeave={() => setHoverId((h) => (h === b.id ? null : h))}
                  onUpdate={(patch) => updateBlock(b.id, patch)}
                  onSlash={(query) =>
                    setSlash({ blockId: b.id, query, replace: query !== '' })
                  }
                  onDragStart={() => setDragId(b.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOver(null);
                  }}
                  onDragOver={() => {
                    if (dragId && dragId !== b.id) setDragOver(b.id);
                  }}
                  onDrop={() => {
                    if (dragId && dragId !== b.id) moveBlock(dragId, b.id, true);
                  }}
                  onEnterAfter={() => insertBlock(b.id, 'p')}
                  onBackspaceAtStart={() => {
                    if (blocks.length > 1) {
                      const idx = blocks.findIndex((x) => x.id === b.id);
                      deleteBlock(b.id);
                      setTimeout(() => {
                        const prev = blocks[idx - 1];
                        if (prev) {
                          (
                            document
                              .getElementById('block-' + prev.id)
                              ?.querySelector('[contenteditable]') as HTMLElement | null
                          )?.focus();
                        }
                      }, 0);
                    }
                  }}
                  onDelete={() => deleteBlock(b.id)}
                />
              ))}
              {blocks.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setBlocks([makeBlock('p')])}
                  style={{
                    fontFamily: 'var(--tn-mono)',
                    color: 'var(--tn-dim)',
                    background: 'transparent',
                    border: '1px dashed var(--tn-line2)',
                    padding: 16,
                    borderRadius: 6,
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  + start writing
                </button>
              ) : null}
            </div>
          </div>

          {/* Floating toolbar */}
          {floating ? <FloatingToolbar x={floating.x} y={floating.y} /> : null}

          {/* Slash menu */}
          {slash ? (
            <SlashMenu
              anchorBlockId={slash.blockId}
              query={slash.query}
              replace={slash.replace}
              containerId={CONTAINER_ID}
              onPick={(type) =>
                slash.replace ? replaceBlock(slash.blockId, type) : insertBlock(slash.blockId, type)
              }
              onClose={() => setSlash(null)}
            />
          ) : null}
        </div>

        {/* Right sidebar */}
        <Sidebar
          slug={slug}
          status={status}
          category={category}
          tags={tags}
          coverId={coverId}
          coverUrl={coverUrl}
          seoDescription={seoDesc}
          title={title}
          dek={dek}
          wordCount={stats.words}
          readTime={stats.read}
          lastSavedLabel={lastSavedLabel}
          onSlugChange={onSlugChange}
          onStatusChange={(next) => {
            // Status changes via the sidebar only set draft locally — actual
            // publishing/scheduling routes through the modal. Keep things
            // consistent by routing all transitions through the modal when
            // moving away from draft.
            if (next === 'draft') {
              setStatus('draft');
              void onConfirmPublish({ status: 'draft', publishAt: null });
            } else {
              setShowPublishModal(true);
            }
          }}
          onCategoryChange={setCategory}
          onTagsChange={setTags}
          onCoverChange={(next) => {
            setCoverId(next.coverId);
            if (next.coverUrl !== undefined) setCoverUrl(next.coverUrl);
          }}
          onSeoDescriptionChange={setSeoDesc}
        />

        {/* ⌘K palette */}
        {paletteOpen ? (
          <CommandPalette commands={paletteCmds} onClose={() => setPaletteOpen(false)} />
        ) : null}

        {/* Publish modal */}
        {showPublishModal ? (
          <PublishModal
            initialStatus={status}
            initialPublishAt={publishAt}
            pending={publishing}
            onConfirm={onConfirmPublish}
            onClose={() => setShowPublishModal(false)}
          />
        ) : null}
      </div>

      {/* Slug commit on outside click — uses a top-level effect via blur of slug input.
          We trigger commitSlug whenever the slug input loses focus. The Sidebar's input
          doesn't have onBlur wired through the prop API, so we rely on the user
          pressing Enter/click-outside. For now, also commit on every render where slug
          differs and 1.5s have passed since last edit. */}
      <SlugCommitter
        slug={slug}
        savedSlugRef={savedSlugRef}
        onCommit={commitSlug}
      />
    </>
  );
}

function relTime(then: number): string {
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ---------------------------------------------------------------------------
// SLUG COMMITTER — debounced slug-change persistence.
// ---------------------------------------------------------------------------
function SlugCommitter({
  slug,
  savedSlugRef,
  onCommit,
}: {
  slug: string;
  savedSlugRef: React.RefObject<string>;
  onCommit: () => void;
}) {
  useEffect(() => {
    if (slug === savedSlugRef.current) return;
    const t = setTimeout(() => {
      onCommit();
    }, 1500);
    return () => clearTimeout(t);
  }, [slug, savedSlugRef, onCommit]);
  return null;
}

// ---------------------------------------------------------------------------
// BLOCK ROW — wraps each editable block with hover handles + drag indicator.
// ---------------------------------------------------------------------------
function BlockRow({
  block,
  isHover,
  isDragOver,
  onHover,
  onLeave,
  onUpdate,
  onSlash,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEnterAfter,
  onBackspaceAtStart,
  onDelete,
}: {
  block: BlogBlock;
  isHover: boolean;
  isDragOver: boolean;
  onHover: () => void;
  onLeave: () => void;
  onUpdate: (patch: Partial<BlogBlock>) => void;
  onSlash: (query: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onEnterAfter: () => void;
  onBackspaceAtStart: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      id={'block-' + block.id}
      className="tn-block-row"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={(e) => {
        // Click in the gutter or below the contenteditable: focus the
        // editable inside. Clicks on actual interactive children (buttons,
        // inputs, the editable itself) bubble normally.
        if (e.target !== e.currentTarget) return;
        const editable = e.currentTarget.querySelector<HTMLElement>('[data-editable]');
        editable?.focus();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      style={{ position: 'relative', marginLeft: -84, paddingLeft: 84 }}
    >
      {/* Hover handles sit in the 84px gutter (3×22px + 2×4px gap = 74px,
          ~10px breathing room) so they never overlap the editable. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 4,
          opacity: isHover ? 1 : 0,
          transition: 'opacity .12s',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <HandleBtn title="Add block below" onClick={() => onSlash('')}>
          +
        </HandleBtn>
        <HandleBtn
          title="Drag to reorder"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          style={{ cursor: 'grab' }}
        >
          ⋮⋮
        </HandleBtn>
        <HandleBtn title="Delete block" onClick={onDelete}>
          ×
        </HandleBtn>
      </div>

      {/* Drop indicator */}
      {isDragOver ? (
        <div
          style={{
            position: 'absolute',
            left: 36,
            right: 0,
            bottom: -2,
            height: 2,
            background: 'var(--tn-accent)',
            borderRadius: 99,
          }}
        />
      ) : null}

      <EditBlockRenderer
        block={block}
        onUpdate={onUpdate}
        onEnter={onEnterAfter}
        onBackspaceAtStart={onBackspaceAtStart}
        onSlash={(_, q) => onSlash(q)}
      />
    </div>
  );
}

const handleBtnStyle: CSSProperties = {
  width: 22,
  height: 22,
  padding: 0,
  background: 'transparent',
  border: 0,
  color: 'var(--tn-dim)',
  fontFamily: 'var(--tn-mono)',
  fontSize: 14,
  lineHeight: 1,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

function HandleBtn({
  children,
  style,
  ...rest
}: {
  children: ReactNode;
  style?: CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" style={{ ...handleBtnStyle, ...style }} {...rest}>
      {children}
    </button>
  );
}
