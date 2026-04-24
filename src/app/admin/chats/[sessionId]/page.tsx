import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getChatSession, requireAdmin } from '@/lib/chat-admin';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19);
}

export default async function ChatSessionPage({ params }: PageProps) {
  const admin = await requireAdmin();
  if (!admin) redirect('/system-logs/login?callbackUrl=/admin/chats');

  const { sessionId } = await params;
  const detail = await getChatSession(decodeURIComponent(sessionId));
  if (!detail) notFound();

  return (
    <main className="min-h-screen bg-[#111111] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin/chats"
          className="font-mono text-xs text-[#7C3AED] hover:text-white"
        >
          [ ← BACK_TO_SESSIONS ]
        </Link>

        <header className="mt-6 mb-8 border-b border-[#1F1F1F] pb-4">
          <h1 className="font-mono text-lg text-white break-all">
            <span className="text-[#7C3AED]">{'//'}</span> SESSION_{detail.sessionId}
          </h1>
          <div className="font-mono text-[11px] text-[#94A3B8] mt-2 space-y-0.5">
            <div>CREATED: {formatDate(detail.createdAt)}</div>
            <div>UPDATED: {formatDate(detail.updatedAt)}</div>
            <div>MESSAGES: {detail.messageCount}</div>
            <div>LAST_SOURCE: {detail.lastSource ?? 'unknown'}</div>
            <div>IP_HASH: {detail.ipHash ?? 'none'}</div>
            {detail.userAgent && (
              <div className="truncate">USER_AGENT: {detail.userAgent}</div>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {detail.messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'border-l-2 border-[#7C3AED] pl-4'
                  : 'border-l-2 border-[#94A3B8]/40 pl-4'
              }
            >
              <div className="font-mono text-[10px] text-[#94A3B8]/70 mb-1">
                {m.role.toUpperCase()} {'//'} {formatDate(m.timestamp)}
                {m.source ? ` // ${m.source}` : ''}
              </div>
              <div
                className={
                  m.role === 'user'
                    ? 'font-mono text-sm text-white whitespace-pre-wrap'
                    : 'text-[#94A3B8] text-sm whitespace-pre-wrap'
                }
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
