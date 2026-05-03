'use client';

import { FormEvent, useState } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  'bad-link':
    'That sign-in link looked malformed. Request a fresh one below.',
  'expired-or-used':
    'That link has expired or already been used. Each link is single-use and lasts 15 minutes.',
  'account-error':
    "We couldn't set up your account. Try again, or reach out at beau.dawson83@gmail.com if it persists.",
};

export default function LoginForm({ initialError }: { initialError?: string | null }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ? ERROR_MESSAGES[initialError] ?? null : null,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/updraft/auth/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(body.error || 'Could not send the sign-in link. Try again.');
        return;
      }

      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Check your connection and try again.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
        <p className="text-sm text-[#cbd5e1]">
          We sent a sign-in link to <span className="text-white">{email}</span>.
          It expires in 15 minutes and works once.
        </p>
        <p className="text-xs text-[#94A3B8] mt-4">
          Wrong address?{' '}
          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setEmail('');
            }}
            className="underline hover:text-[#7C3AED] transition-colors"
          >
            Try a different one
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs text-[#94A3B8] mb-1.5">
          EMAIL
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#7C3AED] px-4 py-2.5 text-sm text-white outline-none transition-colors rounded-lg"
          disabled={status === 'sending'}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending' || !email.trim()}
        className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {status === 'sending' ? 'Sending link…' : 'Email me a sign-in link'}
      </button>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <p className="text-xs text-[#94A3B8] pt-1">
        We&apos;ll email you a one-time link. No password required.
      </p>
    </form>
  );
}
