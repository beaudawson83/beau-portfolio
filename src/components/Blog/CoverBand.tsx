'use client';

import type { BlogCoverId } from '@/types';
import { coverBackground } from './Builder/CoverPicker';

const PHOTO_MAX_HEIGHT = 640;

/**
 * Single source of truth for how a cover renders. Used by the editor's
 * cover band and the public article view, so what the writer sees in the
 * sidebar matches what the reader gets.
 *
 * - 'cover-photo' with a URL: <img> at natural aspect ratio, clamped to
 *   PHOTO_MAX_HEIGHT so a very tall upload (e.g. a 1:1 portrait) doesn't
 *   take over the viewport before the reader hits the title.
 * - Gradient covers (mesh / grid / stripe): fixed 4:1 banner — they're
 *   decorative and look right at that ratio.
 * - 'none': returns null. Callers that want a placeholder (the editor)
 *   render it themselves.
 */
export default function CoverBand({
  coverId,
  coverUrl,
}: {
  coverId: BlogCoverId;
  coverUrl?: string | null;
}) {
  if (coverId === 'none') return null;

  if (coverId === 'cover-photo' && coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-provided URL, dimensions unknown
      <img
        src={coverUrl}
        alt=""
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: PHOTO_MAX_HEIGHT,
          objectFit: 'cover',
          borderRadius: 6,
          border: '1px solid var(--tn-line)',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '4/1',
        borderRadius: 6,
        background: coverBackground(coverId, coverUrl),
        border: '1px solid var(--tn-line)',
      }}
    />
  );
}
