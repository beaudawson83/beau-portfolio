'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import type { PostTag } from '@/types/blog';
import { POST_TAG_LABELS } from '@/types/blog';

interface TagFilterProps {
  activeTag?: string;
}

const AVAILABLE_TAGS: PostTag[] = [
  'AI_STRATEGY',
  'OPS_EFFICIENCY',
  'FRACTIONAL_INSIGHTS',
  'AUTOMATION',
  'CRM_ARCHITECTURE',
  'LEADERSHIP',
];

export default function TagFilter({ activeTag }: TagFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTagClick = (tag: PostTag | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (tag === null) {
      params.delete('tag');
    } else {
      params.set('tag', tag);
    }

    const queryString = params.toString();
    router.push(queryString ? `/system-logs?${queryString}` : '/system-logs');
  };

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {/* All filter */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleTagClick(null)}
        className={`
          font-mono text-xs px-3 py-1.5 border transition-colors
          ${
            !activeTag
              ? 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/10'
              : 'border-[#1F1F1F] text-[#94A3B8] hover:border-[#7C3AED]/50 hover:text-white'
          }
        `}
      >
        {'>'} ALL_LOGS
      </motion.button>

      {/* Tag filters */}
      {AVAILABLE_TAGS.map((tag) => (
        <motion.button
          key={tag}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleTagClick(tag)}
          className={`
            font-mono text-xs px-3 py-1.5 border transition-colors
            ${
              activeTag === tag
                ? 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/10'
                : 'border-[#1F1F1F] text-[#94A3B8] hover:border-[#7C3AED]/50 hover:text-white'
            }
          `}
        >
          {'>'} {POST_TAG_LABELS[tag].toUpperCase().replace(/ /g, '_')}
        </motion.button>
      ))}
    </div>
  );
}
