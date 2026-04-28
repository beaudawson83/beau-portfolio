'use client';

import { useMemo } from 'react';

interface SparklineProps {
  seed: string;
}

function generateBars(seed: string): number[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i);
  const out: number[] = [];
  for (let i = 0; i < 7; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(0.25 + (s / 233280) * 0.75);
  }
  return out;
}

export default function Sparkline({ seed }: SparklineProps) {
  const bars = useMemo(() => generateBars(seed), [seed]);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
        height: 50,
        marginTop: 10,
      }}
    >
      {bars.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${v * 100}%`,
            background: 'var(--gc-accent)',
            opacity: 0.4 + v * 0.5,
          }}
        />
      ))}
    </div>
  );
}
