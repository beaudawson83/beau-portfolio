'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { SystemLog } from '@/types/blog';
import NavigationButtons from './NavigationButtons';
import StatusBadge from './StatusBadge';
import RichTextRenderer from './RichTextRenderer';
import NewsletterCapture from './NewsletterCapture';

interface LogArticleProps {
  post: SystemLog;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0].replace(/-/g, '.');
}

export default function LogArticle({ post }: LogArticleProps) {
  // Track view
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: post.slug }),
    }).catch(() => {
      // Silently fail analytics
    });
  }, [post.slug]);

  return (
    <main className="min-h-screen py-20 px-6">
      <article className="max-w-[700px] mx-auto">
        {/* Navigation */}
        <NavigationButtons variant="both" />

        {/* Article Header */}
        <header className="mt-8 mb-12">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="font-mono text-xs text-[#94A3B8]">
              [{formatDate(post.publishedDate)}]
            </span>
            <span className="text-[#7C3AED] font-mono text-xs">{'//'}</span>
            <span className="font-mono text-xs text-white">{post.entryId}</span>
            <StatusBadge status={post.status} />
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-2xl md:text-3xl text-white mb-6 leading-tight"
          >
            {post.title}
          </motion.h1>

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
        </header>

        {/* Executive Summary */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 p-4 border border-[#7C3AED]/30 bg-[#7C3AED]/5"
        >
          <div className="font-mono text-[10px] text-[#7C3AED] uppercase tracking-wider mb-2">
            [ EXECUTIVE_SUMMARY ]
          </div>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            {post.executiveSummary}
          </p>
        </motion.section>

        {/* Bottleneck Identified */}
        {post.bottleneckIdentified && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8 p-4 border border-yellow-500/30 bg-yellow-500/5"
          >
            <div className="font-mono text-[10px] text-yellow-500 uppercase tracking-wider mb-2">
              [ BOTTLENECK_IDENTIFIED ]
            </div>
            <p className="text-[#94A3B8] text-sm leading-relaxed">
              {post.bottleneckIdentified}
            </p>
          </motion.section>
        )}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="prose-terminal"
          style={{ lineHeight: 1.6 }}
        >
          <RichTextRenderer content={post.body} />
        </motion.div>

        {/* Recommended Architecture */}
        {post.recommendedArchitecture && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 border border-green-500/30 bg-green-500/5"
          >
            <div className="font-mono text-[10px] text-green-500 uppercase tracking-wider mb-2">
              [ RECOMMENDED_ARCHITECTURE ]
            </div>
            <p className="text-[#94A3B8] text-sm leading-relaxed whitespace-pre-wrap">
              {post.recommendedArchitecture}
            </p>
          </motion.section>
        )}

        {/* Footer Divider */}
        <div className="mt-12 font-mono text-xs text-[#94A3B8]/30">
          {'─'.repeat(50)}
        </div>

        {/* Newsletter */}
        <NewsletterCapture />

        {/* Back Navigation */}
        <div className="mt-12 text-center">
          <NavigationButtons variant="back" />
        </div>
      </article>
    </main>
  );
}
