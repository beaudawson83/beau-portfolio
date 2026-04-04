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
        w-full sm:w-auto px-6 py-3 font-mono text-sm tracking-wider rounded-lg
        transition-all duration-200 text-center
        ${
          isPrimary
            ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] active:scale-[0.98]'
            : 'bg-transparent text-[#7C3AED] border border-[#7C3AED]/40 hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 active:scale-[0.98]'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
