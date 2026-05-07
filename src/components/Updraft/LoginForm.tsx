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

const TRUST_SIGNALS = [
  { icon: 'lock', label: 'Passwordless' },
  { icon: 'shield', label: 'GDPR by design' },
  { icon: 'clock', label: '30-day deletion' },
] as const;

type IconName = 'lock' | 'shield' | 'clock' | 'mail' | 'arrow';

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      );
  }
}

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
      <div className="text-center py-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#8b6dff]/15 text-[#8b6dff] items-center justify-center mb-4">
          <Icon name="mail" size={26} />
        </div>
        <h3 className="text-xl font-semibold text-white tracking-tight">
          Check your email
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          We sent a sign-in link to
          <br />
          <span className="text-white font-medium">{email}</span>
        </p>
        <p className="mt-3 text-xs text-white/55">
          The link expires in 15 minutes.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setEmail('');
          }}
          className="mt-3 text-sm font-medium text-[#8b6dff] hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="email" className="block">
          <span className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/55 mb-2">
            Email
          </span>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === 'sending'}
            className="w-full bg-[#0a0910] border border-white/[0.08] focus:border-[#8b6dff] focus:ring-2 focus:ring-[#8b6dff]/30 rounded-xl px-3.5 py-3 text-[15px] text-white outline-none transition placeholder:text-white/30 disabled:opacity-60"
          />
        </label>

        {errorMessage && (
          <p role="alert" className="text-sm text-[#ff8484]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending' || !email.trim()}
          className="w-full mt-1 inline-flex items-center justify-center gap-2 bg-[#8b6dff] hover:bg-[#7c5dff] active:scale-[0.99] text-white font-semibold rounded-xl px-3.5 py-3 text-[15px] shadow-[0_8px_24px_-8px_rgba(139,109,255,0.7)] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? (
            'Sending link…'
          ) : (
            <>
              Email me a sign-in link
              <Icon name="arrow" size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-white/[0.08] flex justify-between gap-3">
        {TRUST_SIGNALS.map(({ icon, label }) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center gap-1.5 text-center text-[11px] text-white/55"
          >
            <span className="text-[#8b6dff]">
              <Icon name={icon as IconName} size={16} />
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
