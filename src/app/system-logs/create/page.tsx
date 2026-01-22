'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';
import type { SystemLogPreview, SystemLogInput, PostStatus, PostTag } from '@/types/blog';
import { POST_TAG_LABELS } from '@/types/blog';
import NavigationButtons from '@/components/SystemLogs/NavigationButtons';
import StatusBadge from '@/components/SystemLogs/StatusBadge';

const AVAILABLE_TAGS: PostTag[] = [
  'AI_STRATEGY',
  'OPS_EFFICIENCY',
  'FRACTIONAL_INSIGHTS',
  'AUTOMATION',
  'CRM_ARCHITECTURE',
  'LEADERSHIP',
];

const STATUS_OPTIONS: PostStatus[] = ['DRAFT', 'DEPLOYED', 'ARCHIVED'];

export default function AdminPage() {
  const [posts, setPosts] = useState<SystemLogPreview[]>([]);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<SystemLogInput>({
    title: '',
    slug: '',
    entryId: '',
    publishedDate: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
    tags: [],
    executiveSummary: '',
    bottleneckIdentified: '',
    body: '',
    recommendedArchitecture: '',
    metaDescription: '',
  });

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      if (data.success) {
        setPosts(data.data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Generate next entry ID
  const generateEntryId = (): string => {
    if (posts.length === 0) return 'LOG_001';
    const numbers = posts
      .map((p) => {
        const match = p.entryId.match(/LOG_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNumber = Math.max(...numbers, 0);
    return `LOG_${String(maxNumber + 1).padStart(3, '0')}`;
  };

  // Handle new post
  const handleNewPost = () => {
    setSelectedPost(null);
    setIsEditing(true);
    setFormData({
      title: '',
      slug: '',
      entryId: generateEntryId(),
      publishedDate: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      tags: [],
      executiveSummary: '',
      bottleneckIdentified: '',
      body: '',
      recommendedArchitecture: '',
      metaDescription: '',
    });
  };

  // Handle edit post
  const handleEditPost = async (postId: string) => {
    setSelectedPost(postId);
    setIsEditing(true);

    // Find post in list and populate form
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setFormData({
        title: post.title,
        slug: post.slug,
        entryId: post.entryId,
        publishedDate: post.publishedDate.split('T')[0],
        status: post.status,
        tags: post.tags,
        executiveSummary: post.executiveSummary,
        bottleneckIdentified: '',
        body: '// Loading full content...',
        recommendedArchitecture: '',
        metaDescription: '',
      });
    }
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const method = selectedPost ? 'PUT' : 'POST';
      const body = selectedPost ? { id: selectedPost, ...formData } : formData;

      const response = await fetch('/api/posts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: selectedPost ? 'POST_UPDATED' : 'POST_CREATED' });
        fetchPosts();
        if (!selectedPost) {
          setSelectedPost(data.data.post.id);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'SAVE_FAILED' });
      }
    } catch {
      setMessage({ type: 'error', text: 'NETWORK_ERROR' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedPost) return;
    if (!confirm('[ CONFIRM_DELETE ] This action cannot be undone.')) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/posts?id=${selectedPost}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'POST_DELETED' });
        setIsEditing(false);
        setSelectedPost(null);
        fetchPosts();
      } else {
        setMessage({ type: 'error', text: data.error || 'DELETE_FAILED' });
      }
    } catch {
      setMessage({ type: 'error', text: 'NETWORK_ERROR' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle title change (auto-generate slug)
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  // Toggle tag
  const toggleTag = (tag: PostTag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  return (
    <main className="min-h-screen bg-[#111111]">
      {/* Header */}
      <header className="border-b border-[#1F1F1F] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavigationButtons variant="back" />
            <h1 className="font-mono text-lg text-white">
              <span className="text-[#7C3AED]">[</span>
              LOG_CREATOR
              <span className="text-[#7C3AED]">]</span>
              <span className="text-[#94A3B8] text-sm ml-2">// SYSTEM_ADMIN</span>
            </h1>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/system-logs' })}
            className="font-mono text-xs text-[#94A3B8] hover:text-red-500 transition-colors"
          >
            [ LOGOUT ]
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-73px)]">
        {/* Sidebar - Post List */}
        <aside className="w-80 border-r border-[#1F1F1F] p-4 overflow-y-auto">
          <button
            onClick={handleNewPost}
            className="w-full font-mono text-sm text-[#7C3AED] border border-[#7C3AED] hover:bg-[#7C3AED]/10 px-4 py-2 mb-4 transition-colors"
          >
            [ + NEW_LOG ]
          </button>

          {isLoading ? (
            <div className="text-[#94A3B8] font-mono text-xs text-center py-8">
              LOADING...
            </div>
          ) : posts.length === 0 ? (
            <div className="text-[#94A3B8] font-mono text-xs text-center py-8">
              NO_LOGS_FOUND
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <motion.button
                  key={post.id}
                  whileHover={{ x: 2 }}
                  onClick={() => handleEditPost(post.id)}
                  className={`
                    w-full text-left p-3 border transition-colors
                    ${
                      selectedPost === post.id
                        ? 'border-[#7C3AED] bg-[#7C3AED]/5'
                        : 'border-[#1F1F1F] hover:border-[#7C3AED]/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      {post.entryId}
                    </span>
                    <StatusBadge status={post.status} />
                  </div>
                  <div className="font-mono text-sm text-white truncate">
                    {post.title}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </aside>

        {/* Main Content - Editor */}
        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center font-mono text-[#94A3B8]">
                  <p className="text-sm">SELECT_A_LOG_TO_EDIT</p>
                  <p className="text-xs mt-2">OR_CREATE_A_NEW_ONE</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Message */}
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      font-mono text-xs p-2 border
                      ${
                        message.type === 'success'
                          ? 'border-green-500/50 text-green-500 bg-green-500/5'
                          : 'border-red-500/50 text-red-500 bg-red-500/5'
                      }
                    `}
                  >
                    {'>'} {message.text}
                  </motion.div>
                )}

                {/* Form Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="col-span-2">
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      TITLE
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none"
                      placeholder="The Complexity Tax"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      SLUG
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none"
                      placeholder="the-complexity-tax"
                    />
                  </div>

                  {/* Entry ID */}
                  <div>
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      ENTRY_ID
                    </label>
                    <input
                      type="text"
                      value={formData.entryId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, entryId: e.target.value }))
                      }
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none"
                      placeholder="LOG_001"
                    />
                  </div>

                  {/* Published Date */}
                  <div>
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      PUBLISHED_DATE
                    </label>
                    <input
                      type="date"
                      value={formData.publishedDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          publishedDate: e.target.value,
                        }))
                      }
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      STATUS
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as PostStatus,
                        }))
                      }
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div className="col-span-2">
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      TAGS
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`
                            font-mono text-xs px-2 py-1 border transition-colors
                            ${
                              formData.tags.includes(tag)
                                ? 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/10'
                                : 'border-[#1F1F1F] text-[#94A3B8] hover:border-[#7C3AED]/50'
                            }
                          `}
                        >
                          {POST_TAG_LABELS[tag]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="col-span-2">
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      EXECUTIVE_SUMMARY
                    </label>
                    <textarea
                      value={formData.executiveSummary}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          executiveSummary: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none resize-none"
                      placeholder="2-3 sentences summarizing the key insight..."
                    />
                  </div>

                  {/* Bottleneck Identified */}
                  <div className="col-span-2">
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      BOTTLENECK_IDENTIFIED (optional)
                    </label>
                    <textarea
                      value={formData.bottleneckIdentified}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bottleneckIdentified: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none resize-none"
                      placeholder="The problem being addressed..."
                    />
                  </div>

                  {/* Body */}
                  <div className="col-span-2">
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      BODY (Markdown)
                    </label>
                    <textarea
                      value={formData.body}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, body: e.target.value }))
                      }
                      rows={12}
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none resize-none"
                      placeholder="## Main Content&#10;&#10;Write your post content here using Markdown..."
                    />
                  </div>

                  {/* Recommended Architecture */}
                  <div className="col-span-2">
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      RECOMMENDED_ARCHITECTURE (optional)
                    </label>
                    <textarea
                      value={formData.recommendedArchitecture}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recommendedArchitecture: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none resize-none"
                      placeholder="The recommended solution or approach..."
                    />
                  </div>

                  {/* Meta Description */}
                  <div className="col-span-2">
                    <label className="block font-mono text-xs text-[#94A3B8] mb-1">
                      META_DESCRIPTION (SEO, max 160 chars)
                    </label>
                    <input
                      type="text"
                      value={formData.metaDescription}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          metaDescription: e.target.value.slice(0, 160),
                        }))
                      }
                      maxLength={160}
                      className="w-full bg-[#0a0a0a] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none"
                      placeholder="SEO description for search engines and social sharing..."
                    />
                    <div className="font-mono text-[10px] text-[#94A3B8]/50 mt-1">
                      {formData.metaDescription?.length || 0}/160
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 pt-4 border-t border-[#1F1F1F]">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`
                      font-mono text-sm px-6 py-2 border transition-colors
                      ${
                        isSaving
                          ? 'border-[#7C3AED]/50 text-[#7C3AED]/50 cursor-wait'
                          : 'border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10'
                      }
                    `}
                  >
                    {isSaving
                      ? '[ SAVING... ]'
                      : formData.status === 'DEPLOYED'
                      ? '[ PUBLISH ]'
                      : '[ SAVE_DRAFT ]'}
                  </button>

                  {selectedPost && (
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="font-mono text-sm px-6 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      [ DELETE ]
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedPost(null);
                    }}
                    className="font-mono text-sm px-6 py-2 text-[#94A3B8] hover:text-white transition-colors"
                  >
                    [ CANCEL ]
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </main>
  );
}
