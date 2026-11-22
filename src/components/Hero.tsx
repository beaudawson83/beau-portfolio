'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
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

  const ease = [0.22, 1, 0.36, 1] as const;
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease },
  });

  return (
    <section className="relative min-h-screen flex items-center pt-24 sm:pt-28 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden">
      <div className="relative z-10 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-10 md:gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="order-2 lg:order-1">
            {/* Title */}
            <motion.p {...rise(0.05)} className="ui-eyebrow mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-bright" />
              {heroContent.title}
            </motion.p>

            {/* Name */}
            <motion.h1
              {...rise(0.12)}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] 2xl:text-8xl font-semibold tracking-[-0.045em] text-ink leading-[0.95] mb-6"
            >
              {heroContent.name}
            </motion.h1>

            {/* Headline */}
            <motion.p
              {...rise(0.2)}
              className="ui-gradient-text text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.02em] leading-tight mb-5 pb-1"
            >
              {heroContent.headline}
            </motion.p>

            {/* Proof line */}
            <motion.p
              {...rise(0.28)}
              className="text-base md:text-lg text-muted leading-relaxed mb-9 max-w-2xl"
            >
              {heroContent.subheader}
            </motion.p>

            {/* CTAs */}
            <motion.div {...rise(0.36)} className="flex flex-col sm:flex-row gap-3 mb-9">
              <EnergyButton variant="primary" onClick={scrollToContact}>
                {heroContent.primaryCTA}
              </EnergyButton>
              <EnergyButton variant="secondary" onClick={scrollToWork}>
                {heroContent.secondaryCTA}
              </EnergyButton>
            </motion.div>

            {/* Ask Beau - Desktop */}
            <motion.div {...rise(0.44)} className="hidden lg:block">
              <AskBeau />
            </motion.div>
          </div>

          {/* Right: Headshot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease }}
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-[26rem] lg:h-[26rem] 2xl:w-[30rem] 2xl:h-[30rem]">
              {/* Glow behind the portrait */}
              <div
                aria-hidden="true"
                className="ui-float absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.45),rgb(232_121_249/0.15)_45%,transparent_70%)] blur-2xl"
              />
              {/* Gradient ring frame */}
              <div className="relative h-full w-full rounded-[2rem] p-px bg-gradient-to-br from-white/40 via-accent/40 to-transparent shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)]">
                <div className="h-full w-full rounded-[calc(2rem-1px)] overflow-hidden bg-surface">
                  <Image
                    src="/beau.jpg"
                    alt="Beau Dawson"
                    width={480}
                    height={480}
                    priority
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ask Beau - Mobile */}
        <motion.div {...rise(0.44)} className="lg:hidden mt-8 sm:mt-10">
          <AskBeau />
        </motion.div>
      </div>
    </section>
  );
}
