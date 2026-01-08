'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface DepartmentMetric {
  label: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface Department {
  id: string;
  name: string;
  icon: string;
  status: 'operational' | 'degraded' | 'critical';
  metrics: DepartmentMetric[];
  headline: string;
  headlineValue: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  department: string;
  message: string;
  timestamp: Date;
}

interface Producer {
  id: string;
  name: string;
  initials: string;
  department: string;
  metric: string;
  value: string;
  trend: number;
  avatar: string;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function StatusDot({ status }: { status: 'operational' | 'degraded' | 'critical' | 'excellent' | 'good' | 'warning' }) {
  const colors = {
    operational: 'bg-emerald-400',
    excellent: 'bg-emerald-400',
    good: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    warning: 'bg-amber-400',
    critical: 'bg-red-400',
  };

  const glows = {
    operational: 'shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    excellent: 'shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    good: 'shadow-[0_0_6px_rgba(52,211,153,0.5)]',
    degraded: 'shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    warning: 'shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    critical: 'shadow-[0_0_8px_rgba(248,113,113,0.8)]',
  };

  return (
    <div className={`w-2 h-2 rounded-full ${colors[status]} ${glows[status]} animate-pulse`} />
  );
}

function TrendIndicator({ trend, value }: { trend: 'up' | 'down' | 'stable'; value?: number }) {
  const icons = {
    up: '▲',
    down: '▼',
    stable: '●',
  };

  const colors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    stable: 'text-[#94A3B8]',
  };

  return (
    <span className={`text-[10px] ${colors[trend]} flex items-center gap-0.5`}>
      {icons[trend]}
      {value !== undefined && <span>{Math.abs(value)}%</span>}
    </span>
  );
}

function MiniSparkline({ data, color = '#7C3AED' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-6" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AnimatedValue({
  value,
  prefix = '',
  suffix = '',
  decimals = 0
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (value - startValue) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {prefix}
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString()}
      {suffix}
    </span>
  );
}

