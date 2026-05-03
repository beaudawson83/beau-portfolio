import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { updraftLogoPath, updraftPrivacyCopy } from '@/lib/data';
import LoginForm from '@/components/Updraft/LoginForm';
import PrivacyCallout from '@/components/Updraft/PrivacyCallout';

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
        {/* Brand mark — UpDraft is the hero; BAD Labs is the credit */}
        <div className="max-w-md mx-auto mb-12 text-center">
          {/* Logo slot — set updraftLogoPath in src/lib/data.ts to swap in */}
          {updraftLogoPath ? (
            <div className="relative w-24 h-24 mx-auto mb-6">
              <Image
                src={updraftLogoPath}
                alt="UpDraft"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div
              className="w-24 h-24 mx-auto mb-6 border-2 border-dashed border-[#2A2A2A] rounded-xl flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-[10px] text-[#64748b] font-mono uppercase tracking-widest">
                logo
              </span>
            </div>
          )}

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white">
            UpDraft
          </h1>
          <p className="mt-2 text-xs tracking-widest text-[#7C3AED] uppercase">
            by BAD Labs
          </p>
          <h2 className="mt-8 text-xl sm:text-2xl font-semibold text-white">
            Sign in
          </h2>
        </div>

        {/* Login functionality — top of the page */}
        <div className="max-w-md mx-auto">
          <LoginForm initialError={errorCode} />
        </div>

        {/* Privacy callout — directly below the login functionality, body
            copy weight, never collapsed. PLAN.md §7.2 display contract. */}
        <PrivacyCallout copy={updraftPrivacyCopy} />
      </div>
    </main>
  );
}
