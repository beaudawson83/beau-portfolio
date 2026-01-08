'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Button from './ui/Button';
import TerminalAnimation from './TerminalAnimation';
import { heroContent } from '@/lib/data';

export default function Hero() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToExperience = () => {
    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center pt-16 pb-12 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 2xl:gap-24 items-center">
          {/* Left: Text Block */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-2 lg:order-1"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-5xl 2xl:text-6xl font-bold leading-tight mb-4 sm:mb-6">
              {heroContent.headline}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl 2xl:text-2xl text-[#94A3B8] leading-relaxed mb-6 sm:mb-8 max-w-xl 2xl:max-w-2xl">
              {heroContent.subheader}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button variant="primary" onClick={scrollToContact}>
                {heroContent.primaryCTA}
              </Button>
              <Button variant="secondary" onClick={scrollToExperience}>
                {heroContent.secondaryCTA}
              </Button>
            </div>

            {/* Terminal Animation */}
            <div className="hidden lg:block">
              <TerminalAnimation />
            </div>
          </motion.div>

          {/* Right: Headshot */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <div className="relative w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 2xl:w-[28rem] 2xl:h-[28rem]">
              {/* Placeholder for headshot - replace with actual image */}
              <div className="relative w-full h-full rounded-sm overflow-hidden border border-[#1F1F1F] scanlines">
                <Image
                  src="/beau.jpg"
                  alt="Beau Dawson"
                  fill
                  className="object-cover grayscale contrast-125"
                  priority
                />

                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#7C3AED]" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#7C3AED]" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#7C3AED]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#7C3AED]" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