function ProgressRing({
  value,
  size = 40,
  strokeWidth = 3,
  status = 'good'
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  status?: 'excellent' | 'good' | 'warning' | 'critical';
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colors = {
    excellent: '#10B981',
    good: '#7C3AED',
    warning: '#F59E0B',
    critical: '#EF4444',
  };

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#2A2A2A"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colors[status]}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================================
// ALERT BANNER
// ============================================================================

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % alerts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [alerts.length]);

  const severityStyles = {
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const severityIcons = {
    critical: '⚠',
    warning: '⚡',
    info: 'ℹ',
  };

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className={`px-4 py-2 rounded-lg border ${severityStyles[alerts[currentIndex].severity]} flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{severityIcons[alerts[currentIndex].severity]}</span>
            <div>
              <span className="font-mono text-xs uppercase opacity-60">{alerts[currentIndex].department}</span>
              <p className="text-sm">{alerts[currentIndex].message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs opacity-60">
            <span className="font-mono">{alerts.length > 1 && `${currentIndex + 1}/${alerts.length}`}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// DEPARTMENT CARD
// ============================================================================

function DepartmentCard({ department, delay }: { department: Department; delay: number }) {
  const [metrics, setMetrics] = useState(department.metrics);
  const [sparkData, setSparkData] = useState<number[]>(() =>
    Array.from({ length: 8 }, () => Math.random() * 40 + 30)
  );

  // Fluctuate metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: Math.max(0, Math.min(m.target * 1.5, m.value + (Math.random() - 0.5) * 5)),
      })));
      setSparkData(prev => [...prev.slice(1), Math.random() * 40 + 30]);
    }, 2000 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    operational: 'border-emerald-500/20',
    degraded: 'border-amber-500/20',
    critical: 'border-red-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-[#0D0D0D] rounded-lg border ${statusColors[department.status]} border-[#2A2A2A] overflow-hidden hover:border-[#3A3A3A] transition-colors`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <span className="text-lg">{department.icon}</span>
          <span className="font-mono text-xs text-white uppercase tracking-wider">{department.name}</span>
        </div>
        <StatusDot status={department.status} />
      </div>

      {/* Headline Metric */}
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] text-[#666] uppercase mb-1">{department.headline}</p>
            <p className="text-2xl font-bold text-white">{department.headlineValue}</p>
          </div>
          <MiniSparkline
            data={sparkData}
            color={department.status === 'critical' ? '#EF4444' : department.status === 'degraded' ? '#F59E0B' : '#7C3AED'}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 space-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProgressRing
                value={(metric.value / metric.target) * 100}
                size={24}
                strokeWidth={2}
                status={metric.status}
              />
              <span className="font-mono text-[10px] text-[#94A3B8] uppercase">{metric.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white">
                <AnimatedValue value={metric.value} suffix={metric.unit} decimals={metric.unit === '%' ? 1 : 0} />
              </span>
              <TrendIndicator trend={metric.trend} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// TOP PRODUCERS LEADERBOARD
// ============================================================================

function ProducerCard({ producer, rank, delay }: { producer: Producer; rank: number; delay: number }) {
  const rankColors = ['text-amber-400', 'text-gray-400', 'text-amber-600', 'text-[#94A3B8]', 'text-[#94A3B8]'];
  const rankBgs = ['bg-amber-400/10', 'bg-gray-400/10', 'bg-amber-600/10', 'bg-transparent', 'bg-transparent'];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#1A1A1A] transition-colors"
    >
      {/* Rank */}
      <div className={`w-6 h-6 rounded-full ${rankBgs[rank]} flex items-center justify-center`}>
        <span className={`font-mono text-xs font-bold ${rankColors[rank]}`}>{rank + 1}</span>
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white text-xs font-bold">
        {producer.initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{producer.name}</p>
        <p className="text-[10px] text-[#666] font-mono uppercase">{producer.department}</p>
      </div>

      {/* Metric */}
      <div className="text-right">
        <p className="text-sm font-bold text-white">{producer.value}</p>
        <div className="flex items-center justify-end gap-1">
          <TrendIndicator trend={producer.trend > 0 ? 'up' : 'down'} value={Math.abs(producer.trend)} />
        </div>
      </div>
    </motion.div>
  );
}

function TopProducers({ producers }: { producers: Producer[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="font-mono text-xs text-white uppercase tracking-wider">Top Producers</span>
        </div>
        <span className="font-mono text-[10px] text-[#666]">THIS WEEK</span>
      </div>

      <div className="p-2">
        {producers.map((producer, index) => (
          <ProducerCard
            key={producer.id}
            producer={producer}
            rank={index}
            delay={0.7 + index * 0.1}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// GLOBAL METRICS BAR
// ============================================================================

function GlobalMetrics() {
  const [metrics, setMetrics] = useState({
    activeUsers: 847,
    ticketsResolved: 1234,
    revenue: 847500,
    nps: 72,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 3) - 1,
        ticketsResolved: prev.ticketsResolved + Math.floor(Math.random() * 5),
        revenue: prev.revenue + Math.floor(Math.random() * 1000),
        nps: Math.max(0, Math.min(100, prev.nps + (Math.random() - 0.5) * 2)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
    >
      {[
        { label: 'Active_Users', value: metrics.activeUsers, prefix: '', suffix: '', color: 'text-emerald-400' },
        { label: 'Tickets_Resolved', value: metrics.ticketsResolved, prefix: '', suffix: ' today', color: 'text-[#7C3AED]' },
        { label: 'Revenue_MTD', value: metrics.revenue, prefix: '$', suffix: '', color: 'text-emerald-400' },
        { label: 'NPS_Score', value: Math.round(metrics.nps), prefix: '', suffix: '', color: 'text-[#7C3AED]' },
      ].map((metric) => (
        <div
          key={metric.label}
          className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] p-4 text-center"
        >
          <p className="font-mono text-[10px] text-[#666] uppercase mb-2">{metric.label}</p>
          <p className={`text-xl font-bold ${metric.color}`}>
            <AnimatedValue
              value={metric.value}
              prefix={metric.prefix}
              suffix={metric.suffix}
            />
          </p>
        </div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// LIVE ACTIVITY FEED
// ============================================================================

function ActivityFeed() {
  const activities = useMemo(() => [
    { id: '1', type: 'success', message: 'New enterprise deal closed', dept: 'SALES', time: '2m ago' },
    { id: '2', type: 'info', message: 'Customer onboarding completed', dept: 'ONBOARD', time: '5m ago' },
    { id: '3', type: 'warning', message: 'SLA breach approaching', dept: 'SUPPORT', time: '8m ago' },
    { id: '4', type: 'success', message: 'Invoice batch processed', dept: 'ACCT', time: '12m ago' },
    { id: '5', type: 'info', message: 'Campaign metrics updated', dept: 'MKTG', time: '15m ago' },
  ], []);

  const [visibleActivities, setVisibleActivities] = useState(activities);

  useEffect(() => {
    const interval = setInterval(() => {
      const newActivities = [
        { id: '1', type: 'success', message: 'New enterprise deal closed', dept: 'SALES', time: 'just now' },
        { id: '2', type: 'info', message: 'Customer onboarding completed', dept: 'ONBOARD', time: '1m ago' },
        { id: '3', type: 'success', message: 'Ticket escalation resolved', dept: 'SUPPORT', time: '3m ago' },
        { id: '4', type: 'warning', message: 'Payment retry scheduled', dept: 'ACCT', time: '5m ago' },
        { id: '5', type: 'info', message: 'A/B test results ready', dept: 'MKTG', time: '8m ago' },
        { id: '6', type: 'success', message: 'QBR presentation sent', dept: 'SUCCESS', time: '10m ago' },
      ];
      const shuffled = [...newActivities].sort(() => Math.random() - 0.5).slice(0, 5);
      setVisibleActivities(shuffled);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const typeColors = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  };

  const typeIcons = {
    success: '✓',
    warning: '!',
    info: '→',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <span className="font-mono text-xs text-white uppercase tracking-wider">Live Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#666]">LIVE</span>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </div>
      </div>

      <div className="p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleActivities.map((activity) => (
            <motion.div
              key={activity.id + activity.message}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 py-2 px-2 rounded hover:bg-[#1A1A1A] transition-colors"
            >
              <span className={`text-sm ${typeColors[activity.type as keyof typeof typeColors]}`}>
                {typeIcons[activity.type as keyof typeof typeIcons]}
              </span>
              <span className="font-mono text-[10px] text-[#666] w-16">{activity.dept}</span>
              <span className="text-xs text-[#94A3B8] flex-1 truncate">{activity.message}</span>
              <span className="font-mono text-[10px] text-[#444]">{activity.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SYSTEM STATUS FOOTER
// ============================================================================

function SystemStatusFooter() {
  const [uptime, setUptime] = useState(0);
  const baseSeconds = 847 * 24 * 60 * 60 + 12 * 60 * 60 + 34 * 60;

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSeconds = baseSeconds + uptime;
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const secs = totalSeconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 1 }}
      className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[#666]"
    >
      <div className="flex items-center gap-2">
        <span className="uppercase">System_Uptime:</span>
        <span className="text-white">{days}d {hours}h {minutes}m {secs.toString().padStart(2, '0')}s</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="uppercase">Last_Sync:</span>
        <span className="text-emerald-400">0.3s ago</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="uppercase">Data_Sources:</span>
        <span className="text-white">12 connected</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="uppercase">API_Health:</span>
        <span className="text-emerald-400">100%</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SystemMonitor() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Department data
  const departments: Department[] = [
    {
      id: 'sales',
      name: 'Sales',
      icon: '💰',
      status: 'operational',
      headline: 'Pipeline Value',
      headlineValue: '$2.4M',
      metrics: [
        { label: 'Close Rate', value: 34, target: 30, unit: '%', trend: 'up', status: 'excellent' },
        { label: 'Avg Deal Size', value: 48500, target: 45000, unit: '', trend: 'up', status: 'good' },
        { label: 'Quota Attain', value: 112, target: 100, unit: '%', trend: 'up', status: 'excellent' },
      ],
    },
    {
      id: 'onboarding',
      name: 'Onboarding',
      icon: '🚀',
      status: 'operational',
      headline: 'Time to Value',
      headlineValue: '14 days',
      metrics: [
        { label: 'Completion', value: 94, target: 95, unit: '%', trend: 'stable', status: 'good' },
        { label: 'CSAT', value: 4.7, target: 4.5, unit: '/5', trend: 'up', status: 'excellent' },
        { label: 'Active Impl', value: 23, target: 30, unit: '', trend: 'down', status: 'good' },
      ],
    },
    {
      id: 'support',
      name: 'Support',
      icon: '🎧',
      status: 'degraded',
      headline: 'Avg Response',
      headlineValue: '4.2 min',
      metrics: [
        { label: 'Queue Depth', value: 47, target: 20, unit: '', trend: 'up', status: 'warning' },
        { label: 'FCR Rate', value: 78, target: 85, unit: '%', trend: 'down', status: 'warning' },
        { label: 'CSAT', value: 4.2, target: 4.5, unit: '/5', trend: 'down', status: 'warning' },
      ],
    },
    {
      id: 'success',
      name: 'Success',
      icon: '🎯',
      status: 'operational',
      headline: 'Net Retention',
      headlineValue: '118%',
      metrics: [
        { label: 'Health Score', value: 82, target: 80, unit: '', trend: 'up', status: 'good' },
        { label: 'Churn Risk', value: 8, target: 10, unit: '%', trend: 'down', status: 'excellent' },
        { label: 'Expansion', value: 340000, target: 300000, unit: '', trend: 'up', status: 'excellent' },
      ],
    },
    {
      id: 'accounting',
      name: 'Accounting',
      icon: '📊',
      status: 'critical',
      headline: 'AR Aging',
      headlineValue: '38 days',
      metrics: [
        { label: 'Collections', value: 67, target: 85, unit: '%', trend: 'down', status: 'critical' },
        { label: 'DSO', value: 52, target: 45, unit: ' days', trend: 'up', status: 'warning' },
        { label: 'Write-offs', value: 2.3, target: 1.5, unit: '%', trend: 'up', status: 'critical' },
      ],
    },
    {
      id: 'marketing',
      name: 'Marketing',
      icon: '📣',
      status: 'operational',
      headline: 'MQL Pipeline',
      headlineValue: '847',
      metrics: [
        { label: 'Conv Rate', value: 12, target: 10, unit: '%', trend: 'up', status: 'excellent' },
        { label: 'CAC', value: 1250, target: 1400, unit: '', trend: 'down', status: 'excellent' },
        { label: 'ROI', value: 340, target: 300, unit: '%', trend: 'up', status: 'excellent' },
      ],
    },
  ];

  // Alerts
  const alerts: Alert[] = [
    { id: '1', severity: 'critical', department: 'ACCOUNTING', message: 'Collections rate below threshold - 67% vs 85% target', timestamp: new Date() },
    { id: '2', severity: 'warning', department: 'SUPPORT', message: 'Queue depth elevated - 47 tickets pending (target: 20)', timestamp: new Date() },
    { id: '3', severity: 'warning', department: 'SUPPORT', message: 'FCR rate declining - intervention recommended', timestamp: new Date() },
  ];

  // Top producers (Ender's Game universe)
  const producers: Producer[] = [
    { id: '1', name: 'Ender Wiggin', initials: 'EW', department: 'Sales', metric: 'Revenue', value: '$412K', trend: 23, avatar: '' },
    { id: '2', name: 'Petra Arkanian', initials: 'PA', department: 'Support', metric: 'Tickets', value: '847', trend: 15, avatar: '' },
    { id: '3', name: 'Bean Delphiki', initials: 'BD', department: 'Success', metric: 'NRR', value: '124%', trend: 8, avatar: '' },
    { id: '4', name: 'Hyrum Graff', initials: 'HG', department: 'Onboarding', metric: 'TTV', value: '11 days', trend: -12, avatar: '' },
    { id: '5', name: 'Mazer Rackham', initials: 'MR', department: 'Marketing', metric: 'MQLs', value: '234', trend: 31, avatar: '' },
  ];

  return (
    <section ref={ref} className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 bg-[#0A0A0A]">
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="font-mono text-[#94A3B8] text-sm sm:text-base mb-4">
            // SYSTEM_MONITOR
          </h2>
          <p className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">
            Operations Command Center
          </p>
          <p className="text-sm text-[#666] font-mono">
            One dashboard to rule them all
          </p>
        </motion.div>

        {isInView && (
          <>
            {/* Alert Banner */}
            <AlertBanner alerts={alerts} />

            {/* Global Metrics */}
            <GlobalMetrics />

            {/* Department Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {departments.map((dept, index) => (
                <DepartmentCard
                  key={dept.id}
                  department={dept}
                  delay={0.1 + index * 0.1}
                />
              ))}
            </div>

            {/* Bottom Row: Producers + Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TopProducers producers={producers} />
              <ActivityFeed />
            </div>

            {/* System Status Footer */}
            <SystemStatusFooter />
          </>
        )}
      </div>
    </section>
  );
}
