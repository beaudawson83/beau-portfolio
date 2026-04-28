'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}

function CountUp({ value, duration = 1400, format = (n) => n.toLocaleString() }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (value - from) * eased);
      setDisplay(next);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(display)}</>;
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <span style={{ color: '#71717a' }}>—</span>;
  const up = value > 0;
  const arrow = up ? '▲' : '▼';
  const color = up ? 'var(--gc-accent)' : '#5e7a4e';
  return (
    <span
      style={{
        color,
        fontFamily: 'var(--gc-mono)',
        fontSize: 11,
        letterSpacing: '0.04em',
      }}
    >
      {arrow} {Math.abs(value).toLocaleString()}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
  delta?: number;
  deltaLabel?: string;
  big?: boolean;
  format?: (n: number) => string;
}

export default function StatCard({
  label,
  value,
  sub,
  delta,
  deltaLabel,
  big,
  format,
}: StatCardProps) {
  return (
    <div className="gc-stat-card">
      <div className="gc-stat-label">{label}</div>
      <div className="gc-stat-value" style={{ fontSize: big ? 64 : 48 }}>
        <CountUp value={value} format={format} />
      </div>
      <div className="gc-stat-subrow">
        {sub && <span className="gc-stat-sub">{sub}</span>}
        {delta !== undefined && (
          <span className="gc-stat-delta-wrap">
            <Delta value={delta} />
            {deltaLabel && <span className="gc-stat-delta-label">{deltaLabel}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
