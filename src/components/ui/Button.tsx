'use client';

import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', children, className = '', ...props }, ref) => {
    const baseStyles =
      'font-mono text-sm tracking-wider transition-all duration-200 cursor-pointer';

    const variants = {
      primary:
        'bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 border border-[#7C3AED] hover:border-[#6D28D9]',
      secondary:
        'bg-transparent hover:bg-[#1F1F1F] text-white px-6 py-3 border border-[#94A3B8] hover:border-white',
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
