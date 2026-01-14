// Google Analytics 4 Utility Library
// Comprehensive tracking for page views, events, and user interactions

// Fallback to hardcoded ID if env var is not available at build time
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-CHK1H7XQV3';

// Type definitions for gtag
type GTagEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
  // Allow additional custom parameters
  [key: string]: string | number | boolean | undefined;
};

// Declare gtag on window
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}

// Check if analytics is available (check for gtag function on window)
export const isAnalyticsEnabled = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

// Track page views
export const pageview = (url: string): void => {
  if (!isAnalyticsEnabled()) return;

  window.gtag('config', GA_MEASUREMENT_ID!, {
    page_path: url,
  });
};

// Track custom events
export const event = ({ action, category, label, value, ...params }: GTagEvent): void => {
  if (!isAnalyticsEnabled()) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...params,
  });
};

// ============================================
// Pre-defined Event Tracking Functions
// ============================================

// Contact Form Events
export const trackContactFormStart = (): void => {
  event({
    action: 'form_start',
    category: 'Contact',
    label: 'Contact Form Started',
  });
};

export const trackContactFormSubmit = (objective: string): void => {
  event({
    action: 'form_submit',
    category: 'Contact',
    label: `Contact Form Submitted - ${objective}`,
    contact_objective: objective,
  });
};

export const trackContactFormSuccess = (objective: string): void => {
  event({
    action: 'generate_lead',
    category: 'Contact',
    label: `Contact Form Success - ${objective}`,
    contact_objective: objective,
  });
};

export const trackContactFormError = (objective: string): void => {
  event({
    action: 'form_error',
    category: 'Contact',
    label: `Contact Form Error - ${objective}`,
    contact_objective: objective,
  });
};

// Navigation Events
export const trackNavClick = (destination: string): void => {
  event({
    action: 'navigation_click',
    category: 'Navigation',
    label: destination,
  });
};

// Social Link Events
export const trackSocialClick = (platform: string, url: string): void => {
  event({
    action: 'social_click',
    category: 'Social',
    label: platform,
    link_url: url,
  });
};

// Section Visibility Events (for scroll tracking)
export const trackSectionView = (sectionName: string): void => {
  event({
    action: 'section_view',
    category: 'Engagement',
    label: sectionName,
  });
};

// CTA Button Clicks
export const trackCTAClick = (ctaName: string, location: string): void => {
  event({
    action: 'cta_click',
    category: 'CTA',
    label: ctaName,
    cta_location: location,
  });
};

// External Link Clicks
export const trackExternalLink = (url: string, linkText: string): void => {
  event({
    action: 'external_link_click',
    category: 'Outbound',
    label: linkText,
    link_url: url,
  });
};

// File Downloads (if applicable)
export const trackDownload = (fileName: string, fileType: string): void => {
  event({
    action: 'file_download',
    category: 'Download',
    label: fileName,
    file_type: fileType,
  });
};

// Search Events (if search is added)
export const trackSearch = (searchTerm: string): void => {
  event({
    action: 'search',
    category: 'Search',
    label: searchTerm,
  });
};

// Video/Media Events (if applicable)
export const trackVideoPlay = (videoTitle: string): void => {
  event({
    action: 'video_start',
    category: 'Video',
    label: videoTitle,
  });
};

// Error Tracking
export const trackError = (errorMessage: string, errorLocation: string): void => {
  event({
    action: 'exception',
    category: 'Error',
    label: errorMessage,
    error_location: errorLocation,
  });
};

// Time on Page (call when user leaves)
export const trackTimeOnPage = (seconds: number, pagePath: string): void => {
  event({
    action: 'time_on_page',
    category: 'Engagement',
    label: pagePath,
    value: seconds,
  });
};

// Scroll Depth Tracking
export const trackScrollDepth = (percentage: number, pagePath: string): void => {
  event({
    action: 'scroll_depth',
    category: 'Engagement',
    label: `${percentage}% - ${pagePath}`,
    value: percentage,
  });
};

// Easter Egg Discovery (for your PiEasterEgg component)
export const trackEasterEggDiscovery = (eggName: string): void => {
  event({
    action: 'easter_egg_found',
    category: 'Engagement',
    label: eggName,
  });
};

// AskBeau Chatbot Events
export const trackChatbotOpen = (): void => {
  event({
    action: 'chatbot_open',
    category: 'Chatbot',
    label: 'AskBeau Opened',
  });
};

export const trackChatbotMessage = (messageType: 'user' | 'bot'): void => {
  event({
    action: 'chatbot_message',
    category: 'Chatbot',
    label: messageType === 'user' ? 'User Message Sent' : 'Bot Response Received',
  });
};

export const trackChatbotQuestion = (question: string): void => {
  event({
    action: 'chatbot_question',
    category: 'Chatbot',
    label: question.substring(0, 100), // Truncate for analytics
    question_length: question.length,
  });
};

export const trackChatbotLimitReached = (): void => {
  event({
    action: 'chatbot_limit_reached',
    category: 'Chatbot',
    label: 'User reached question limit',
  });
};

// Easter Egg Phase Tracking
export const trackEasterEggPhase = (phase: string): void => {
  event({
    action: 'easter_egg_phase',
    category: 'Easter Egg',
    label: phase,
  });
};

export const trackEasterEggLogin = (screenType: string, success: boolean): void => {
  event({
    action: success ? 'easter_egg_login_success' : 'easter_egg_login_attempt',
    category: 'Easter Egg',
    label: screenType,
  });
};

// Legacy Experience Toggle
export const trackLegacyToggle = (expanded: boolean): void => {
  event({
    action: 'legacy_experience_toggle',
    category: 'Engagement',
    label: expanded ? 'Expanded' : 'Collapsed',
  });
};

// User Session Info
export const trackSessionStart = (): void => {
  const sessionData = {
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    referrer: document.referrer || 'direct',
    user_agent_data: navigator.userAgent,
  };

  event({
    action: 'session_start',
    category: 'Session',
    label: 'New Session',
    ...sessionData,
  });
};

// Track viewport/device info
export const trackDeviceInfo = (): void => {
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  const isDesktop = window.innerWidth >= 1024;

  event({
    action: 'device_info',
    category: 'Device',
    label: isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop',
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    is_touch: 'ontouchstart' in window,
  });
};

// Track user engagement score (based on interactions)
export const trackEngagementMilestone = (
  milestone: 'low' | 'medium' | 'high' | 'very_high',
  interactionCount: number
): void => {
  event({
    action: 'engagement_milestone',
    category: 'Engagement',
    label: milestone,
    value: interactionCount,
  });
};

// Track copy events (if user copies text)
export const trackTextCopy = (copiedText: string, location: string): void => {
  event({
    action: 'text_copy',
    category: 'Engagement',
    label: location,
    copied_length: copiedText.length,
  });
};

// Track image interactions
export const trackImageView = (imageName: string): void => {
  event({
    action: 'image_view',
    category: 'Media',
    label: imageName,
  });
};

// Track rage clicks (multiple clicks in same area)
export const trackRageClick = (elementInfo: string): void => {
  event({
    action: 'rage_click',
    category: 'UX Issues',
    label: elementInfo,
  });
};

// Track page visibility changes
export const trackVisibilityChange = (isVisible: boolean, timeHidden?: number): void => {
  event({
    action: isVisible ? 'page_visible' : 'page_hidden',
    category: 'Engagement',
    label: isVisible ? 'User returned' : 'User left tab',
    value: timeHidden,
  });
};
