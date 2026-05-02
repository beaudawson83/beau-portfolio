import Link from 'next/link';
import type { ModuleEntry, ModuleStatus } from '@/types';

export interface ModuleStat {
  key: string;
  value: string;
}

const STATUS_STYLE: Record<ModuleStatus, { color: string; bg: string }> = {
  LIVE:    { color: '#10B981', bg: 'rgba(16, 185, 129, 0.10)' },
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
      className="group block bg-[#1F1F1F] border border-[#2A2A2A] hover:border-[#7C3AED]/60 rounded-lg p-6 transition-colors duration-300"
    >
      {/* Header — name + status pill */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-mono text-sm sm:text-base font-semibold text-white tracking-wide">
          {m.name}
        </h3>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0"
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
      <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">{m.description}</p>

      {/* Telemetry — KEY: value rows in mono */}
      {stats.length > 0 ? (
        <dl className="font-mono text-xs space-y-1 mb-5 pt-4 border-t border-[#2A2A2A]">
          {stats.map((s) => (
            <div key={s.key} className="flex justify-between gap-3">
              <dt className="text-[#94A3B8]">{s.key}</dt>
              <dd className="text-white">{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* CTA */}
      <span className="font-mono text-xs text-[#7C3AED] tracking-wider group-hover:text-[#A78BFA] transition-colors">
        → OPEN
      </span>
    </Link>
  );
}
