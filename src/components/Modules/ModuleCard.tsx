import Link from 'next/link';
import type { ModuleEntry, ModuleStatus } from '@/types';

export interface ModuleStat {
  key: string;
  value: string;
}

const STATUS_STYLE: Record<ModuleStatus, { color: string; bg: string }> = {
  LIVE:    { color: '#34D399', bg: 'rgba(52, 211, 153, 0.10)' },
  BETA:    { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.10)' },
  PLANNED: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.10)' },
};

export default function ModuleCard({
  module: m,
  stats,
}: {
  module: ModuleEntry;
  stats: ModuleStat[];
}) {
  const status = STATUS_STYLE[m.status];

  return (
    <Link
      href={m.href}
      className="group ui-card ui-card-hover flex h-full flex-col p-6 sm:p-8"
    >
      {/* Header — name + status pill */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-semibold tracking-[0.01em] text-ink">
          {m.name}
        </h3>
        <span
          className="text-[11px] font-medium lowercase first-letter:uppercase px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0"
          style={{
            color: status.color,
            backgroundColor: status.bg,
            borderColor: status.color + '40',
          }}
        >
          {m.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm sm:text-[0.95rem] text-muted leading-relaxed mb-6">{m.description}</p>

      {/* Telemetry — KEY: value rows in mono */}
      {stats.length > 0 ? (
        <dl className="text-sm space-y-2 mb-6 pt-5 border-t border-line">
          {stats.map((s) => (
            <div key={s.key} className="flex justify-between gap-3">
              <dt className="text-faint lowercase first-letter:uppercase">{s.key}</dt>
              <dd className="text-ink tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* CTA */}
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent-bright">
        Open
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
