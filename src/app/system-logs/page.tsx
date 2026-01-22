import { getAllPosts } from '@/lib/contentful';
import LogDirectory from '@/components/SystemLogs/LogDirectory';
import NavigationButtons from '@/components/SystemLogs/NavigationButtons';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const tagFilter = params.tag as string | undefined;

  const { posts, total } = await getAllPosts({
    status: 'DEPLOYED',
    tag: tagFilter as 'AI_STRATEGY' | 'OPS_EFFICIENCY' | 'FRACTIONAL_INSIGHTS' | 'AUTOMATION' | 'CRM_ARCHITECTURE' | 'LEADERSHIP' | undefined,
  });

  return (
    <main className="min-h-screen py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <NavigationButtons variant="home" />

          <div className="mt-8">
            <h1 className="font-mono text-2xl md:text-3xl text-white mb-2">
              <span className="text-[#7C3AED]">{'//'}</span> SYSTEM_LOGS
            </h1>
            <p className="font-mono text-sm text-[#94A3B8]">
              [ {total} ENTRIES INDEXED ] // STRATEGIC INTEL ON AI, OPS & ARCHITECTURE
            </p>
          </div>

          {/* Terminal-style divider */}
          <div className="mt-6 font-mono text-xs text-[#94A3B8]/50">
            {'─'.repeat(60)}
          </div>
        </header>

        {/* Post Directory */}
        <LogDirectory posts={posts} activeTag={tagFilter} />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[#1F1F1F]">
          <p className="font-mono text-xs text-[#94A3B8]/50 text-center">
            2026 // BEAU_DAWSON // BAD_LABS
          </p>
        </footer>
      </div>
    </main>
  );
}
