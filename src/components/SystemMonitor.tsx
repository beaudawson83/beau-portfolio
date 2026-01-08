'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface MetricBar {
  label: string;
  value: number;
  unit: string;
  color: 'violet' | 'green' | 'blue';
}

function AnimatedBar({ label, value, unit, color, delay }: MetricBar & { delay: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [targetValue, setTargetValue] = useState(value);

  useEffect(() => {
    // Animate to initial value
    const duration = 1500;
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplayValue(Math.round(startValue + (targetValue - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timeout = setTimeout(() => requestAnimationFrame(animate), delay);
    return () => clearTimeout(timeout);
  }, [targetValue, delay]);

  // Periodically fluctuate values
  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 10;
      setTargetValue(Math.max(0, Math.min(100, value + fluctuation)));
    }, 2000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [value]);

  const colorClasses = {
    violet: 'bg-[#7C3AED]',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-[#94A3B8] font-mono text-xs w-24 uppercase">{label}</span>
      <div className="flex-1 h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colorClasses[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${displayValue}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-white font-mono text-xs w-14 text-right">
        {displayValue}{unit}
      </span>
    </div>
  );
}

function Sparkline() {
  const [data, setData] = useState<number[]>([30, 45, 35, 60, 55, 75, 65, 80, 70, 85, 75, 90]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1), Math.random() * 60 + 30];
        return newData;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="#7C3AED"
        strokeWidth="2"
        points={points}
        className="transition-all duration-500"
      />
      <polygon
        fill="url(#sparklineGradient)"
        points={`0,100 ${points} 100,100`}
        className="transition-all duration-500"
      />
    </svg>
  );
}

function AnimatedCounter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target]);

  // Increment slowly after initial animation
  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setValue(prev => prev + Math.floor(Math.random() * 3) + 1);
      }, 800);
      return () => clearInterval(interval);
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <span>
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

function UptimeCounter() {
  const [seconds, setSeconds] = useState(0);
  const baseSeconds = 847 * 24 * 60 * 60 + 12 * 60 * 60 + 34 * 60;

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalSeconds = baseSeconds + seconds;
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const secs = totalSeconds % 60;

  return (
    <span className="font-mono">
      {days}d {hours}h {minutes}m {secs.toString().padStart(2, '0')}s
    </span>
  );
}

function LastOptimization() {
  const [seconds, setSeconds] = useState(0.3);

  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly reset or increment
      if (Math.random() < 0.15) {
        setSeconds(0.1);
      } else {
        setSeconds(prev => Math.min(prev + 0.1, 5.0));
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return <span className="text-emerald-400">{seconds.toFixed(1)}s ago</span>;
}

export default function SystemMonitor() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [isLive, setIsLive] = useState(true);

  // Pulse the live indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLive(prev => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const metrics: MetricBar[] = [
    { label: 'Efficiency', value: 87, unit: '%', color: 'violet' },
    { label: 'Throughput', value: 94, unit: '%', color: 'green' },
    { label: 'Latency', value: 12, unit: 'ms', color: 'blue' },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-mono text-[#94A3B8] text-sm sm:text-base mb-4">
            // SYSTEM_MONITOR
          </h2>
          <p className="text-xl sm:text-2xl lg:text-3xl font-semibold">
            Real-time Operations Dashboard
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          {/* Dashboard Card */}
          <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
              <span className="font-mono text-sm text-white uppercase tracking-wider">
                System_Monitor
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#666]">LIVE</span>
                <div
                  className={`w-2 h-2 rounded-full bg-emerald-400 transition-opacity duration-300 ${
                    isLive ? 'opacity-100' : 'opacity-40'
                  }`}
                  style={{
                    boxShadow: isLive ? '0 0 8px rgba(52, 211, 153, 0.8)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Metrics */}
            <div className="p-6 space-y-4">
              {metrics.map((metric, index) => (
                <AnimatedBar key={metric.label} {...metric} delay={index * 200} />
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#2A2A2A]" />

            {/* Processes Section */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-[#94A3B8] uppercase">
                  Processes Optimized
                </span>
                <span className="font-mono text-sm text-emerald-400">
                  <span className="text-[#666]">▲</span>{' '}
                  <AnimatedCounter target={2847} suffix=" today" />
                </span>
              </div>
              <Sparkline />
            </div>

            {/* Divider */}
            <div className="h-px bg-[#2A2A2A]" />

            {/* Footer Stats */}
            <div className="p-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-mono text-[#666] uppercase">Last_Optimization:</span>
                <span className="ml-2 font-mono">
                  <LastOptimization />
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-[#666] uppercase">Uptime:</span>
                <span className="ml-2 text-white">
                  <UptimeCounter />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
