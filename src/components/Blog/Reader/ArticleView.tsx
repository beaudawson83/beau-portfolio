'use client';

import Link from 'next/link';
import { type CSSProperties, type ReactNode, useRef } from 'react';
import type { BlogPost, BlogPostSummary } from '@/types';
import { deriveHeadings, slugifyHeading } from '@/lib/blog-utils';
import {
  BlockRenderer,
  ReadingProgress,
  TableOfContents,
} from '../blocks/Blocks';
import CoverBand from '../CoverBand';
import Topbar from '../Topbar';

export default function ArticleView({
  post,
  prev,
  next,
  theme,
}: {
  post: BlogPost;
  prev: BlogPostSummary | null;
  next: BlogPostSummary | null;
  theme: 'dark' | 'light';
}) {
  const scrollRoot = useRef<HTMLDivElement>(null);
  const headings = deriveHeadings(post.body);

  return (
    <>
      <Topbar
        theme={theme}
        crumb={[
          { text: '~/', href: '/' },
          { text: 'beaudawson', accent: true, href: '/' },
          { text: 'blog', href: '/blog' },
          { text: post.slug, bold: true },
        ]}
      />

      <div
        ref={scrollRoot}
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          background: 'var(--tn-bg)',
        }}
      >
        <ReadingProgress scrollRoot={scrollRoot} />

        {/* Cover band — CoverBand handles the 'none' case (returns null). */}
        {post.coverId ? (
          <div style={{ padding: '32px 48px 0' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <CoverBand coverId={post.coverId} coverUrl={post.coverUrl} />
            </div>
          </div>
        ) : null}

        <header
          style={{
            padding: '48px 48px 32px',
            borderBottom: '1px solid var(--tn-line)',
            position: 'relative',
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div
              style={{
                fontFamily: 'var(--tn-mono)',
                fontSize: 11,
                color: 'var(--tn-dim)',
                display: 'flex',
                gap: 14,
                marginBottom: 18,
                letterSpacing: '.08em',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--tn-accent)' }}>~/blog/{post.slug}.md</span>
              {post.category ? (
                <>
                  <span>·</span>
                  <span>{post.category}</span>
                </>
              ) : null}
              {post.publishAt ? (
                <>
                  <span>·</span>
                  <span>{post.publishAt.slice(0, 10)}</span>
                </>
              ) : null}
              <span>·</span>
              <span>{post.readTime} min</span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--tn-sans)',
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: '-1.8px',
                lineHeight: 1.04,
                margin: '0 0 20px',
                color: 'var(--tn-ink)',
                textWrap: 'balance',
                maxWidth: 900,
              }}
            >
              {post.title}
            </h1>
            {post.dek ? (
              <p
                style={{
                  fontFamily: 'var(--tn-serif)',
                  fontSize: 20,
                  lineHeight: 1.55,
                  color: 'var(--tn-dim)',
                  margin: 0,
                  maxWidth: 720,
                  textWrap: 'pretty',
                }}
              >
                {post.dek}
              </p>
            ) : null}
            {post.tags.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
                {post.tags.map((t) => (
                  <span key={t} className="tn-chip">
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {/* Body grid: TOC | content | meta */}
        <div
          style={{
            maxWidth: 1300,
            margin: '0 auto',
            padding: '40px 48px 80px',
            display: 'grid',
            gridTemplateColumns: '180px 1fr 200px',
            gap: 40,
          }}
        >
          <aside>
            {headings.length > 0 ? (
              <TableOfContents headings={headings} scrollRoot={scrollRoot} />
            ) : null}
          </aside>

          <article className="tn-prose" style={{ minWidth: 0, maxWidth: 680 }}>
            {post.body.map((block) => {
              const headingId =
                block.type === 'h2' || block.type === 'h3'
                  ? slugifyHeading(block.id, block.content)
                  : undefined;
              return <BlockRenderer key={block.id} block={block} headingId={headingId} />;
            })}
          </article>

          <aside
            style={{ fontFamily: 'var(--tn-mono)', fontSize: 11.5, color: 'var(--tn-dim)' }}
          >
            <div style={{ position: 'sticky', top: 24 }}>
              <SidebarHeader>~/meta</SidebarHeader>
              {post.publishAt ? (
                <Meta k="published" v={post.publishAt.slice(0, 10)} />
              ) : null}
              <Meta
                k="status"
                v={<span style={{ color: 'var(--tn-ok)' }}>● {post.status}</span>}
              />
              <Meta k="readtime" v={`${post.readTime} min`} />
              <Meta k="words" v={post.wordCount.toLocaleString()} />
              {post.category ? <Meta k="category" v={post.category} /> : null}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid var(--tn-line)',
                }}
              >
                <SidebarHeader>~/share</SidebarHeader>
                <ShareLinks slug={post.slug} title={post.title} />
              </div>
            </div>
          </aside>
        </div>

        {/* Footer next/prev */}
        {(prev || next) && (
          <footer
            style={{
              borderTop: '1px solid var(--tn-line)',
              padding: '32px 48px',
              background: 'var(--tn-bg2)',
            }}
          >
            <div
              style={{
                maxWidth: 1100,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 24,
              }}
            >
              {prev ? (
                <NavLink href={`/blog/${prev.slug}`} side="left" label="← PREV">
                  {prev.title}
                </NavLink>
              ) : (
                <div />
              )}
              {next ? (
                <NavLink href={`/blog/${next.slug}`} side="right" label="NEXT →">
                  {next.title}
                </NavLink>
              ) : (
                <div />
              )}
            </div>
          </footer>
        )}
      </div>
    </>
  );
}

function Meta({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '5px 0',
        gap: 10,
      }}
    >
      <span style={{ color: 'var(--tn-dim2)' }}>{k}</span>
      <span style={{ color: 'var(--tn-ink)', textAlign: 'right' }}>{v}</span>
    </div>
  );
}

