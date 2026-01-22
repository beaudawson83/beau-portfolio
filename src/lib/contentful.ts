import { createClient, type ContentfulClientApi, type Entry, type EntrySkeletonType } from 'contentful';
import { createClient as createManagementClient } from 'contentful-management';
import type { SystemLog, SystemLogPreview, SystemLogInput, PostStatus, PostTag } from '@/types/blog';
import { BLOCKS, type Document } from '@contentful/rich-text-types';

// ============================================
// Contentful Client Setup
// ============================================

const spaceId = process.env.CONTENTFUL_SPACE_ID || '';
const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN || '';
const previewToken = process.env.CONTENTFUL_PREVIEW_TOKEN;
const managementToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

// Lazy-initialized clients
let deliveryClient: ContentfulClientApi<undefined> | null = null;
let previewClient: ContentfulClientApi<undefined> | null = null;

function getDeliveryClient(): ContentfulClientApi<undefined> {
  if (!spaceId || !accessToken) {
    throw new Error('CONTENTFUL_SPACE_ID and CONTENTFUL_ACCESS_TOKEN are required');
  }
  if (!deliveryClient) {
    deliveryClient = createClient({
      space: spaceId,
      accessToken: accessToken,
    });
  }
  return deliveryClient;
}

function getPreviewClient(): ContentfulClientApi<undefined> | null {
  if (!spaceId || !previewToken) {
    return null;
  }
  if (!previewClient) {
    previewClient = createClient({
      space: spaceId,
      accessToken: previewToken,
      host: 'preview.contentful.com',
    });
  }
  return previewClient;
}

// Get appropriate client based on preview mode
function getClient(preview = false): ContentfulClientApi<undefined> {
  if (preview) {
    const pc = getPreviewClient();
    if (pc) return pc;
  }
  return getDeliveryClient();
}

// ============================================
// Type Definitions for Contentful Entries
// ============================================

interface SystemLogFields {
  title: string;
  slug: string;
  entryId: string;
  publishedDate: string;
  status: PostStatus;
  tags: PostTag[];
  executiveSummary: string;
  bottleneckIdentified?: string;
  body: Document;
  recommendedArchitecture?: string;
  metaDescription?: string;
}

interface SystemLogSkeleton extends EntrySkeletonType {
  contentTypeId: 'systemLog';
  fields: SystemLogFields;
}

// ============================================
// Transform Functions
// ============================================

function transformToSystemLog(entry: Entry<SystemLogSkeleton>): SystemLog {
  const fields = entry.fields as SystemLogFields;
  return {
    id: entry.sys.id,
    title: fields.title,
    slug: fields.slug,
    entryId: fields.entryId,
    publishedDate: fields.publishedDate,
    status: fields.status,
    tags: fields.tags || [],
    executiveSummary: fields.executiveSummary,
    bottleneckIdentified: fields.bottleneckIdentified,
    body: fields.body,
    recommendedArchitecture: fields.recommendedArchitecture,
    metaDescription: fields.metaDescription,
    createdAt: entry.sys.createdAt,
    updatedAt: entry.sys.updatedAt,
  };
}

function transformToSystemLogPreview(entry: Entry<SystemLogSkeleton>): SystemLogPreview {
  const fields = entry.fields as SystemLogFields;
  return {
    id: entry.sys.id,
    title: fields.title,
    slug: fields.slug,
    entryId: fields.entryId,
    publishedDate: fields.publishedDate,
    status: fields.status,
    tags: fields.tags || [],
    executiveSummary: fields.executiveSummary,
  };
}

// ============================================
// Public API Functions
// ============================================

export async function getAllPosts(options?: {
  preview?: boolean;
  status?: PostStatus;
  tag?: PostTag;
  limit?: number;
  skip?: number;
}): Promise<{ posts: SystemLogPreview[]; total: number }> {
  // Return empty if Contentful isn't configured
  if (!spaceId || !accessToken) {
    return { posts: [], total: 0 };
  }

  const { preview = false, status, tag, limit = 100, skip = 0 } = options || {};
  const client = getClient(preview);

  // Build query - using any to handle dynamic field queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    content_type: 'systemLog',
    limit,
    skip,
    order: '-fields.publishedDate',
  };

  // Filter by status (for public, only show DEPLOYED)
  if (status) {
    query['fields.status'] = status;
  } else if (!preview) {
    query['fields.status'] = 'DEPLOYED';
  }

  // Filter by tag
  if (tag) {
    query['fields.tags[in]'] = tag;
  }

  const response = await client.getEntries<SystemLogSkeleton>(query);

  return {
    posts: response.items.map(transformToSystemLogPreview),
    total: response.total,
  };
}

export async function getPostBySlug(
  slug: string,
  preview = false
): Promise<SystemLog | null> {
  if (!spaceId || !accessToken) {
    return null;
  }

  const client = getClient(preview);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    content_type: 'systemLog',
    'fields.slug': slug,
    limit: 1,
  };

  const response = await client.getEntries<SystemLogSkeleton>(query);

  if (response.items.length === 0) {
    return null;
  }

  return transformToSystemLog(response.items[0]);
}

export async function getPostById(
  id: string,
  preview = false
): Promise<SystemLog | null> {
  if (!spaceId || !accessToken) {
    return null;
  }

  const client = getClient(preview);

  try {
    const entry = await client.getEntry<SystemLogSkeleton>(id);
    return transformToSystemLog(entry);
  } catch {
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  // Return empty array if Contentful isn't configured (e.g., during build)
  if (!spaceId || !accessToken) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    content_type: 'systemLog',
    'fields.status': 'DEPLOYED',
    select: ['fields.slug'],
    limit: 1000,
  };

  const client = getDeliveryClient();
  const response = await client.getEntries<SystemLogSkeleton>(query);

  return response.items.map((item) => {
    const fields = item.fields as { slug: string };
    return fields.slug;
  });
}

