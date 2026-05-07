// Server component. Renders the canonical UpDraft privacy statement on the
// login page. Copy lives in src/lib/data.ts (updraftPrivacyCopy) and mirrors
// the master at skills/updraft/PRIVACY-COPY.md.
//
// Display contract per PLAN.md §7.2:
//   - Renders BELOW the email-input + magic-link button.
//   - Body copy weight, never collapsible.
//   - Bullet structure on the protection points so the page reads as a
//     short policy summary, not a wall of text.
//   - GDPR citations consolidated into a single Sources block at the
//     bottom — never inline within body copy.

import type { UpdraftCitation, UpdraftPrivacyCopy } from '@/types';

/** Deduplicates citations by href across the intro + every protection point. */
function collectUniqueCitations(copy: UpdraftPrivacyCopy): UpdraftCitation[] {
  const seen = new Map<string, UpdraftCitation>();
  for (const c of copy.protections.introCitations) seen.set(c.href, c);
  for (const point of copy.protections.points) {
    for (const c of point.citations ?? []) seen.set(c.href, c);
  }
  return Array.from(seen.values());
}

export default function PrivacyCallout({ copy }: { copy: UpdraftPrivacyCopy }) {
  const sources = collectUniqueCitations(copy);

  return (
    <section
      aria-label="Privacy, Trust & Opportunity"
      className="text-[#cbd5e1] text-xs sm:text-[13px] leading-relaxed"
    >
      <h2 className="text-base sm:text-lg font-bold text-white mb-3">
        {copy.heading}
      </h2>

      <div className="space-y-2">
        {copy.lede.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <h3 className="mt-6 mb-2 text-sm font-semibold text-white">
        How we protect your data
      </h3>

      <p>{copy.protections.intro}</p>

      <ul className="mt-3 space-y-2">
        {copy.protections.points.map((point) => (
          <li key={point.heading} className="flex gap-2 items-start">
            <span
              aria-hidden="true"
              className="text-[#7C3AED] mt-[3px] flex-shrink-0 select-none"
            >
              ▸
            </span>
            <p>
              <span className="font-semibold text-white">{point.heading}.</span>{' '}
              {point.body}
            </p>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 mb-2 text-sm font-semibold text-white">
        {copy.whyItMatters.heading}
      </h3>

      <div className="space-y-2">
        {copy.whyItMatters.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[#1F1F1F]">
          <h3 className="text-[10px] tracking-widest text-[#94A3B8] uppercase mb-2">
            Sources
          </h3>
          <ul className="text-[11px] text-[#94A3B8] flex flex-wrap gap-x-4 gap-y-1">
            {sources.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2 hover:text-[#7C3AED] transition-colors"
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-[#94A3B8]">
        {copy.footerMicrocopy}
      </p>
    </section>
  );
}
