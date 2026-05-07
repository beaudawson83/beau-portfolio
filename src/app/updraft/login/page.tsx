import type { Metadata } from 'next';
import Image from 'next/image';
import { Orbitron } from 'next/font/google';
import { redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { updraftLogoPath, updraftPrivacyCopy } from '@/lib/data';
import LoginForm from '@/components/Updraft/LoginForm';
import PrivacyCallout from '@/components/Updraft/PrivacyCallout';

// Sci-fi display font for the UpDraft wordmark. Scoped to this page —
// not loaded on the rest of the site. Bold/black weights are the ones
// that read as a logo type; lighter weights look thin at large sizes.
const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sign in — UpDraft',
  description: 'Magic-link sign-in for UpDraft, the resume builder by BAD Labs.',
  robots: { index: false, follow: false },
};

// Reading cookies forces dynamic rendering anyway; making it explicit avoids
// surprises if Next ever decides to cache.
export const dynamic = 'force-dynamic';

export default async function UpdraftLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const userId = await readSessionUserIdFromCookies();
  if (userId) redirect('/updraft');

  const params = await searchParams;
  const errorCode = typeof params.err === 'string' ? params.err : null;

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Brand mark — wordmark + "by BAD Labs" tagline stacked tight in
            a single column, logo flush to the right. The whole lockup
            should read as one artifact. */}
        <div className="max-w-lg mx-auto mb-12">
          <div className="flex items-end justify-center gap-0.5 sm:gap-1">
            {/* Wordmark column. Tagline is absolutely positioned so it
                doesn't contribute to the column height — that lets
                items-end on the parent align the wordmark's bottom with
                the logo's bottom (rather than aligning the tagline's
                bottom with the logo's bottom). */}
            <div className="relative">
              <h1
                className={`${orbitron.className} text-5xl sm:text-6xl font-black tracking-tight text-white leading-none`}
              >
                UpDraft
              </h1>
              <p className="absolute left-0 top-full mt-1 ml-[72px] sm:ml-[90px] text-[10px] sm:text-[11px] tracking-[0.25em] text-[#7C3AED] uppercase font-semibold leading-none whitespace-nowrap">
                by BAD Labs
              </p>
            </div>

            {/* Logo — set updraftLogoPath in src/lib/data.ts to swap in */}
            {updraftLogoPath ? (
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                <Image
                  src={updraftLogoPath}
                  alt="UpDraft"
                  fill
                  sizes="128px"
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div
                className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 border-2 border-dashed border-[#2A2A2A] rounded-xl flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest">
                  logo
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Login + privacy — side-by-side on lg+, stacked otherwise. The
            privacy callout reads as a sidebar at desktop widths so it's
            visible without dominating. PLAN.md §7.2 display contract:
            never collapsed, body-copy weight, always present. */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-12 lg:gap-14 items-start">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6 text-center lg:text-left">
              Sign in
            </h2>
            <LoginForm initialError={errorCode} />
          </div>
          <PrivacyCallout copy={updraftPrivacyCopy} />
        </div>
      </div>
    </main>
  );
}
