'use client';

import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', children, className = '', ...props }, ref) => {
    const baseStyles =
      'text-sm font-medium rounded-full transition-all duration-300 cursor-pointer';

    const variants = {
      primary:
        'bg-accent hover:bg-accent-deep text-white px-6 py-3 border border-accent hover:border-accent-deep',
      secondary:
        'bg-white/[0.04] hover:bg-white/[0.08] text-ink px-6 py-3 border border-line-strong hover:border-accent-bright/50',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
