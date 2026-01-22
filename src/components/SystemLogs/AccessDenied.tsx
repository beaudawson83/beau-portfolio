'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface AccessDeniedProps {
  email?: string;
}

export default function AccessDenied({ email }: AccessDeniedProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/system-logs');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      {/* Scanline effect */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center font-mono max-w-md"
      >
        {/* Access Denied Header */}
        <motion.div
          animate={{
            textShadow: [
              '0 0 10px #ef4444',
              '0 0 20px #ef4444',
              '0 0 10px #ef4444',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-red-500 text-4xl md:text-5xl tracking-wider mb-8"
        >
          ACCESS_DENIED
        </motion.div>

        {/* Error Code */}
        <div className="text-[#94A3B8] text-sm mb-6">
          <span className="text-red-500">[ ERROR_401 ]</span> // UNAUTHORIZED_ACCESS
        </div>

        {/* Email Info */}
        {email && (
          <div className="text-[#94A3B8]/60 text-xs mb-8">
            CREDENTIAL: {email}
            <br />
            STATUS: NOT_IN_WHITELIST
          </div>
        )}

        {/* Redirect Notice */}
        <div className="text-[#94A3B8]/40 text-xs">
          REDIRECTING_TO_PUBLIC_LOGS IN {countdown}...
        </div>

        {/* Manual Link */}
        <motion.a
          href="/system-logs"
          whileHover={{ scale: 1.02 }}
          className="inline-block mt-8 text-[#7C3AED] text-sm hover:underline"
        >
          [ RETURN_TO_PUBLIC_LOGS ]
        </motion.a>
      </motion.div>
    </div>
  );
}
