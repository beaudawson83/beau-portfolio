'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewsletterCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('INVALID_EMAIL_FORMAT');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('SUBSCRIPTION_CONFIRMED');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'SUBSCRIPTION_FAILED');
      }
    } catch {
      setStatus('error');
      setMessage('NETWORK_ERROR');
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-[#1F1F1F]">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="font-mono text-xs text-[#94A3B8] mb-4 text-center">
          {'>'} SUBSCRIBE_TO_UPDATES
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[#7C3AED] text-sm">
                {'$'}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                placeholder="EMAIL_ADDRESS"
                disabled={status === 'loading' || status === 'success'}
                className={`
                  w-full bg-[#0a0a0a] border font-mono text-sm text-white
                  pl-8 pr-4 py-3 placeholder:text-[#94A3B8]/50
                  focus:outline-none transition-colors
                  ${
                    status === 'error'
                      ? 'border-red-500/50 focus:border-red-500'
                      : status === 'success'
                      ? 'border-green-500/50'
                      : 'border-[#1F1F1F] focus:border-[#7C3AED]/50'
                  }
                `}
              />
            </div>

            <motion.button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              whileHover={{ scale: status === 'idle' ? 1.02 : 1 }}
              whileTap={{ scale: status === 'idle' ? 0.98 : 1 }}
              className={`
                font-mono text-xs px-4 py-3 border transition-colors
                ${
                  status === 'loading'
                    ? 'border-[#7C3AED]/50 text-[#7C3AED]/50 cursor-wait'
                    : status === 'success'
                    ? 'border-green-500/50 text-green-500 cursor-default'
                    : 'border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10'
                }
              `}
            >
              {status === 'loading' ? (
                '[ ... ]'
              ) : status === 'success' ? (
                '[ OK ]'
              ) : (
                '[ SUBSCRIBE ]'
              )}
            </motion.button>
          </div>

          {/* Status Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`
                  absolute mt-2 font-mono text-xs
                  ${status === 'error' ? 'text-red-500' : 'text-green-500'}
                `}
              >
                {'>'} {message}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Description */}
        <p className="font-mono text-[10px] text-[#94A3B8]/50 mt-6 text-center">
          [ RECEIVE_UPDATES_ON_NEW_SYSTEM_LOGS ]
        </p>
      </div>
    </div>
  );
}
