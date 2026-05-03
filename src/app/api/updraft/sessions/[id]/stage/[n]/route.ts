import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookieValue, SESSION_COOKIE_NAME } from '@/lib/updraft/auth';
import { logEvent, patchSessionStage } from '@/lib/updraft/store';
import type { UpdraftPath, UpdraftTier } from '@/types';

const STAGE_KEYS = {
  '1':  'stage_01',
  '01': 'stage_01',
  '2':  'stage_02',
  '02': 'stage_02',
  '3':  'stage_03',
  '03': 'stage_03',
  '4':  'stage_04',
  '04': 'stage_04',
} as const;

type StageKey = (typeof STAGE_KEYS)[keyof typeof STAGE_KEYS];

interface PatchBody {
  payload?: Record<string, unknown>;
  path?: UpdraftPath | null;
  tier?: UpdraftTier | null;
  status?: 'in_progress' | 'completed' | 'abandoned';
}

/**
 * PATCH /api/updraft/sessions/[id]/stage/[n]
 *
 * Merge-patch a stage's output into stage_outputs.{stage_NN}. Optionally
 * advances path/tier/status alongside (Stage 01.4 sets tier here; Stage
 * 04 marks status='completed' here).
 *
 * Body: { payload: object, path?, tier?, status? }
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; n: string }> },
) {
  const { id: sessionId, n } = await ctx.params;
  const stageKey = STAGE_KEYS[n as keyof typeof STAGE_KEYS] as StageKey | undefined;
  if (!stageKey) {
    return NextResponse.json({ error: 'invalid-stage' }, { status: 400 });
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = readSessionCookieValue(cookieValue);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const session = await patchSessionStage({
    sessionId,
    userId,
    stageKey,
    payload: body.payload ?? {},
    path: body.path,
    tier: body.tier,
    status: body.status,
  });
  if (!session) {
    // patchSessionStage returns null for not-found OR ownership mismatch.
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  await logEvent({
    sessionId,
    stage: stageKey.slice(-2),                          // '01' | '02' | '03' | '04'
    eventType: 'stage_patched',
    data: {
      keys: Object.keys(body.payload ?? {}),
      path: body.path ?? null,
      tier: body.tier ?? null,
      status: body.status ?? null,
    },
  });

  return NextResponse.json({ session });
}
