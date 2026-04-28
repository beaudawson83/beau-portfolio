'use client';

import type { ConflictNewsItem } from '@/lib/conflict-data';

interface NewsFeedProps {
  items: ConflictNewsItem[];
  density: 'comfortable' | 'compact';
}

export default function NewsFeed({ items, density }: NewsFeedProps) {
  return (
    <div className="gc-news-list">
      {items.map((item, i) => {
        const hasUrl = item.url && item.url !== '#';
        return (
          <a
            key={item.id}
            href={hasUrl ? item.url : undefined}
            target={hasUrl ? '_blank' : undefined}
            rel={hasUrl ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (!hasUrl) e.preventDefault();
            }}
            className="gc-news-item"
            data-density={density}
            data-first={i === 0 ? 'true' : undefined}
          >
            <span className="gc-news-source">{item.source}</span>
            <span className="gc-news-time">{item.time}</span>
            <span className="gc-news-headline" data-density={density}>
              {item.headline}
            </span>
            <span className="gc-news-region">{item.region} ↗</span>
          </a>
        );
      })}
    </div>
  );
}
