// Server component. Renders the canonical UpDraft privacy statement on the
// login page. Copy lives in src/lib/data.ts (updraftPrivacyCopy) and mirrors
// the master at skills/updraft/PRIVACY-COPY.md.
//
// Display contract per PLAN.md §7.2:
//   - Renders BELOW the email-input + magic-link button.
//   - Body copy weight, never collapsible.
//   - Bullet structure on the protection points so the page reads as a
//     short policy summary, not a wall of text.

import type { UpdraftCitation, UpdraftPrivacyCopy } from '@/types';

function Citations({ list }: { list: UpdraftCitation[] | undefined }) {
  if (!list || list.length === 0) return null;
  return (
    <span className="ml-1 text-[#94A3B8]">
      [
      {list.map((c, i) => (
        <span key={c.href}>
          {i > 0 && ', '}
          <a
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-[#7C3AED] transition-colors"
          >
            {c.label}
          </a>
        </span>
      ))}
      ]
    </span>
  );
}

export default function PrivacyCallout({ copy }: { copy: UpdraftPrivacyCopy }) {
  return (
    <section
      aria-label="Privacy, Trust & Opportunity"
      className="mt-16 max-w-2xl mx-auto text-[#cbd5e1] text-sm sm:text-[15px] leading-relaxed"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
        {copy.heading}
      </h2>

      <div className="space-y-3">
        {copy.lede.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <h3 className="mt-8 mb-3 text-base font-semibold text-white">
        How we protect your data
      </h3>

      <p>
        {copy.protections.intro}
        <Citations list={copy.protections.introCitations} />
      </p>

      <ul className="mt-4 space-y-3">
        {copy.protections.points.map((point) => (
          <li key={point.heading} className="flex gap-3 items-start">
            <span
              aria-hidden="true"
              className="text-[#7C3AED] mt-[3px] flex-shrink-0 select-none"
            >
              ▸
            </span>
            <p>
              <span className="font-semibold text-white">{point.heading}.</span>{' '}
              {point.body}
              <Citations list={point.citations} />
            </p>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 mb-3 text-base font-semibold text-white">
        {copy.whyItMatters.heading}
      </h3>

      <div className="space-y-3">
        {copy.whyItMatters.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <p className="mt-8 pt-5 text-xs leading-relaxed text-[#94A3B8] border-t border-[#1F1F1F]">
        {copy.footerMicrocopy}
      </p>
    </section>
  );
}
