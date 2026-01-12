'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLoginFieldsType } from '../useAutoType';
import { LoginScreenProps } from '../types';

export default function CIALogin({ onPhaseChange, onComplete }: LoginScreenProps) {
  const { usernameText, passwordText, phase, isComplete, start } = useLoginFieldsType({
    username: 'REDACTED_ANALYST',
    password: 'l4ngl3y_s3c',
    charDelay: 22,
  });

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (isComplete) {
      onPhaseChange?.('authenticating');
      const authTimer = setTimeout(() => {
        onPhaseChange?.('granted');
        const grantedTimer = setTimeout(() => {
          onComplete();
        }, 400);
        return () => clearTimeout(grantedTimer);
      }, 300);
      return () => clearTimeout(authTimer);
    }
  }, [isComplete, onPhaseChange, onComplete]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* CIA Header */}
      <div className="bg-[#0A1628] py-3 px-6 border-b border-[#1A3050]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Eagle seal placeholder */}
            <div className="w-12 h-12 border-2 border-white/30 rounded-full
                          flex items-center justify-center bg-[#0A1628]">
              <span className="text-white text-xl">🦅</span>
            </div>
            <div>
              <div className="text-white font-bold tracking-wider text-sm">
                CENTRAL INTELLIGENCE AGENCY
              </div>
              <div className="text-blue-300 text-xs">
                United States of America
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classification Banner */}
      <div className="bg-red-900/80 py-1 px-6 text-center">
        <span className="text-white text-xs tracking-[0.2em] font-bold">
          TOP SECRET // SCI // NOFORN // ORCON
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="border border-[#1A3050] bg-[#0A1628]">
            {/* Card header */}
            <div className="bg-[#0A1628] py-4 px-6 border-b border-[#1A3050] text-center">
              <div className="text-white/60 text-xs tracking-[0.3em] mb-1">
                CLASSIFIED NETWORK ACCESS
              </div>
              <h2 className="text-white font-bold text-lg tracking-wider">
                JWICS PORTAL
              </h2>
            </div>

            <div className="p-6">
              {!isComplete ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-blue-300 text-xs font-mono mb-1 tracking-wider">
                        BADGE NUMBER
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={usernameText}
                          className="w-full px-3 py-2 border border-[#1A3050] bg-black
                                   text-white font-mono focus:outline-none text-sm"
                        />
                        {phase === 'username' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2
                                         w-0.5 h-5 bg-blue-400 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-blue-300 text-xs font-mono mb-1 tracking-wider">
                        PIN + RSA TOKEN
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          readOnly
                          value={passwordText}
                          className="w-full px-3 py-2 border border-[#1A3050] bg-black
                                   text-white font-mono focus:outline-none text-sm"
                        />
                        {phase === 'password' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2
                                         w-0.5 h-5 bg-blue-400 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div className="bg-[#0A1628] border border-[#1A3050] p-3 text-xs">
                      <div className="flex items-center gap-2 text-yellow-500">
                        <span>⚠</span>
                        <span className="font-bold">WARNING</span>
                      </div>
                      <p className="text-gray-400 mt-1">
                        Unauthorized access is a federal crime punishable under
                        18 U.S.C. § 1030
                      </p>
                    </div>

                    <button
                      className="w-full py-2 font-mono text-sm tracking-wider
                        bg-[#1A3050] text-white hover:bg-[#2A4060]"
                    >
                      AUTHENTICATE
                    </button>
                  </div>

                  <div className="mt-6 text-center text-xs text-gray-600">
                    <p>CAC/PIV Card Required for Full Access</p>
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="w-16 h-16 mx-auto mb-4 border-2 border-green-500 rounded-full
                             flex items-center justify-center"
                  >
                    <span className="text-green-500 text-2xl">✓</span>
                  </motion.div>
                  <div className="text-green-500 font-mono text-lg tracking-wider">
                    ACCESS GRANTED
                  </div>
                  <div className="text-gray-500 text-xs mt-2">
                    CLEARANCE: TS/SCI
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 text-center text-xs text-gray-600 font-mono">
        JWICS-NODE-7742 • ENCRYPTED • COMSEC ACTIVE
      </div>
    </div>
  );
}
