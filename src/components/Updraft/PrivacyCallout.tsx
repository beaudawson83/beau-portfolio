// Server component. Renders the canonical UpDraft privacy statement on the
// login page. Copy lives in src/lib/data.ts (updraftPrivacyCopy) and mirrors
// the master at skills/updraft/PRIVACY-COPY.md.
//
// Display contract per PLAN.md §7.2:
//   - Renders BELOW the email-input + magic-link button.
//   - Body copy weight, full readable size — not fine print, not collapsible.
//   - Headings as headings, bullets as bullets.

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
      className="mt-16 max-w-2xl mx-auto text-[#cbd5e1]"
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
        {copy.heading}
      </h2>

      <div className="space-y-4 text-base leading-relaxed">
        {copy.lede.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <h3 className="mt-10 mb-4 text-lg font-semibold text-white">
        How we protect your data
      </h3>

      <p className="text-base leading-relaxed">
        {copy.protections.intro}
        <Citations list={copy.protections.introCitations} />
      </p>

      <ul className="mt-6 space-y-6">
        {copy.protections.points.map((point) => (
          <li key={point.heading}>
            <h4 className="text-base font-semibold text-white mb-1.5">
              {point.heading}
            </h4>
            <p className="text-base leading-relaxed">
              {point.body}
              <Citations list={point.citations} />
            </p>
          </li>
        ))}
      </ul>

      <h3 className="mt-10 mb-4 text-lg font-semibold text-white">
        {copy.whyItMatters.heading}
      </h3>

      <div className="space-y-4 text-base leading-relaxed">
        {copy.whyItMatters.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <p className="mt-10 text-sm leading-relaxed text-[#94A3B8] border-t border-[#1F1F1F] pt-6">
        {copy.footerMicrocopy}
      </p>
    </section>
  );
}
