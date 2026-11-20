'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { modules } from '@/lib/data';
import { relativeShort } from '@/lib/module-telemetry';
import { useTrackSectionWithRef } from '@/hooks/useTrackSection';
import type { ModuleEntry, ModuleTelemetry } from '@/types';
import ModuleCard, { type ModuleStat } from './ModuleCard';

export default function Modules({ telemetry }: { telemetry: ModuleTelemetry }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useTrackSectionWithRef(ref, 'Modules');

  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto" ref={ref}>
        {/* Section header — eyebrow / H2 / tagline matches TelemetryGrid +
            CaseStudies + BadLabsShowcase pattern. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 sm:mb-12"
        >
          <p className="ui-eyebrow mb-4">
            Active projects
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink mb-3">
            Modules
          </h2>
          <p className="text-base sm:text-lg text-muted">
            Check out what I&apos;m building.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {modules.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <ModuleCard module={m} stats={statsFor(m, telemetry)} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function statsFor(m: ModuleEntry, t: ModuleTelemetry): ModuleStat[] {
  if (m.id === 'conflict' && t.conflict) {
    const n = t.conflict.active;
    return [
      { key: 'ACTIVE', value: `${n} ${n === 1 ? 'conflict' : 'conflicts'}` },
      { key: 'INGEST', value: relativeShort(t.conflict.lastIngest) },
    ];
  }
  if (m.id === 'blog' && t.blog) {
    const n = t.blog.posts;
    return [
      { key: 'POSTS', value: `${n} ${n === 1 ? 'post' : 'posts'}` },
      { key: 'LATEST', value: relativeShort(t.blog.latest) },
    ];
  }
  return [];
}
