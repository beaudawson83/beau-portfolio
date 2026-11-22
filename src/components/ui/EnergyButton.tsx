'use client';

interface EnergyButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  className?: string;
}

export default function EnergyButton({
  children,
  variant = 'primary',
  onClick,
  className = '',
}: EnergyButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      className={`
        w-full sm:w-auto px-6 py-3 text-sm font-medium rounded-full
        transition-all duration-300 text-center active:scale-[0.98]
        ${
          isPrimary
            ? 'bg-gradient-to-b from-accent-bright to-accent-deep text-white shadow-[0_10px_30px_-10px_rgb(139_92_246/0.8),inset_0_1px_0_rgb(255_255_255/0.25)] hover:shadow-[0_14px_40px_-8px_rgb(139_92_246/0.95),inset_0_1px_0_rgb(255_255_255/0.25)] hover:-translate-y-0.5'
            : 'bg-white/[0.04] text-ink border border-line-strong hover:bg-white/[0.08] hover:border-accent-bright/50 hover:-translate-y-0.5'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
