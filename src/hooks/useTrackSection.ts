'use client';

import { useEffect, useRef } from 'react';
import { trackSectionView, isAnalyticsEnabled } from '@/lib/analytics';

/**
 * Hook to track when a section becomes visible in the viewport
 * @param sectionName - The name of the section to track
 * @param threshold - Visibility threshold (0-1), default 0.3 means 30% visible
 */
export function useTrackSection(sectionName: string, threshold: number = 0.3) {
  const hasTracked = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isAnalyticsEnabled() || hasTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            hasTracked.current = true;
            trackSectionView(sectionName);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [sectionName, threshold]);

  return elementRef;
}

/**
 * Hook to track section view using an existing ref
 * @param ref - Existing ref to the element
 * @param sectionName - The name of the section to track
 * @param threshold - Visibility threshold (0-1)
 */
export function useTrackSectionWithRef(
  ref: React.RefObject<HTMLElement | null>,
  sectionName: string,
  threshold: number = 0.3
) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!isAnalyticsEnabled() || hasTracked.current || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            hasTracked.current = true;
            trackSectionView(sectionName);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, sectionName, threshold]);
}
