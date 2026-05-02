'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import './global-conflict.css';

/**
 * Top strip of /global-conflict — sits above the main module.
 *
 * Layout (two columns):
 *   ← back to portfolio                                 beaudawson.com
 *   ● Live · auto-updated daily by Claude               SYNCED Xh Ym ago
 *
 * The blinking dot + live tick of "SYNCED Xh ago" are the only
 * client-side concerns; everything else is static.
 */
export default function GlobalConflictPageHeader({
  lastUpdated,
}: {
  lastUpdated: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const syncedLabel = formatSynced(lastUpdated, now);

  return (
    <div className="gc-page-header">
      <div className="gc-page-header-col">
        <Link href="/" className="gc-page-back">
          ← back to portfolio
        </Link>
        <div className="gc-kicker" style={{ marginBottom: 0 }}>
          <span className="gc-kicker-dot" />
          Live · auto-updated daily by Claude
        </div>
      </div>
      <div className="gc-page-header-col gc-page-header-col-right">
        <span className="gc-page-domain">beaudawson.com</span>
        <span className="gc-page-synced">SYNCED&nbsp;&nbsp;{syncedLabel}</span>
      </div>
    </div>
  );
}

function formatSynced(iso: string | null, now: number): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const seconds = Math.max(0, Math.floor((now - t) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
}
