'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginState } from './types';

interface ClassifiedLoginProps {
  isActive: boolean;
  onClose: () => void;
}

export default function ClassifiedLogin({ isActive, onClose }: ClassifiedLoginProps) {
  const [loginState, setLoginState] = useState<LoginState>({
    username: '',
    password: '',
    status: 'idle',
    attempts: 0,
  });

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isActive, handleEscape]);

  useEffect(() => {
    if (!isActive) {
      setLoginState({
        username: '',
        password: '',
        status: 'idle',
        attempts: 0,
      });
    }
  }, [isActive]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginState.username || !loginState.password) return;

    setLoginState(prev => ({ ...prev, status: 'authenticating' }));

    setTimeout(() => {
      const newAttempts = loginState.attempts + 1;

      if (newAttempts >= 3) {
        setLoginState(prev => ({
          ...prev,
          status: 'granted',
          attempts: newAttempts,
        }));
      } else {
        setLoginState(prev => ({
          ...prev,
          status: 'denied',
          attempts: newAttempts,
          password: '',
        }));

        setTimeout(() => {
          setLoginState(prev => ({ ...prev, status: 'idle' }));
        }, 1500);
      }
    }, 1500);
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center p-4"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/30 hover:text-white/60
                   transition-colors font-mono text-sm"
      >
        [ESC]
      </button>

      {/* Main content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="relative bg-[#111111] border border-[#1F1F1F] w-full max-w-md"
      >
        {/* Classified stamp */}
        <div className="absolute -top-3 -right-3 transform rotate-12 z-10">
          <span className="stamp-classified text-xs px-2 py-1">
            CLASSIFIED
          </span>
        </div>

        {/* Top secret banner */}
        <div className="bg-red-900/30 border-b border-red-900/50 py-2 px-4">
          <div className="font-mono text-red-500 text-xs tracking-[0.3em] text-center">
            TOP SECRET // NOFORN // ORCON
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Seal/Logo */}
          <div className="text-center mb-6">
            <div className="font-mono text-[#94A3B8]/60 text-xs mb-2">
              ╔═══════════════════════╗
            </div>
            <div className="font-mono text-white/80 text-sm tracking-widest">
              INTER-AGENCY
            </div>
            <div className="font-mono text-white/80 text-sm tracking-widest">
              SECURITY DIRECTORATE
            </div>
            <div className="font-mono text-[#94A3B8]/60 text-xs mt-2">
              ╚═══════════════════════╝
            </div>
          </div>

          {/* Redacted info */}
          <div className="mb-6 space-y-2 text-xs font-mono">
            <div className="flex gap-2">
              <span className="text-[#94A3B8]/60">OPERATION:</span>
              <span className="redacted px-8">REDACTED</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#94A3B8]/60">CLEARANCE:</span>
              <span className="redacted px-6">LEVEL 5</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#94A3B8]/60">HANDLER:</span>
              <span className="redacted px-12">CLASSIFIED</span>
            </div>
          </div>

          {/* Status messages */}
          <AnimatePresence mode="wait">
            {loginState.status === 'authenticating' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="font-mono text-yellow-500 text-sm animate-pulse">
                  VERIFYING CREDENTIALS...
                </div>
                <div className="mt-2 font-mono text-[#94A3B8]/40 text-xs">
                  CONNECTING TO SECURE SERVER
                </div>
              </motion.div>
            )}

            {loginState.status === 'denied' && (
              <motion.div
                key="denied"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
                exit={{ opacity: 0 }}
                transition={{ x: { duration: 0.4 } }}
                className="text-center py-8"
              >
                <div className="font-mono text-red-500 text-lg tracking-widest">
                  ACCESS DENIED
                </div>
                <div className="mt-2 font-mono text-[#94A3B8]/40 text-xs">
                  ATTEMPT {loginState.attempts} OF 3
                </div>
              </motion.div>
            )}

            {loginState.status === 'granted' && (
              <motion.div
                key="granted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ backgroundColor: 'transparent' }}
                  animate={{
                    backgroundColor: ['transparent', 'rgba(16, 185, 129, 0.2)', 'transparent'],
                  }}
                  transition={{ duration: 0.5 }}
                  className="font-mono text-green-500 text-lg tracking-widest p-4"
                >
                  ACCESS GRANTED
                </motion.div>
                <div className="mt-2 font-mono text-[#94A3B8]/40 text-xs">
                  WELCOME, OPERATOR
                </div>
                <div className="mt-4 font-mono text-[#94A3B8]/60 text-xs">
                  [DASHBOARD COMING SOON]
                </div>
              </motion.div>
            )}

            {loginState.status === 'idle' && (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block font-mono text-[#94A3B8]/60 text-xs mb-1">
                    {'>'} OPERATOR_ID:
                  </label>
                  <input
                    type="text"
                    value={loginState.username}
                    onChange={e => setLoginState(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-black/50 border border-[#1F1F1F] px-3 py-2
                             font-mono text-sm text-white focus:outline-none
                             focus:border-[#7C3AED]/50 transition-colors"
                    placeholder="Enter ID..."
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[#94A3B8]/60 text-xs mb-1">
                    {'>'} ACCESS_CODE:
                  </label>
                  <input
                    type="password"
                    value={loginState.password}
                    onChange={e => setLoginState(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-black/50 border border-[#1F1F1F] px-3 py-2
                             font-mono text-sm text-white focus:outline-none
                             focus:border-[#7C3AED]/50 transition-colors"
                    placeholder="Enter code..."
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!loginState.username || !loginState.password}
                  className="w-full bg-[#1F1F1F] border border-[#2F2F2F] py-2
                           font-mono text-sm text-white tracking-wider
                           hover:bg-[#2F2F2F] hover:border-[#7C3AED]/50
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
                >
                  [ AUTHENTICATE ]
                </button>

                {loginState.attempts > 0 && (
                  <div className="text-center font-mono text-[#94A3B8]/40 text-xs">
                    FAILED ATTEMPTS: {loginState.attempts}
                  </div>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1F1F1F] py-2 px-4">
          <div className="flex justify-between font-mono text-[#94A3B8]/30 text-xs">
            <span>SEC-7742-A</span>
            <span>ENCRYPTED</span>
            <span>v2.4.1</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
