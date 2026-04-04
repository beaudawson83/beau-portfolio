'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import EnergyButton from './ui/EnergyButton';
import AskBeau from './AskBeau';
import { heroContent } from '@/lib/data';
import { trackCTAClick, trackSectionView } from '@/lib/analytics';

export default function Hero() {
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackSectionView('Hero');
    }
  }, []);

  const scrollToContact = () => {
    trackCTAClick('Get in Touch', 'Hero');
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToWork = () => {
    trackCTAClick('See My Work', 'Hero');
    document.getElementById('case-studies')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-14 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden">
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(124, 58, 237, 0.06) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="order-2 lg:order-1">
            {/* Name + Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-bold text-white leading-[1.1] mb-3">
                {heroContent.name}
              </h1>
              <p className="font-mono text-sm sm:text-base md:text-lg text-[#7C3AED] tracking-wide">
                {heroContent.title}
              </p>
            </motion.div>

            {/* Headline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/90 leading-snug mb-4"
            >
              {heroContent.headline}
            </motion.p>

            {/* Proof line */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-sm sm:text-base md:text-lg text-[#94A3B8] leading-relaxed mb-8 max-w-2xl"
            >
              {heroContent.subheader}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8"
            >
              <EnergyButton variant="primary" onClick={scrollToContact}>
                {heroContent.primaryCTA}
              </EnergyButton>
              <EnergyButton variant="secondary" onClick={scrollToWork}>
                {heroContent.secondaryCTA}
              </EnergyButton>
            </motion.div>

            {/* Ask Beau - Desktop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="hidden lg:block"
            >
              <AskBeau />
            </motion.div>
          </div>

          {/* Right: Headshot */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <div className="relative w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 2xl:w-[28rem] 2xl:h-[28rem]">
              <div className="w-full h-full rounded-2xl overflow-hidden border border-[#2A2A2A] shadow-2xl shadow-[#7C3AED]/5">
                <img
                  src="/beau.jpg"
                  alt="Beau Dawson"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ask Beau - Mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="lg:hidden mt-8 sm:mt-10"
        >
          <AskBeau />
        </motion.div>
      </div>
    </section>
  );
}
