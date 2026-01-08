'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

interface Node {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
}

interface Connection {
  from: number;
  to: number;
}

// Generate structured node positions for the "clarity" state
const structuredPositions = [
  // Row 1 - Input nodes
  { x: 15, y: 20 },
  { x: 15, y: 50 },
  { x: 15, y: 80 },
  // Row 2 - Processing
  { x: 35, y: 35 },
  { x: 35, y: 65 },
  // Row 3 - Central hub
  { x: 55, y: 50 },
  // Row 4 - Output processing
  { x: 75, y: 35 },
  { x: 75, y: 65 },
  // Row 5 - Output
  { x: 92, y: 50 },
];

// Structured connections (clean flowchart)
const structuredConnections: Connection[] = [
  { from: 0, to: 3 },
  { from: 1, to: 3 },
  { from: 1, to: 4 },
  { from: 2, to: 4 },
  { from: 3, to: 5 },
  { from: 4, to: 5 },
  { from: 5, to: 6 },
  { from: 5, to: 7 },
  { from: 6, to: 8 },
  { from: 7, to: 8 },
];

// Generate random chaos positions
function generateChaoticNodes(): Node[] {
  return structuredPositions.map((target, i) => ({
    id: i,
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    targetX: target.x,
    targetY: target.y,
    size: Math.random() * 4 + 4,
  }));
}

// Generate chaotic tangled connections
function generateChaoticConnections(): Connection[] {
  const connections: Connection[] = [];
  for (let i = 0; i < 15; i++) {
    connections.push({
      from: Math.floor(Math.random() * 9),
      to: Math.floor(Math.random() * 9),
    });
  }
  return connections;
}

function AnimatedNode({
  node,
  phase,
  index,
}: {
  node: Node;
  phase: 'chaos' | 'transition' | 'clarity';
  index: number;
}) {
  const [chaosOffset, setChaosOffset] = useState({ x: 0, y: 0 });

  // Random jitter in chaos phase
  useEffect(() => {
    if (phase !== 'chaos') return;

    const interval = setInterval(() => {
      setChaosOffset({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
      });
    }, 100 + Math.random() * 200);

    return () => clearInterval(interval);
  }, [phase]);

  const x = phase === 'clarity' ? node.targetX : node.x + chaosOffset.x;
  const y = phase === 'clarity' ? node.targetY : node.y + chaosOffset.y;

  const color = phase === 'clarity' ? '#7C3AED' : phase === 'transition' ? '#94A3B8' : '#EF4444';

  return (
    <motion.circle
      cx={`${x}%`}
      cy={`${y}%`}
      r={phase === 'clarity' ? 6 : node.size}
      fill={color}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        cx: `${x}%`,
        cy: `${y}%`,
        r: phase === 'clarity' ? 6 : node.size,
        fill: color,
      }}
      transition={{
        duration: phase === 'chaos' ? 0.1 : 1.5,
        delay: phase === 'clarity' ? index * 0.1 : 0,
        ease: 'easeInOut',
      }}
      style={{
        filter: phase === 'clarity' ? 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.6))' : 'none',
      }}
    />
  );
}

function AnimatedConnection({
  from,
  to,
  nodes,
  phase,
  index,
  isStructured,
}: {
  from: number;
  to: number;
  nodes: Node[];
  phase: 'chaos' | 'transition' | 'clarity';
  index: number;
  isStructured: boolean;
}) {
  const fromNode = nodes[from];
  const toNode = nodes[to];

  if (!fromNode || !toNode) return null;

  const x1 = phase === 'clarity' ? fromNode.targetX : fromNode.x;
  const y1 = phase === 'clarity' ? fromNode.targetY : fromNode.y;
  const x2 = phase === 'clarity' ? toNode.targetX : toNode.x;
  const y2 = phase === 'clarity' ? toNode.targetY : toNode.y;

  const color = phase === 'clarity' ? '#7C3AED' : phase === 'transition' ? '#4B5563' : '#991B1B';
  const opacity = phase === 'chaos' ? 0.3 : phase === 'clarity' && isStructured ? 0.8 : 0;

  return (
    <motion.line
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
      stroke={color}
      strokeWidth={phase === 'clarity' ? 2 : 1}
      initial={{ opacity: 0 }}
      animate={{
        opacity,
        x1: `${x1}%`,
        y1: `${y1}%`,
        x2: `${x2}%`,
        y2: `${y2}%`,
      }}
      transition={{
        duration: phase === 'chaos' ? 0.2 : 1.5,
        delay: phase === 'clarity' ? index * 0.05 : 0,
        ease: 'easeInOut',
      }}
    />
  );
}

