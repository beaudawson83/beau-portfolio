import type { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';

export interface TopbarCrumb {
  text: string;
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
          if (seg.accent) {
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <b className="accent">{seg.text}</b>
                {tail}
              </span>
            );
          }
          if (seg.bold) {
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <b>{seg.text}</b>
                {tail}
              </span>
            );
          }
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{seg.text}</span>
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