function SidebarHeader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        fontSize: 10,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '1px solid var(--tn-line)',
      }}
    >
      {children}
    </div>
  );
}

function ShareLinks({ slug, title }: { slug: string; title: string }) {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/blog/${slug}` : `/blog/${slug}`;
  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // ignore
    }
  };
  const x = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const mail = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <ShareItem onClick={onCopy}>copy link</ShareItem>
      <ShareItem href={x} target="_blank">post to x</ShareItem>
      <ShareItem href={li} target="_blank">send to linkedin</ShareItem>
      <ShareItem href={mail}>email</ShareItem>
    </div>
  );
}

function ShareItem({
  href,
  onClick,
  target,
  children,
}: {
  href?: string;
  onClick?: () => void;
  target?: string;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    color: 'var(--tn-dim)',
    textDecoration: 'none',
    padding: '5px 0',
    borderBottom: '1px dashed transparent',
    transition: '.15s',
    display: 'block',
    background: 'transparent',
    border: 0,
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    cursor: 'pointer',
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.color = 'var(--tn-accent)';
    e.currentTarget.style.borderColor = 'var(--tn-accent)';
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.color = 'var(--tn-dim)';
    e.currentTarget.style.borderColor = 'transparent';
  };
  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        style={style}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        → {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      → {children}
    </button>
  );
}

function NavLink({
  href,
  side,
  label,
  children,
}: {
  href: string;
  side: 'left' | 'right';
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: 16,
        border: '1px solid var(--tn-line)',
        borderRadius: 6,
        textDecoration: 'none',
        background: 'var(--tn-bg)',
        transition: '.15s',
        textAlign: side === 'right' ? 'right' : 'left',
      }}
    >
      <span
        style={{
          color: 'var(--tn-dim)',
          fontFamily: 'var(--tn-mono)',
          fontSize: 11,
          letterSpacing: '.1em',
        }}
      >
        {label}
      </span>
      <b
        style={{
          display: 'block',
          marginTop: 4,
          fontFamily: 'var(--tn-sans)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--tn-ink)',
        }}
      >
        {children}
      </b>
    </Link>
  );
}
