// UpDraft self-serve data export (GDPR/CCPA-style portability).
//
// Builds a single JSON archive containing every piece of data the user
// has on the system: profile + all sessions + all events + export-file
// metadata with fresh signed-download URLs. Returned as a downloadable
// .json file so the user has a complete record before they delete their
// account (or just because they want a backup).

import 'server-only';
import {
  listAllExportsForUser,
  listSessionsFullForUser,
  readEventsForSession,
} from './store';
import { signedDownloadUrl } from './storage';
import type { UpdraftUser } from '@/types';

export interface DataExportArchive {
  schema_version: 1;
  exported_at: string;
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  sessions: Array<{
    id: string;
    status: string;
    tier: number | null;
    path: string | null;
    started_at: string;
    completed_at: string | null;
    last_activity_at: string;
    keep_indefinitely: boolean;
    stage_outputs: Record<string, unknown>;
    events: Array<{
      ts: string;
      stage: string | null;
      event_type: string;
      data: Record<string, unknown>;
    }>;
  }>;
  exports: Array<{
    id: string;
    session_id: string;
    kind: string;
    filename: string;
    mime: string;
    bytes: number;
    generated_at: string;
    /** Time-limited (10 min) signed URL for the actual file download. Re-export to refresh. */
    download_url: string | null;
  }>;
}

export async function buildDataExport(user: UpdraftUser): Promise<DataExportArchive> {
  const [sessions, exports] = await Promise.all([
    listSessionsFullForUser(user.id),
    listAllExportsForUser(user.id),
  ]);

  // Per-session events (parallel reads)
  const eventsPerSession = await Promise.all(
    sessions.map((s) => readEventsForSession(s.id, 2000)),
  );

  // Signed URLs for every export file
  const exportsWithUrls = await Promise.all(
    exports.map(async (e) => ({
      id: e.id,
      session_id: e.session_id,
      kind: e.kind,
      filename: e.filename,
      mime: e.mime,
      bytes: e.bytes,
      generated_at: e.generated_at,
      download_url: await signedDownloadUrl(e.storage_path),
    })),
  );

  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.createdAt,
    },
    sessions: sessions.map((s, i) => ({
      id: s.id,
      status: s.status,
      tier: s.tier,
      path: s.path,
      started_at: s.startedAt,
      completed_at: s.completedAt,
      last_activity_at: s.lastActivityAt,
      keep_indefinitely: s.keepIndefinitely,
      stage_outputs: s.stageOutputs,
      events: (eventsPerSession[i] ?? []).map((ev) => ({
        ts: ev.ts,
        stage: ev.stage,
        event_type: ev.eventType,
        data: ev.data,
      })),
    })),
    exports: exportsWithUrls,
  };
}

/** Format the archive as a downloadable JSON filename. */
export function dataExportFilename(user: UpdraftUser): string {
  const safe = user.email.replace(/[^a-zA-Z0-9.-]/g, '_');
  const stamp = new Date().toISOString().split('T')[0];
  return `updraft-data-${safe}-${stamp}.json`;
}
