'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import NavigationButtons from '@/components/SystemLogs/NavigationButtons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/system-logs/create';
  const errorParam = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? 'AUTH_FAILED' : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn('credentials', {
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError('AUTH_FAILED');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111111] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <NavigationButtons variant="back" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border border-[#1F1F1F] bg-[#0D0D0D] p-8"
        >
          <div className="mb-6">
            <h1 className="font-mono text-xl text-white mb-1">
              <span className="text-[#7C3AED]">[</span>
              RESTRICTED_ACCESS
              <span className="text-[#7C3AED]">]</span>
            </h1>
            <p className="font-mono text-xs text-[#94A3B8]">
              {'//'} SYSTEM_ADMIN_AUTH_REQUIRED
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block font-mono text-xs text-[#94A3B8] mb-1"
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="w-full bg-[#111111] border border-[#1F1F1F] focus:border-[#7C3AED]/50 font-mono text-white px-3 py-2 outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="font-mono text-xs text-red-500 border border-red-500/50 bg-red-500/5 p-2">
                {'>'} {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password}
              className={`
                w-full font-mono text-sm px-6 py-2 border transition-colors
                ${
                  isSubmitting || !password
                    ? 'border-[#7C3AED]/30 text-[#7C3AED]/30 cursor-not-allowed'
                    : 'border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10'
                }
              `}
            >
              {isSubmitting ? '[ AUTHENTICATING... ]' : '[ AUTHENTICATE ]'}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#111111] flex items-center justify-center">
          <p className="font-mono text-xs text-[#94A3B8]">LOADING...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
