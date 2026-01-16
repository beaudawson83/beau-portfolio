'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import GlitchText from './GlitchText';
import HolographicFrame from './HolographicFrame';
import EnergyButton from './ui/EnergyButton';
import AskBeau from './AskBeau';
import { heroContent } from '@/lib/data';
import { trackCTAClick, trackSectionView } from '@/lib/analytics';

// Dynamic import for HeroBackground to avoid SSR issues with Three.js
const HeroBackground = dynamic(() => import('./HeroBackground'), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0 z-0"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.1) 0%, transparent 70%)',
      }}
    />
  ),
});

export default function Hero() {
  const hasTrackedView = useRef(false);

  // Track hero section view on mount (it's always visible first)
  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackSectionView('Hero');
    }
  }, []);

  const scrollToContact = () => {
    trackCTAClick('Connect With Me', 'Hero');
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToExperience = () => {
    trackCTAClick('View Experience', 'Hero');
    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-14 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden">
      {/* 3D Background */}
      <HeroBackground />

      {/* Content */}
      <div className="relative z-10 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 2xl:gap-24 items-center">
          {/* Left: Text Block */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 2.5 }}
            className="order-2 lg:order-1"
          >
            {/* Glitch decode headline */}
            <h1 className="font-bold leading-tight mb-3 sm:mb-4 md:mb-6">
              <div className="text-[clamp(1.25rem,5vw,3.75rem)]">
                <GlitchText
                  text="Infrastructure is the leverage most companies leave on the table."
                  as="span"
                  delay={2800}
                  duration={1500}
                  className="font-bold"
                />
              </div>
              <div className="text-[clamp(0.875rem,3vw,1.5rem)] mt-4">
                <GlitchText
                  text="Using a decade of in-the-trenches intuition and cutting-edge agentic automation, I help you outgrow the mess and build the systems that turn vision into effortless scale."
                  as="span"
                  delay={3200}
                  duration={1500}
                  className="font-bold"
                />
              </div>
            </h1>

            {/* Subheader with fade-in */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 4 }}
              className="text-sm sm:text-base md:text-lg lg:text-xl 2xl:text-2xl text-[#94A3B8] leading-relaxed mb-5 sm:mb-6 md:mb-8 max-w-xl 2xl:max-w-2xl"
            >
              {heroContent.subheader}
            </motion.p>

            {/* Energy Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 4.3 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8"
            >
              <EnergyButton variant="primary" onClick={scrollToContact}>
                {heroContent.primaryCTA}
              </EnergyButton>
              <EnergyButton variant="secondary" onClick={scrollToExperience}>
                {heroContent.secondaryCTA}
              </EnergyButton>
            </motion.div>

            {/* Ask Beau Terminal - Desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 4.6 }}
              className="hidden lg:block"
            >
              <AskBeau />
            </motion.div>
          </motion.div>

          {/* Right: Holographic Headshot */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 2.5 }}
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <div className="relative w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 2xl:w-[28rem] 2xl:h-[28rem]">
              <HolographicFrame
                src="/beau.jpg"
                alt="Beau Dawson"
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Ask Beau Terminal - Mobile/Tablet (below hero content) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 4.6 }}
          className="lg:hidden mt-8 sm:mt-10"
        >
          <AskBeau />
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#111111] to-transparent pointer-events-none z-10" />
    </section>
  );
}
