'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'circle';
}

export function Skeleton({ className = '', variant = 'default' }: SkeletonProps) {
  const baseClasses = 'bg-[#1A1A1A] rounded overflow-hidden relative';

  const variantClasses = {
    default: 'h-4 w-full',
    card: 'h-48 w-full rounded-lg',
    text: 'h-3 w-3/4',
    circle: 'h-10 w-10 rounded-full',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <Skeleton variant="circle" className="h-6 w-6" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton variant="circle" className="h-2 w-2" />
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] p-4 text-center">
      <Skeleton className="h-2 w-16 mx-auto mb-2" />
      <Skeleton className="h-6 w-20 mx-auto" />
    </div>
  );
}

export function ParticleSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#0D0D0D] flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full mx-auto mb-3"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <span className="font-mono text-xs text-[#94A3B8]">INITIALIZING...</span>
      </div>
    </div>
  );
}
