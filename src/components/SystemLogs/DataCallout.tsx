'use client';

type CalloutType = 'INFO' | 'WARNING' | 'SUCCESS' | 'METRIC' | 'CODE';

interface DataCalloutProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const typeStyles: Record<CalloutType, string> = {
  INFO: 'border-[#7C3AED] bg-[#7C3AED]/5',
  WARNING: 'border-yellow-500 bg-yellow-500/5',
  SUCCESS: 'border-green-500 bg-green-500/5',
  METRIC: 'border-[#7C3AED] bg-[#1F1F1F]',
  CODE: 'border-[#94A3B8] bg-[#0a0a0a]',
};

const typeLabels: Record<CalloutType, string> = {
  INFO: 'SYSTEM_INFO',
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS',
  METRIC: 'METRIC',
  CODE: 'CODE_BLOCK',
};

export default function DataCallout({ type, title, children }: DataCalloutProps) {
  return (
    <div className={`my-6 p-4 border font-mono ${typeStyles[type]}`}>
      <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-2">
        [ {typeLabels[type]} ]
      </div>

      {title && (
        <div className="text-white text-sm mb-2 font-semibold">{title}</div>
      )}

      <div className="text-[#94A3B8] text-sm leading-relaxed">{children}</div>
    </div>
  );
}
