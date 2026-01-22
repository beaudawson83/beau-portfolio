'use client';

import type { SystemLogPreview } from '@/types/blog';
import TagFilter from './TagFilter';
import LogEntry from './LogEntry';

interface LogDirectoryProps {
  posts: SystemLogPreview[];
  activeTag?: string;
}

export default function LogDirectory({ posts, activeTag }: LogDirectoryProps) {
  return (
    <div>
      {/* Tag Filters */}
      <TagFilter activeTag={activeTag} />

      {/* Posts List */}
      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <LogEntry key={post.id} post={post} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="font-mono text-[#94A3B8]">
            [ NO_ENTRIES_FOUND ]
          </p>
          <p className="font-mono text-xs text-[#94A3B8]/50 mt-2">
            {activeTag
              ? `No logs matching filter: ${activeTag}`
              : 'No published logs available'}
          </p>
        </div>
      )}
    </div>
  );
}
