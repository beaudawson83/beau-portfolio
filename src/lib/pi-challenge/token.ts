import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type ChallengeKind = 'code' | 'quote';

export type ChallengePayload = {
  kind: ChallengeKind;
  answer: string;
  exp: number;
  nonce: string;
};

const TTL_MS = 5 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.PI_CHALLENGE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('PI_CHALLENGE_SECRET must be set (>= 32 chars)');
  }
  return secret;
}

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? 0 : 4 - (str.length % 4);
  return Buffer.from(
    str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad),
    'base64'
  );
}

function sign(body: string): string {
  return base64urlEncode(createHmac('sha256', getSecret()).update(body).digest());
}

export function signChallenge(kind: ChallengeKind, answer: string): string {
  const payload: ChallengePayload = {
    kind,
    answer,
    exp: Date.now() + TTL_MS,
    nonce: randomBytes(8).toString('hex'),
  };
  const body = base64urlEncode(Buffer.from(JSON.stringify(payload)));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyChallenge(token: string, kind: ChallengeKind): ChallengePayload | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: ChallengePayload;
  try {
    payload = JSON.parse(base64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }

  if (payload.kind !== kind) return null;
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  if (typeof payload.answer !== 'string') return null;
  return payload;
}
