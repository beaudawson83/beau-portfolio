import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listChatSessions, requireAdmin } from '@/lib/chat-admin';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 25;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

export default async function ChatLogsPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  if (!admin) redirect('/system-logs/login?callbackUrl=/admin/chats');

  const params = await searchParams;
  const pageNum = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const { sessions, total } = await listChatSessions({ limit: PAGE_SIZE, offset });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-[#111111] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="font-mono text-xl text-white">
            <span className="text-[#7C3AED]">{'//'}</span> CHAT_LOGS
          </h1>
          <p className="font-mono text-xs text-[#94A3B8] mt-1">
            [ {total} SESSIONS ]
          </p>
        </header>

        {sessions.length === 0 ? (
          <div className="font-mono text-sm text-[#94A3B8]">NO_SESSIONS_LOGGED</div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <Link
                key={s.id}
                href={`/admin/chats/${encodeURIComponent(s.sessionId)}`}
                className="block border border-[#1F1F1F] hover:border-[#7C3AED]/60 transition-colors p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] text-[#94A3B8]">
                    {formatDate(s.updatedAt)} {'//'} {s.messageCount} msgs {'//'}{' '}
                    {s.lastSource ?? 'unknown'}
                  </span>
                  <span className="font-mono text-[10px] text-[#7C3AED]/70">
                    {s.ipHash ?? 'no-ip'}
                  </span>
                </div>
                <div className="font-mono text-sm text-white truncate">
                  {s.preview || <span className="text-[#94A3B8]/50">[empty]</span>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-between font-mono text-xs">
            {pageNum > 1 ? (
              <Link
                href={`/admin/chats?page=${pageNum - 1}`}
                className="text-[#7C3AED] hover:text-white"
              >
                [ ← PREV ]
              </Link>
            ) : (
              <span />
            )}
            <span className="text-[#94A3B8]">
              PAGE {pageNum} / {totalPages}
            </span>
            {pageNum < totalPages ? (
              <Link
                href={`/admin/chats?page=${pageNum + 1}`}
                className="text-[#7C3AED] hover:text-white"
              >
                [ NEXT → ]
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
