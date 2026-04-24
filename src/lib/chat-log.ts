import 'server-only';
import { createHash } from 'node:crypto';
import { getServerSupabase } from './supabase';

export type ChatSource = 'ai' | 'fallback';

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.CHAT_IP_SALT;
  if (!salt) return null;
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 16);
}

export function extractClientIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip');
}

export async function logConversation(args: {
  sessionId: string;
  ip: string | null;
  userAgent: string | null;
  userMessage: string;
  assistantMessage: string;
  source: ChatSource;
}): Promise<void> {
  if (!args.sessionId) return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const now = new Date().toISOString();
  const client = getServerSupabase();

  const { error } = await client.rpc('append_chat_message', {
    p_session_id: args.sessionId,
    p_ip_hash: hashIp(args.ip),
    p_user_agent: args.userAgent?.slice(0, 500) ?? null,
    p_user_message: { role: 'user', text: args.userMessage, timestamp: now },
    p_assistant_message: {
      role: 'assistant',
      text: args.assistantMessage,
      timestamp: now,
      source: args.source,
    },
    p_source: args.source,
  });

  if (error) {
    console.error('chat-log: append_chat_message failed', error);
  }
}
