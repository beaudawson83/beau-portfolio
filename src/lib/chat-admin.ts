import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getServerSupabase } from './supabase';

export type ChatMessageLog = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: 'ai' | 'fallback';
};

export type ChatSessionSummary = {
  id: string;
  sessionId: string;
  ipHash: string | null;
  userAgent: string | null;
  messageCount: number;
  lastSource: string | null;
  createdAt: string;
  updatedAt: string;
  preview: string;
};

export type ChatSessionDetail = ChatSessionSummary & {
  messages: ChatMessageLog[];
};

export async function requireAdmin(): Promise<{ email: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return null;
  return { email: session.user.email ?? 'admin' };
}

function firstUserMessage(messages: ChatMessageLog[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return '';
  return first.text.length > 120 ? first.text.slice(0, 120) + '...' : first.text;
}

export async function listChatSessions(opts: { limit: number; offset: number }): Promise<{
  sessions: ChatSessionSummary[];
  total: number;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { sessions: [], total: 0 };
  }
  const client = getServerSupabase();
  const { data, error, count } = await client
    .from('chat_conversations')
    .select(
      'id, session_id, ip_hash, user_agent, messages, message_count, last_source, created_at, updated_at',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(opts.offset, opts.offset + opts.limit - 1);

  if (error || !data) {
    console.error('listChatSessions error:', error);
    return { sessions: [], total: 0 };
  }

  const sessions = data.map((row): ChatSessionSummary => {
    const msgs = (row.messages as ChatMessageLog[]) ?? [];
    return {
      id: row.id,
      sessionId: row.session_id,
      ipHash: row.ip_hash,
      userAgent: row.user_agent,
      messageCount: row.message_count,
      lastSource: row.last_source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      preview: firstUserMessage(msgs),
    };
  });

  return { sessions, total: count ?? sessions.length };
}

export async function getChatSession(sessionId: string): Promise<ChatSessionDetail | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const client = getServerSupabase();
  const { data, error } = await client
    .from('chat_conversations')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error || !data) return null;

  const msgs = (data.messages as ChatMessageLog[]) ?? [];
  return {
    id: data.id,
    sessionId: data.session_id,
    ipHash: data.ip_hash,
    userAgent: data.user_agent,
    messageCount: data.message_count,
    lastSource: data.last_source,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    preview: firstUserMessage(msgs),
    messages: msgs,
  };
}
