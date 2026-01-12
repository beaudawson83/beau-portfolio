'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLoginFieldsType } from '../useAutoType';
import { LoginScreenProps } from '../types';

export default function LockheedLogin({ onPhaseChange, onComplete }: LoginScreenProps) {
  const { usernameText, passwordText, phase, isComplete, start } = useLoginFieldsType({
    username: 'j.reynolds_cleared',
    password: 'sk1ffw0rks2024',
    charDelay: 20,
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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <div className="bg-[#003366] py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* LM Star logo placeholder */}
            <div className="w-10 h-10 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-2xl">★</span>
              </div>
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-wide">
                LOCKHEED MARTIN
              </span>
              <div className="text-blue-200 text-xs">
                Secure Access Portal
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ITAR Warning Banner */}
      <div className="bg-yellow-100 border-b border-yellow-300 px-6 py-2">
        <div className="flex items-center gap-2 text-yellow-800 text-xs">
          <span className="font-bold">⚠ ITAR CONTROLLED:</span>
          <span>This system contains export-controlled technical data.</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <div className="bg-[#003366] py-3 px-6">
            <h2 className="text-white font-medium">Employee Portal Access</h2>
          </div>

          <div className="p-6">
            {!isComplete ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Corporate ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={usernameText}
                        className="w-full px-3 py-2 border border-gray-300 rounded
                                 text-gray-900 bg-white focus:outline-none"
                      />
                      {phase === 'username' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2
                                       w-0.5 h-5 bg-gray-800 animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        readOnly
                        value={passwordText}
                        className="w-full px-3 py-2 border border-gray-300 rounded
                                 text-gray-900 bg-white focus:outline-none"
                      />
                      {phase === 'password' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2
                                       w-0.5 h-5 bg-gray-800 animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked readOnly className="rounded" />
                    <span>Remember this device</span>
                  </div>

                  <button
                    className="w-full py-2 rounded font-medium bg-[#003366] text-white"
                  >
                    Sign In
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                  <p>For RSA SecurID issues, contact IT Help Desk</p>
                  <p className="mt-1">1-800-555-0199</p>
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
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500
                           flex items-center justify-center"
                >
                  <span className="text-white text-2xl">✓</span>
                </motion.div>
                <div className="text-green-600 font-medium text-lg">
                  ACCESS GRANTED
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  Clearance verified
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 text-center text-xs text-gray-400">
        © Lockheed Martin Corporation. All rights reserved.
      </div>
    </div>
  );
}
