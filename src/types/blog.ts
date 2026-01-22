import type { Document } from '@contentful/rich-text-types';

// ============================================
// Blog Post Types (Contentful)
// ============================================

export type PostStatus = 'DRAFT' | 'DEPLOYED' | 'ARCHIVED';

export type PostTag =
  | 'AI_STRATEGY'
  | 'OPS_EFFICIENCY'
  | 'FRACTIONAL_INSIGHTS'
  | 'AUTOMATION'
  | 'CRM_ARCHITECTURE'
  | 'LEADERSHIP';

export const POST_TAG_LABELS: Record<PostTag, string> = {
  AI_STRATEGY: 'AI Strategy',
  OPS_EFFICIENCY: 'Ops Efficiency',
  FRACTIONAL_INSIGHTS: 'Fractional Insights',
  AUTOMATION: 'Automation',
  CRM_ARCHITECTURE: 'CRM Architecture',
  LEADERSHIP: 'Leadership',
};

export interface SystemLog {
  id: string;
  title: string;
  slug: string;
  entryId: string; // Format: LOG_001
  publishedDate: string;
  status: PostStatus;
  tags: PostTag[];
  executiveSummary: string;
  bottleneckIdentified?: string;
  body: Document; // Contentful Rich Text
  recommendedArchitecture?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

// Simplified version for list views
export interface SystemLogPreview {
  id: string;
  title: string;
  slug: string;
  entryId: string;
  publishedDate: string;
  status: PostStatus;
  tags: PostTag[];
  executiveSummary: string;
}

// For creating/updating posts
export interface SystemLogInput {
  title: string;
  slug: string;
  entryId: string;
  publishedDate: string;
  status: PostStatus;
  tags: PostTag[];
  executiveSummary: string;
  bottleneckIdentified?: string;
  body: string; // Markdown string for input
  recommendedArchitecture?: string;
  metaDescription?: string;
}

// ============================================
// Newsletter Types (Supabase)
// ============================================

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
}

export interface NewsletterSubscribeInput {
  email: string;
}

// ============================================
// Analytics Types (Supabase)
// ============================================

export interface PostAnalytics {
  id: string;
  post_slug: string;
  view_count: number;
  last_viewed_at: string;
}

// ============================================
// Admin Types (Supabase)
// ============================================

export interface AdminWhitelist {
  id: string;
  email: string;
  is_active: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PostsListResponse {
  posts: SystemLogPreview[];
  total: number;
}

export interface PostResponse {
  post: SystemLog;
}
