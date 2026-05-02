import type { ReactNode } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export interface TopbarCrumb {
  text: string;
  /** When set, the segment becomes a Link to this href. */
  href?: string;
  accent?: boolean;
  bold?: boolean;
}

interface TopbarProps {
  /** Path segments shown in the terminal-style breadcrumb. */
  crumb: TopbarCrumb[];
  /** Buttons / pills to the right of the crumb (before the theme toggle). */
  actions?: ReactNode;
  /** Initial theme — read from cookie by the layout. */
  theme: 'dark' | 'light';
}

const Sep = () => <span style={{ color: 'var(--tn-dim2)' }}>/</span>;

export default function Topbar({ crumb, actions, theme }: TopbarProps) {
  return (
    <div className="tn-topbar">
      <div className="lights">
        <span className="r" />
        <span className="y" />
        <span className="g" />
      </div>
      <div className="crumb">
        {crumb.map((seg, i) => {
          const tail = i < crumb.length - 1 ? <Sep /> : null;
          const inner = seg.accent ? (
            <b className="accent">{seg.text}</b>
          ) : seg.bold ? (
            <b>{seg.text}</b>
          ) : (
            <span>{seg.text}</span>
          );
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {seg.href ? (
                <Link href={seg.href} className="crumb-link">
                  {inner}
                </Link>
              ) : (
                inner
              )}
              {tail}
            </span>
          );
        })}
      </div>
      <div className="actions">
        {actions}
        {actions ? (
          <span
            style={{
              width: 1,
              alignSelf: 'stretch',
              background: 'var(--tn-line)',
              margin: '0 4px',
            }}
          />
        ) : null}
        <ThemeToggle initial={theme} />
      </div>
    </div>
  );
}
