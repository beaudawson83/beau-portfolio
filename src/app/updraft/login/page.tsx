import type { Metadata } from 'next';
import Image from 'next/image';
import { Orbitron } from 'next/font/google';
import { redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { updraftLogoPath, updraftPrivacyCopy } from '@/lib/data';
import LoginForm from '@/components/Updraft/LoginForm';
import PrivacyCallout from '@/components/Updraft/PrivacyCallout';

// Sci-fi display font for the UpDraft wordmark. Scoped to this page —
// not loaded on the rest of the site.
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
    <main
      className="min-h-screen text-white"
      style={{
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(139,109,255,0.10), transparent 60%), #0e0d12',
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Brand lockup — logo butted against UpDraft wordmark, "BY BAD LABS"
            centered underneath. Single self-contained inline-flex block. */}
        <div className="flex justify-center mb-10 sm:mb-14">
          <div className="inline-flex items-center">
            {updraftLogoPath ? (
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 -mr-3 sm:-mr-4 flex-shrink-0">
                <Image
                  src={updraftLogoPath}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="(min-width: 640px) 128px, 112px"
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div
                className="w-28 h-28 sm:w-32 sm:h-32 -mr-3 sm:-mr-4 flex-shrink-0 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest">
                  logo
                </span>
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 leading-none">
              <h1
                className={`${orbitron.className} text-5xl sm:text-6xl font-black tracking-tight text-white leading-none m-0`}
              >
                UpDraft
              </h1>
              <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-semibold text-[#8b6dff] whitespace-nowrap leading-none">
                by Bad Labs
              </span>
            </div>
          </div>
        </div>

        {/* Sign-in card — centered, ~420px wide, lifted off the page with a
            soft shadow. Card owns the form + trust row + success state. */}
        <div className="max-w-md mx-auto">
          <div className="bg-[#15141b] border border-white/[0.08] rounded-2xl p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Sign in to UpDraft
              </h2>
              <p className="mt-1.5 text-sm text-white/55 leading-relaxed">
                We&apos;ll email you a one-time link. No password required.
              </p>
            </div>
            <LoginForm initialError={errorCode} />
          </div>
        </div>

        {/* Canonical privacy copy. Always visible, body-copy weight, never
            collapsed (PLAN.md §7.2). Sits below the card as a continuation,
            not a competing sidebar. */}
        <div className="max-w-2xl mx-auto mt-12 sm:mt-14">
          <PrivacyCallout copy={updraftPrivacyCopy} />
        </div>
      </div>
    </main>
  );
}
