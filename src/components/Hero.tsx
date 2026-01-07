'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Button from './ui/Button';
import { heroContent } from '@/lib/data';

export default function Hero() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToExperience = () => {
    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center pt-12 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Block */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-2 lg:order-1"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              {heroContent.headline}
            </h1>
            <p className="text-lg sm:text-xl text-[#94A3B8] leading-relaxed mb-8 max-w-xl">
              {heroContent.subheader}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="primary" onClick={scrollToContact}>
                {heroContent.primaryCTA}
              </Button>
              <Button variant="secondary" onClick={scrollToExperience}>
                {heroContent.secondaryCTA}
              </Button>
            </div>
          </motion.div>

          {/* Right: Headshot */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
              {/* Placeholder for headshot - replace with actual image */}
              <div className="relative w-full h-full rounded-sm overflow-hidden border border-[#1F1F1F] scanlines">
                {/* Gradient background as placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1F1F1F] to-[#111111]" />

                {/* When you have an actual headshot, uncomment this: */}
                {/* <Image
                  src="/headshot.jpg"
                  alt="Beau Dawson"
                  fill
                  className="object-cover grayscale contrast-125"
                  priority
                /> */}

                {/* Placeholder content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center font-mono text-[#94A3B8]">
                    <div className="text-6xl mb-2">BD</div>
                    <div className="text-xs tracking-wider">[HEADSHOT]</div>
                  </div>
                </div>

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
