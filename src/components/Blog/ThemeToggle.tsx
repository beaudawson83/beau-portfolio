'use client';

import { useState } from 'react';

const THEME_COOKIE = 'tn-theme';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type Theme = 'dark' | 'light';

export default function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    // Walk up to the closest .tn-shell and flip its data attribute so the
    // theme change is immediate (no full reload needed).
    const shell = document.querySelector<HTMLElement>('.tn-shell');
    if (shell) shell.dataset.tnTheme = next;
  };

  return (
    <button
      type="button"
      className="iconbtn"
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  );
}
