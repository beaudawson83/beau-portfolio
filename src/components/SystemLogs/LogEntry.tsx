'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { SystemLogPreview } from '@/types/blog';
import StatusBadge from './StatusBadge';

interface LogEntryProps {
  post: SystemLogPreview;
  index: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0].replace(/-/g, '.');
}

export default function LogEntry({ post, index }: LogEntryProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{
        borderColor: 'rgba(124, 58, 237, 0.5)',
        boxShadow: '0 0 20px rgba(124, 58, 237, 0.1)',
      }}
      className="relative border border-[#1F1F1F] p-4 md:p-6 bg-[#111111] transition-colors"
    >
      <Link href={`/system-logs/${post.slug}`} className="block">
        {/* Timestamp and Entry ID */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-mono text-xs text-[#94A3B8]">
            [{formatDate(post.publishedDate)}]
          </span>
          <span className="text-[#7C3AED] font-mono text-xs">{'//'}</span>
          <span className="font-mono text-xs text-white">{post.entryId}:</span>
          <StatusBadge status={post.status} />
        </div>

        {/* Title */}
        <h2 className="font-mono text-lg md:text-xl text-white mb-3 hover:text-[#7C3AED] transition-colors">
          {post.title}
        </h2>

        {/* Executive Summary */}
        <p className="text-[#94A3B8] text-sm leading-relaxed mb-4 line-clamp-2">
          {post.executiveSummary}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[10px] text-[#7C3AED]/70 uppercase"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Hover indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute bottom-4 right-4 font-mono text-xs text-[#7C3AED]/50"
        >
          [ READ_MORE → ]
        </motion.div>
      </Link>
    </motion.article>
  );
}