// ============================================
// Management API Functions (for CRUD)
// ============================================

async function getManagementClient() {
  if (!managementToken) {
    throw new Error('CONTENTFUL_MANAGEMENT_TOKEN is required for management operations');
  }

  const client = createManagementClient({
    accessToken: managementToken,
  });

  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment('master');

  return environment;
}

export async function createPost(input: SystemLogInput): Promise<SystemLog> {
  const environment = await getManagementClient();

  // Create entry
  const entry = await environment.createEntry('systemLog', {
    fields: {
      title: { 'en-US': input.title },
      slug: { 'en-US': input.slug },
      entryId: { 'en-US': input.entryId },
      publishedDate: { 'en-US': input.publishedDate },
      status: { 'en-US': input.status },
      tags: { 'en-US': input.tags },
      executiveSummary: { 'en-US': input.executiveSummary },
      bottleneckIdentified: input.bottleneckIdentified
        ? { 'en-US': input.bottleneckIdentified }
        : undefined,
      body: { 'en-US': markdownToRichText(input.body) },
      recommendedArchitecture: input.recommendedArchitecture
        ? { 'en-US': input.recommendedArchitecture }
        : undefined,
      metaDescription: input.metaDescription
        ? { 'en-US': input.metaDescription }
        : undefined,
    },
  });

  // Publish if status is DEPLOYED
  if (input.status === 'DEPLOYED') {
    await entry.publish();
  }

  // Fetch the created entry via delivery API
  const createdPost = await getPostById(entry.sys.id, input.status !== 'DEPLOYED');
  if (!createdPost) {
    throw new Error('Failed to fetch created post');
  }

  return createdPost;
}

export async function updatePost(
  id: string,
  input: Partial<SystemLogInput>
): Promise<SystemLog> {
  const environment = await getManagementClient();

  // Get existing entry
  const entry = await environment.getEntry(id);

  // Update fields
  if (input.title !== undefined) entry.fields.title = { 'en-US': input.title };
  if (input.slug !== undefined) entry.fields.slug = { 'en-US': input.slug };
  if (input.entryId !== undefined) entry.fields.entryId = { 'en-US': input.entryId };
  if (input.publishedDate !== undefined) entry.fields.publishedDate = { 'en-US': input.publishedDate };
  if (input.status !== undefined) entry.fields.status = { 'en-US': input.status };
  if (input.tags !== undefined) entry.fields.tags = { 'en-US': input.tags };
  if (input.executiveSummary !== undefined) entry.fields.executiveSummary = { 'en-US': input.executiveSummary };
  if (input.bottleneckIdentified !== undefined) {
    entry.fields.bottleneckIdentified = input.bottleneckIdentified
      ? { 'en-US': input.bottleneckIdentified }
      : undefined;
  }
  if (input.body !== undefined) entry.fields.body = { 'en-US': markdownToRichText(input.body) };
  if (input.recommendedArchitecture !== undefined) {
    entry.fields.recommendedArchitecture = input.recommendedArchitecture
      ? { 'en-US': input.recommendedArchitecture }
      : undefined;
  }
  if (input.metaDescription !== undefined) {
    entry.fields.metaDescription = input.metaDescription
      ? { 'en-US': input.metaDescription }
      : undefined;
  }

  // Save and optionally publish
  const updatedEntry = await entry.update();

  if (input.status === 'DEPLOYED') {
    await updatedEntry.publish();
  } else if (input.status === 'DRAFT' || input.status === 'ARCHIVED') {
    // Unpublish if changing to draft/archived
    try {
      await updatedEntry.unpublish();
    } catch {
      // Entry might not be published yet
    }
  }

  // Fetch updated post
  const updatedPost = await getPostById(id, input.status !== 'DEPLOYED');
  if (!updatedPost) {
    throw new Error('Failed to fetch updated post');
  }

  return updatedPost;
}

export async function deletePost(id: string): Promise<void> {
  const environment = await getManagementClient();

  const entry = await environment.getEntry(id);

  // Unpublish first if published
  try {
    await entry.unpublish();
  } catch {
    // Entry might not be published
  }

  // Delete entry
  await entry.delete();
}

// ============================================
// Helper Functions
// ============================================

// Simple markdown to Rich Text conversion
// For a production app, consider using a proper markdown parser
function markdownToRichText(markdown: string): Document {
  const lines = markdown.split('\n');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [];

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      content.push({
        nodeType: BLOCKS.HEADING_3,
        content: [{ nodeType: 'text', value: line.slice(4), marks: [], data: {} }],
        data: {},
      });
    } else if (line.startsWith('## ')) {
      content.push({
        nodeType: BLOCKS.HEADING_2,
        content: [{ nodeType: 'text', value: line.slice(3), marks: [], data: {} }],
        data: {},
      });
    } else {
      // Paragraph
      content.push({
        nodeType: BLOCKS.PARAGRAPH,
        content: [{ nodeType: 'text', value: line, marks: [], data: {} }],
        data: {},
      });
    }
  }

  return {
    nodeType: BLOCKS.DOCUMENT,
    content,
    data: {},
  };
}

export function generateNextEntryId(posts: SystemLogPreview[]): string {
  if (posts.length === 0) {
    return 'LOG_001';
  }

  const numbers = posts
    .map((p) => {
      const match = p.entryId.match(/LOG_(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxNumber = Math.max(...numbers, 0);
  return `LOG_${String(maxNumber + 1).padStart(3, '0')}`;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
