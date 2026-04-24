import { NextRequest, NextResponse } from 'next/server';
import { verifyChallenge, type ChallengeKind } from '@/lib/pi-challenge/token';
import { normalizeCodeAnswer } from '@/lib/pi-challenge/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: { kind?: unknown; token?: unknown; userAnswer?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const kind = body.kind;
  if (kind !== 'code' && kind !== 'quote') {
    return NextResponse.json({ error: 'INVALID_KIND' }, { status: 400 });
  }

  if (typeof body.token !== 'string' || typeof body.userAnswer !== 'string') {
    return NextResponse.json({ valid: false });
  }

  const submitted =
    kind === 'code' ? normalizeCodeAnswer(body.userAnswer) : body.userAnswer.trim();

  const result = verifyChallenge(body.token, kind as ChallengeKind, submitted);
  return NextResponse.json({ valid: result.valid, expired: result.expired });
}
