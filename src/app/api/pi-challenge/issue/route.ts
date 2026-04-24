import { NextRequest, NextResponse } from 'next/server';
import {
  generateCodeChallenge,
  pickQuote,
  stripAnswer,
} from '@/lib/pi-challenge/server';
import { signChallenge } from '@/lib/pi-challenge/token';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: { kind?: unknown; excludeIds?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (body.kind === 'code') {
    const { prompt, answer } = generateCodeChallenge();
    const token = signChallenge('code', answer);
    return NextResponse.json({ token, prompt });
  }

  if (body.kind === 'quote') {
    const excludeIds = Array.isArray(body.excludeIds)
      ? (body.excludeIds.filter(x => typeof x === 'string') as string[])
      : [];
    const full = pickQuote(excludeIds);
    const token = signChallenge('quote', full.correctAnswer);
    return NextResponse.json({ token, quote: stripAnswer(full) });
  }

  return NextResponse.json({ error: 'INVALID_KIND' }, { status: 400 });
}
