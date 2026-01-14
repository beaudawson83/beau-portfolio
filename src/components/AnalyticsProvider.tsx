'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  trackScrollDepth,
  trackTimeOnPage,
  trackSessionStart,
  trackDeviceInfo,
  trackVisibilityChange,
  trackTextCopy,
  trackEngagementMilestone,
  isAnalyticsEnabled,
} from '@/lib/analytics';

// Scroll depth thresholds to track
const SCROLL_THRESHOLDS = [25, 50, 75, 90, 100];

export default function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionStartTime = useRef<number>(Date.now());
  const trackedScrollDepths = useRef<Set<number>>(new Set());
  const hiddenTimestamp = useRef<number | null>(null);
  const interactionCount = useRef<number>(0);
  const lastEngagementMilestone = useRef<string | null>(null);

  // Track session start and device info
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    trackSessionStart();
    trackDeviceInfo();
  }, []);

  // Track scroll depth
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      SCROLL_THRESHOLDS.forEach((threshold) => {
        if (scrollPercent >= threshold && !trackedScrollDepths.current.has(threshold)) {
          trackedScrollDepths.current.add(threshold);
          trackScrollDepth(threshold, window.location.pathname);
        }
      });
    };

    // Throttle scroll events
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  // Track time on page when user leaves
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - sessionStartTime.current) / 1000);
      trackTimeOnPage(timeOnPage, window.location.pathname);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Track page visibility changes
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimestamp.current = Date.now();
        trackVisibilityChange(false);
      } else {
        const timeHidden = hiddenTimestamp.current
          ? Math.round((Date.now() - hiddenTimestamp.current) / 1000)
          : undefined;
        trackVisibilityChange(true, timeHidden);
        hiddenTimestamp.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track text copy events
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection) {
        const copiedText = selection.toString();
        if (copiedText.length > 0) {
          // Determine location based on what element contains the selection
          const anchorNode = selection.anchorNode;
          const parentElement = anchorNode?.parentElement;
          const section = parentElement?.closest('section');
          const location = section?.id || 'unknown';
          trackTextCopy(copiedText, location);
        }
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  // Track engagement milestones based on interactions
  const trackInteraction = useCallback(() => {
    if (!isAnalyticsEnabled()) return;

    interactionCount.current += 1;
    const count = interactionCount.current;

    let milestone: 'low' | 'medium' | 'high' | 'very_high' | null = null;

    if (count >= 20 && lastEngagementMilestone.current !== 'very_high') {
      milestone = 'very_high';
    } else if (count >= 10 && lastEngagementMilestone.current !== 'high' && lastEngagementMilestone.current !== 'very_high') {
      milestone = 'high';
    } else if (count >= 5 && !lastEngagementMilestone.current) {
      milestone = 'medium';
    } else if (count >= 2 && !lastEngagementMilestone.current) {
      milestone = 'low';
    }

    if (milestone) {
      lastEngagementMilestone.current = milestone;
      trackEngagementMilestone(milestone, count);
    }
  }, []);

  // Track clicks for engagement
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const handleClick = () => {
      trackInteraction();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [trackInteraction]);

  // Track window resize (device orientation changes)
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        trackDeviceInfo();
      }, 500);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return <>{children}</>;
}
