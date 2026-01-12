'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLoginFieldsType } from '../useAutoType';
import { LoginScreenProps } from '../types';

export default function StanfordLogin({ onPhaseChange, onComplete }: LoginScreenProps) {
  const { usernameText, passwordText, phase, isComplete, start } = useLoginFieldsType({
    username: 'admin_sysroot',
    password: 'c0nf1d3nt14l',
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Stanford Header */}
      <div className="bg-[#8C1515] py-3 px-6">
        <div className="flex items-center gap-3">
          {/* Stanford "S" logo placeholder */}
          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
            <span className="text-white font-serif font-bold text-xl">S</span>
          </div>
          <span className="text-white font-serif text-lg tracking-wide">
            Stanford University
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {!isComplete ? (
            <>
              <h1 className="text-2xl text-gray-800 font-normal mb-2">
                Stanford WebLogin
              </h1>
              <p className="text-gray-600 text-sm mb-6">
                Sign in with your SUNet ID
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1">
                    SUNet ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={usernameText}
                      className="w-full px-3 py-2 border border-gray-300 rounded
                               text-gray-900 bg-gray-50 focus:outline-none"
                    />
                    {phase === 'username' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2
                                     w-0.5 h-5 bg-gray-800 animate-pulse" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      readOnly
                      value={passwordText}
                      className="w-full px-3 py-2 border border-gray-300 rounded
                               text-gray-900 bg-gray-50 focus:outline-none"
                    />
                    {phase === 'password' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2
                                     w-0.5 h-5 bg-gray-800 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Radio buttons */}
                <div className="flex gap-6 text-sm text-gray-600">
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-gray-400 rounded-full" />
                    Student
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-gray-400 rounded-full
                                   bg-[#8C1515] border-[#8C1515] relative">
                      <span className="absolute inset-1 bg-white rounded-full" />
                    </span>
                    Faculty/Staff
                  </label>
                </div>

                <button
                  className="w-full py-2 rounded font-medium bg-[#8C1515] text-white"
                >
                  Sign In
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">
                <a href="#" className="hover:underline">Forgot password?</a>
                <span className="mx-2">|</span>
                <a href="#" className="hover:underline">Help</a>
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
                Redirecting...
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 text-center text-xs text-gray-400">
        © Stanford University | Privacy Policy | Terms of Use
      </div>
    </div>
  );
}
