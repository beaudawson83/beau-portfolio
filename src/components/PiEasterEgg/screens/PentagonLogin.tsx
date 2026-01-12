'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLoginFieldsType } from '../useAutoType';
import { LoginScreenProps } from '../types';

export default function PentagonLogin({ onPhaseChange, onComplete }: LoginScreenProps) {
  const { usernameText, passwordText, phase, isComplete, start } = useLoginFieldsType({
    username: 'GEN.CLASSIFIED',
    password: 's1pr_n3t_acc3ss',
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
      {/* Pentagon Header */}
      <div className="bg-[#1A472A] py-3 px-6 border-b border-[#2A573A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* DoD Seal placeholder */}
            <div className="w-12 h-12 border-2 border-[#8B7355] rounded-full
                          flex items-center justify-center bg-[#1A472A]">
              <span className="text-[#8B7355] text-lg font-bold">DoD</span>
            </div>
            <div>
              <div className="text-white font-bold tracking-wider text-sm">
                DEPARTMENT OF DEFENSE
              </div>
              <div className="text-green-300 text-xs">
                SIPRNET ACCESS PORTAL
              </div>
            </div>
          </div>
          <div className="text-red-500 font-bold text-xs animate-pulse">
            ● CLASSIFIED
          </div>
        </div>
      </div>

      {/* SECRET Banner */}
      <div className="bg-red-700 py-2 px-6 text-center">
        <span className="text-white text-sm tracking-[0.3em] font-bold">
          SECRET // NOFORN // REL TO USA, FVEY
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="border-2 border-[#2A573A] bg-[#0F1A0F]">
            {/* Card header */}
            <div className="bg-[#1A472A] py-4 px-6 border-b border-[#2A573A]">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold tracking-wider">
                  SIPRNET GATEWAY
                </h2>
                <div className="text-xs text-green-300 font-mono">
                  NODE: PENTAGON-01
                </div>
              </div>
            </div>

            <div className="p-6">
              {!isComplete ? (
                <>
                  {/* CAC Notice */}
                  <div className="bg-yellow-900/30 border border-yellow-700/50 p-3 mb-4 text-xs">
                    <div className="flex items-center gap-2 text-yellow-500 font-bold">
                      <span>🔒</span>
                      <span>CAC AUTHENTICATION REQUIRED</span>
                    </div>
                    <p className="text-yellow-200/70 mt-1">
                      Insert CAC into reader or enter emergency credentials
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-green-400 text-xs font-mono mb-1 tracking-wider">
                        EDIPI / BADGE ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={usernameText}
                          className="w-full px-3 py-2 border border-[#2A573A] bg-black
                                   text-green-400 font-mono focus:outline-none text-sm
                                   uppercase"
                        />
                        {phase === 'username' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2
                                         w-0.5 h-5 bg-green-400 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-green-400 text-xs font-mono mb-1 tracking-wider">
                        PIN CODE
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          readOnly
                          value={passwordText}
                          className="w-full px-3 py-2 border border-[#2A573A] bg-black
                                   text-green-400 font-mono focus:outline-none text-sm"
                        />
                        {phase === 'password' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2
                                         w-0.5 h-5 bg-green-400 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <button
                      className="w-full py-3 font-mono text-sm tracking-wider font-bold
                        bg-[#1A472A] text-white hover:bg-[#2A573A] border border-[#2A573A]"
                    >
                      [ AUTHENTICATE ]
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono text-gray-500">
                    <div className="text-center p-2 border border-[#2A573A]/50">
                      <div className="text-green-500">●</div>
                      <div>COMSEC</div>
                    </div>
                    <div className="text-center p-2 border border-[#2A573A]/50">
                      <div className="text-green-500">●</div>
                      <div>TEMPEST</div>
                    </div>
                    <div className="text-center p-2 border border-[#2A573A]/50">
                      <div className="text-green-500">●</div>
                      <div>OPSEC</div>
                    </div>
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
                    CLEARANCE VERIFIED: SECRET
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 text-center text-xs text-gray-600 font-mono">
        SIPR-GW-001 • AES-256 • MILSPEC COMPLIANT
      </div>
    </div>
  );
}
