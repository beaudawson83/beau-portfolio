'use client';

interface SparklineProps {
  data: number[];
}

export default function Sparkline({ data }: SparklineProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          height: 50,
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--gc-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          color: '#52525b',
          textTransform: 'uppercase' as const,
        }}
      >
        Trend data not yet available
      </div>
    );
  }

  const max = Math.max(...data, 1);
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
      {data.map((v, i) => {
        const ratio = v / max;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(ratio * 100, 4)}%`,
              background: 'var(--gc-accent)',
              opacity: 0.4 + ratio * 0.5,
            }}
          />
        );
      })}
    </div>
  );
}
