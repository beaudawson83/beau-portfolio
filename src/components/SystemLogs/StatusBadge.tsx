'use client';

import type { PostStatus } from '@/types/blog';

interface StatusBadgeProps {
  status: PostStatus;
}

const statusStyles: Record<PostStatus, string> = {
  DRAFT: 'border-yellow-500/50 text-yellow-500',
  DEPLOYED: 'border-green-500/50 text-green-500',
  ARCHIVED: 'border-[#94A3B8]/50 text-[#94A3B8]',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-block font-mono text-[10px] uppercase tracking-wider
        px-2 py-0.5 border ${statusStyles[status]}
      `}
    >
      STATUS: {status}
    </span>
  );
}
