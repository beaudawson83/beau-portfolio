'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLoginFieldsType } from '../useAutoType';
import { LoginScreenProps } from '../types';

export default function MI6Login({ onPhaseChange, onComplete }: LoginScreenProps) {
  const { usernameText, passwordText, phase, isComplete, start } = useLoginFieldsType({
    username: 'OPERATIVE_007',
    password: 'g0lds4v3_uk',
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
      {/* MI6 Header */}
      <div className="bg-[#1D4D2E] py-3 px-6 border-b border-[#2D6D3E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Crown/crest placeholder */}
            <div className="w-10 h-10 border-2 border-[#CFB53B] rounded-full
                          flex items-center justify-center">
              <span className="text-[#CFB53B] text-lg">♔</span>
            </div>
            <div>
              <div className="text-white font-medium tracking-wider text-sm">
                SECRET INTELLIGENCE SERVICE
              </div>
              <div className="text-[#CFB53B] text-xs tracking-widest">
                MI6 • SIS
              </div>
            </div>
          </div>
          <div className="text-[#CFB53B] text-xs">
            UK EYES ONLY
          </div>
        </div>
      </div>

      {/* Classification Banner */}
      <div className="bg-[#1D4D2E]/50 py-1 px-6 text-center">
        <span className="text-[#CFB53B] text-xs tracking-[0.2em]">
          TOP SECRET // STRAP 1 // UK EYES ONLY
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="border border-[#2D6D3E] bg-[#0F0F0F]">
            {/* Card header */}
            <div className="bg-[#1D4D2E] py-3 px-6 border-b border-[#2D6D3E]">
              <h2 className="text-white font-mono text-sm tracking-wider">
                SECURE PORTAL ACCESS
              </h2>
            </div>

            <div className="p-6">
              {!isComplete ? (
                <>
                  <div className="text-center mb-6">
                    <div className="text-[#CFB53B] text-xs tracking-[0.3em] mb-2">
                      AUTHORISED PERSONNEL ONLY
                    </div>
                    <div className="text-gray-500 text-xs">
                      Vauxhall Cross Secure Network
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-xs font-mono mb-1 tracking-wider">
                        OPERATIVE ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={usernameText}
                          className="w-full px-3 py-2 border border-[#2D6D3E] bg-black
                                   text-green-400 font-mono focus:outline-none text-sm"
                        />
                        {phase === 'username' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2
                                         w-0.5 h-5 bg-green-400 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs font-mono mb-1 tracking-wider">
                        ACCESS CODE
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          readOnly
                          value={passwordText}
                          className="w-full px-3 py-2 border border-[#2D6D3E] bg-black
                                   text-green-400 font-mono focus:outline-none text-sm"
                        />
                        {phase === 'password' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2
                                         w-0.5 h-5 bg-green-400 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <button
                      className="w-full py-2 border font-mono text-sm tracking-wider
                        bg-transparent border-[#2D6D3E] text-[#CFB53B] hover:bg-[#1D4D2E]/50"
                    >
                      [ AUTHENTICATE ]
                    </button>
                  </div>

                  <div className="mt-6 text-center text-xs text-gray-600">
                    <p>Biometric verification may be required</p>
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
                  <div className="text-gray-500 text-xs mt-2 tracking-wider">
                    WELCOME, OPERATIVE
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 text-center text-xs text-gray-600 font-mono">
        SIS-SEC-7742 • ENCRYPTED • v3.1.4
      </div>
    </div>
  );
}
