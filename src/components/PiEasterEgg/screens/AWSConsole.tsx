'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLoginFieldsType } from '../useAutoType';
import { LoginScreenProps } from '../types';

export default function AWSConsole({ onPhaseChange, onComplete }: LoginScreenProps) {
  const { usernameText, passwordText, phase, isComplete, start } = useLoginFieldsType({
    username: 'svc-admin@awsinternal.com',
    password: 'r00t@cc3ss2024!',
    charDelay: 18,
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
    <div className="min-h-screen bg-[#232F3E] flex flex-col">
      {/* AWS Header */}
      <div className="bg-[#1A242F] py-3 px-6 border-b border-[#3B4859]">
        <div className="flex items-center gap-3">
          {/* AWS logo placeholder */}
          <div className="flex items-center gap-1">
            <span className="text-[#FF9900] font-bold text-xl">aws</span>
          </div>
          <span className="text-gray-400 text-sm">|</span>
          <span className="text-white text-sm">Management Console</span>
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
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h1 className="text-xl text-gray-800 font-medium mb-1">
                Sign in
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                IAM user
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1">
                    Account ID or alias
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="847293847293"
                    className="w-full px-3 py-2 border border-gray-300 rounded
                             text-gray-900 bg-gray-100 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1">
                    IAM user name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={usernameText}
                      className="w-full px-3 py-2 border border-gray-300 rounded
                               text-gray-900 bg-white focus:outline-none text-sm"
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
                               text-gray-900 bg-white focus:outline-none text-sm"
                    />
                    {phase === 'password' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2
                                     w-0.5 h-5 bg-gray-800 animate-pulse" />
                    )}
                  </div>
                </div>

                <button
                  className="w-full py-2 rounded text-sm font-medium bg-[#FF9900] text-gray-900"
                >
                  Sign in
                </button>

                <div className="text-center text-xs text-gray-500 mt-4">
                  <span className="text-[#0073BB] cursor-pointer">
                    Forgot password?
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-xl p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
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
                  Loading console...
                </div>
              </motion.div>
            </div>
          )}

          {/* Service icons decoration */}
          <div className="mt-6 flex justify-center gap-4 opacity-30">
            {['EC2', 'S3', 'RDS', 'Lambda'].map((svc) => (
              <div key={svc} className="text-white text-xs text-center">
                <div className="w-8 h-8 bg-[#FF9900]/20 rounded mb-1
                              flex items-center justify-center text-[#FF9900]">
                  ☁
                </div>
                {svc}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-4 px-6 text-center text-xs text-gray-500">
        © 2024, Amazon Web Services, Inc. or its affiliates
      </div>
    </div>
  );
}
