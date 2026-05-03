import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSessionUserIdFromCookies } from '@/lib/updraft/auth';
import { updraftPrivacyCopy } from '@/lib/data';
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
        {/* Brand mark */}
        <div className="max-w-md mx-auto mb-10 text-center">
          <p className="text-xs tracking-widest text-[#7C3AED] uppercase mb-2">
            UpDraft · by BAD Labs
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold">Sign in</h1>
          <p className="text-sm text-[#94A3B8] mt-3">
            Resume + cover-letter builder. ATS-safe by default.
          </p>
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
