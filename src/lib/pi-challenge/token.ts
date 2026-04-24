import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type ChallengeKind = 'code' | 'quote';

type TokenPayload = {
  kind: ChallengeKind;
  answerHash: string;
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

// Hash the answer with the shared secret + per-token nonce so the token
// payload never contains the raw answer, even if a curious user base64-decodes it.
function hashAnswer(answer: string, nonce: string): string {
  return base64urlEncode(
    createHmac('sha256', getSecret()).update(`${nonce}:${answer}`).digest()
  );
}

export function signChallenge(kind: ChallengeKind, answer: string): string {
  const nonce = randomBytes(16).toString('hex');
  const payload: TokenPayload = {
    kind,
    answerHash: hashAnswer(answer, nonce),
    exp: Date.now() + TTL_MS,
    nonce,
  };
  const body = base64urlEncode(Buffer.from(JSON.stringify(payload)));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyChallenge(
  token: string,
  kind: ChallengeKind,
  userAnswer: string
): { valid: boolean; expired: boolean } {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, expired: false };
  }
  const [body, sig] = token.split('.');
  if (!body || !sig) return { valid: false, expired: false };

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, expired: false };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(body).toString('utf8'));
  } catch {
    return { valid: false, expired: false };
  }

  if (payload.kind !== kind) return { valid: false, expired: false };
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    return { valid: false, expired: true };
  }
  if (typeof payload.answerHash !== 'string' || typeof payload.nonce !== 'string') {
    return { valid: false, expired: false };
  }

  const submittedHash = hashAnswer(userAnswer, payload.nonce);
  const ah = Buffer.from(payload.answerHash);
  const sh = Buffer.from(submittedHash);
  if (ah.length !== sh.length) return { valid: false, expired: false };

  return { valid: timingSafeEqual(ah, sh), expired: false };
}