function DataPulse({ connection, nodes }: { connection: Connection; nodes: Node[] }) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const duration = 1500 + Math.random() * 1000;
    const delay = Math.random() * 2000;

    const animate = () => {
      setPosition(0);
      const startTime = Date.now();

      const step = () => {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed / duration) % 1;
        setPosition(progress);
        requestAnimationFrame(step);
      };

      setTimeout(() => requestAnimationFrame(step), delay);
    };

    animate();
  }, []);

  const fromNode = nodes[connection.from];
  const toNode = nodes[connection.to];

  if (!fromNode || !toNode) return null;

  const x = fromNode.targetX + (toNode.targetX - fromNode.targetX) * position;
  const y = fromNode.targetY + (toNode.targetY - fromNode.targetY) * position;

  return (
    <motion.circle
      cx={`${x}%`}
      cy={`${y}%`}
      r={3}
      fill="#A78BFA"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
      style={{
        filter: 'drop-shadow(0 0 4px rgba(167, 139, 250, 0.8))',
      }}
    />
  );
}

export default function ChaosToClarity() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: '-200px' });
  const [phase, setPhase] = useState<'chaos' | 'transition' | 'clarity'>('chaos');
  const [cycleKey, setCycleKey] = useState(0);

  const nodes = useMemo(() => generateChaoticNodes(), [cycleKey]);
  const chaoticConnections = useMemo(() => generateChaoticConnections(), [cycleKey]);

  // Animation cycle
  useEffect(() => {
    if (!isInView) {
      setPhase('chaos');
      return;
    }

    // Phase timing
    const chaosTimer = setTimeout(() => setPhase('transition'), 3000);
    const clarityTimer = setTimeout(() => setPhase('clarity'), 5000);
    const resetTimer = setTimeout(() => {
      setPhase('chaos');
      setCycleKey(prev => prev + 1);
    }, 12000);

    return () => {
      clearTimeout(chaosTimer);
      clearTimeout(clarityTimer);
      clearTimeout(resetTimer);
    };
  }, [isInView, cycleKey]);

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 2xl:px-16 overflow-hidden">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-mono text-[#94A3B8] text-sm sm:text-base mb-4">
            // PROCESS_OPTIMIZATION
          </h2>
          <p className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">
            From Manual Chaos to Automated Clarity
          </p>
          <p className="text-[#94A3B8] text-sm sm:text-base max-w-xl mx-auto">
            Watch inefficient workflows transform into streamlined, automated processes
          </p>
        </motion.div>

        {/* Animation Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-white uppercase tracking-wider">
                  Workflow_Transform
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs uppercase px-2 py-1 rounded transition-colors duration-500 ${
                    phase === 'chaos'
                      ? 'bg-red-900/50 text-red-400'
                      : phase === 'transition'
                        ? 'bg-yellow-900/50 text-yellow-400'
                        : 'bg-emerald-900/50 text-emerald-400'
                  }`}
                >
                  {phase === 'chaos'
                    ? 'ANALYZING'
                    : phase === 'transition'
                      ? 'OPTIMIZING'
                      : 'OPTIMIZED'}
                </span>
              </div>
            </div>

            {/* Animation Area */}
            <div className="relative aspect-[2/1] min-h-[300px]">
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Background grid (only in clarity) */}
                {phase === 'clarity' && (
                  <g opacity={0.1}>
                    {[20, 40, 60, 80].map(x => (
                      <line
                        key={`v-${x}`}
                        x1={`${x}%`}
                        y1="0"
                        x2={`${x}%`}
                        y2="100%"
                        stroke="#7C3AED"
                        strokeWidth="0.5"
                      />
                    ))}
                    {[25, 50, 75].map(y => (
                      <line
                        key={`h-${y}`}
                        x1="0"
                        y1={`${y}%`}
                        x2="100%"
                        y2={`${y}%`}
                        stroke="#7C3AED"
                        strokeWidth="0.5"
                      />
                    ))}
                  </g>
                )}

                {/* Chaotic connections (visible in chaos phase) */}
                {phase !== 'clarity' &&
                  chaoticConnections.map((conn, i) => (
                    <AnimatedConnection
                      key={`chaos-${i}`}
                      from={conn.from}
                      to={conn.to}
                      nodes={nodes}
                      phase={phase}
                      index={i}
                      isStructured={false}
                    />
                  ))}

                {/* Structured connections (visible in clarity phase) */}
                {structuredConnections.map((conn, i) => (
                  <AnimatedConnection
                    key={`struct-${i}`}
                    from={conn.from}
                    to={conn.to}
                    nodes={nodes}
                    phase={phase}
                    index={i}
                    isStructured={true}
                  />
                ))}

                {/* Nodes */}
                {nodes.map((node, i) => (
                  <AnimatedNode key={node.id} node={node} phase={phase} index={i} />
                ))}

                {/* Data pulses (only in clarity phase) */}
                {phase === 'clarity' &&
                  structuredConnections.map((conn, i) => (
                    <DataPulse key={`pulse-${i}`} connection={conn} nodes={nodes} />
                  ))}
              </svg>

              {/* Phase Labels */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                <motion.div
                  animate={{ opacity: phase === 'chaos' ? 1 : 0.3 }}
                  className="font-mono text-xs text-red-400"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2" />
                  CHAOS
                </motion.div>
                <motion.div
                  animate={{ opacity: phase === 'clarity' ? 1 : 0.3 }}
                  className="font-mono text-xs text-emerald-400"
                >
                  CLARITY
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 ml-2" />
                </motion.div>
              </div>
            </div>

            {/* Footer Stats */}
            <div className="px-4 py-3 bg-[#1A1A1A] border-t border-[#2A2A2A] grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-mono text-xs text-[#666] uppercase mb-1">Efficiency</div>
                <motion.div
                  className="font-mono text-sm"
                  animate={{
                    color: phase === 'chaos' ? '#EF4444' : phase === 'clarity' ? '#10B981' : '#94A3B8',
                  }}
                >
                  {phase === 'chaos' ? '23%' : phase === 'clarity' ? '94%' : '...'}
                </motion.div>
              </div>
              <div>
                <div className="font-mono text-xs text-[#666] uppercase mb-1">Bottlenecks</div>
                <motion.div
                  className="font-mono text-sm"
                  animate={{
                    color: phase === 'chaos' ? '#EF4444' : phase === 'clarity' ? '#10B981' : '#94A3B8',
                  }}
                >
                  {phase === 'chaos' ? '12' : phase === 'clarity' ? '0' : '...'}
                </motion.div>
              </div>
              <div>
                <div className="font-mono text-xs text-[#666] uppercase mb-1">Automation</div>
                <motion.div
                  className="font-mono text-sm"
                  animate={{
                    color: phase === 'chaos' ? '#EF4444' : phase === 'clarity' ? '#10B981' : '#94A3B8',
                  }}
                >
                  {phase === 'chaos' ? '0%' : phase === 'clarity' ? '100%' : '...'}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
