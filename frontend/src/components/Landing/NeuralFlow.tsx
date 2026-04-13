import { useMemo, useEffect } from "react";
import { motion, useSpring, useTransform, animate, MotionValue } from "framer-motion";
import {
  Brain,
  Cpu,
  ShieldCheck,
  Zap,
  Network,
  Activity,
  Database,
  Scale,
  type LucideIcon,
} from "lucide-react";

// Static random values for pure components
const RANDOM_POOL = Array.from({ length: 256 }, (_, i) => {
  const x = Math.sin(i + 1) * 10000;
  return x - Math.floor(x);
});

interface NodeData {
  id: string;
  icon: LucideIcon;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  size: "sm" | "md" | "lg";
  active?: boolean;
}

const NODES: NodeData[] = [
  { id: "brain", icon: Brain, label: "Inference", sublabel: "Vector Matrix", x: 160, y: 110, size: "sm" },
  { id: "zap", icon: Zap, label: "Neural Core", sublabel: "Syntactic Logic", x: 350, y: 70, size: "sm" },
  { id: "network", icon: Network, label: "Contextual Engine", sublabel: "Semantic Sync", x: 600, y: 70, size: "sm" },
  { id: "database", icon: Database, label: "Knowledge Base", sublabel: "Legal Vault", x: 790, y: 110, size: "sm" },
  { id: "analyzer", icon: Activity, label: "Analyzer", sublabel: "Heuristic Filter", x: 240, y: 350, size: "md" },
  { id: "synthesizer", icon: Scale, label: "Synthesizer", sublabel: "Legal Rigor", x: 710, y: 350, size: "md" },
  { id: "consensus", icon: Cpu, label: "Consensus Engine", sublabel: "Final Adjudication", x: 475, y: 550, size: "lg", active: true },
  { id: "verdict", icon: ShieldCheck, label: "Secure Verdict", sublabel: "Certifiable Origin", x: 475, y: 690, size: "md" },
];

const LINKS = [
  { from: "brain", to: "analyzer" },
  { from: "zap", to: "analyzer" },
  { from: "network", to: "synthesizer" },
  { from: "database", to: "synthesizer" },
  { from: "analyzer", to: "consensus" },
  { from: "synthesizer", to: "consensus" },
  { from: "consensus", to: "verdict", active: true },
];

const NeuralNode = ({
  node,
  rawOffset,
  onHover,
}: {
  node: NodeData;
  rawOffset: MotionValue<number>;
  onHover: (hovered: boolean) => void;
}) => {
  const yOffset = useSpring(rawOffset, { stiffness: 80, damping: 20 });
  const orbitalDuration = useMemo(() => 12 + RANDOM_POOL[node.id.length % 256] * 10, [node.id]);

  const sizeClasses = { sm: "w-14 h-14", md: "w-18 h-18", lg: "w-24 h-24" };
  const iconSizes = { sm: "w-5 h-5", md: "w-7 h-7", lg: "w-10 h-10" };

  return (
    <motion.div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        y: yOffset,
        x: "-50%",
      }}
      className="flex flex-col items-center group pointer-events-auto z-20"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className={`absolute -inset-10 rounded-full transition-all duration-1000 ${node.active ? "bg-white/5 opacity-100 scale-110" : "bg-white/5 opacity-0 group-hover:opacity-100 group-hover:scale-105"}`} />

      <motion.div
        whileHover={{ scale: 1.15 }}
        className={`relative ${sizeClasses[node.size]} rounded-full border flex items-center justify-center transition-all duration-700 ${node.active ? "bg-white/20 border-white/60 ring-1 ring-white/40" : "bg-white/10 border-white/20 group-hover:border-white/50 group-hover:bg-white/20"}`}
      >
        <node.icon className={`transition-all duration-700 ${node.active ? "text-white" : "text-white/40 group-hover:text-white/90"} ${iconSizes[node.size]}`} strokeWidth={node.active ? 1.5 : 0.75} />

        {[0.8, 1, 1.25].map((_, i) => (
          <motion.div
            key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: orbitalDuration * (1 + i * 0.3), repeat: Infinity, ease: "linear" }}
            className="absolute border border-dashed border-white/10 rounded-full"
            style={{ inset: `${-6 - (i * 3)}px`, opacity: 1 - (i * 0.3) }}
          />
        ))}
      </motion.div>

      <div className="mt-5 text-center pointer-events-none">
        <p className={`text-[11px] font-inter font-black uppercase tracking-[0.45em] transition-all duration-500 whitespace-nowrap ${node.active ? "text-white scale-110" : "text-white/60 group-hover:text-white"}`}>
          {node.label}
        </p>
        <p className={`text-[9px] font-outfit font-medium uppercase tracking-[0.3em] mt-1.5 italic transition-colors duration-500 ${node.active ? "text-white/90" : "text-white/30 group-hover:text-white/50"}`}>
          {node.sublabel}
        </p>
      </div>
    </motion.div>
  );
};

const DynamicLink = ({
  fromNode,
  toNode,
  rawFromY,
  rawToY,
  active = false,
}: {
  fromNode: NodeData;
  toNode: NodeData;
  rawFromY: MotionValue<number>;
  rawToY: MotionValue<number>;
  active?: boolean;
}) => {
  const fromY = useSpring(rawFromY, { stiffness: 80, damping: 20 });
  const toY = useSpring(rawToY, { stiffness: 80, damping: 20 });

  const path = useTransform([fromY, toY], ([fy, ty]) => {
    const sx = fromNode.x;
    const sy = fromNode.y + (fy as number);
    const tx = toNode.x;
    const ty_coord = toNode.y + (ty as number);
    const midX = (sx + tx) / 2;
    const midY = (sy + ty_coord) / 2 + 60;
    return `M ${sx} ${sy} Q ${midX} ${midY} ${tx} ${ty_coord}`;
  });

  const duration = useMemo(() => 3 + RANDOM_POOL[(fromNode.id + toNode.id).length % 256] * 5, [fromNode.id, toNode.id]);
  const delay = useMemo(() => RANDOM_POOL[(fromNode.id.length * 3) % 256] * 2, [fromNode.id]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
      <defs>
        <linearGradient id={`grad-${fromNode.id}-${toNode.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity={active ? 0.4 : 0.15} />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="glow-synapse" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <motion.path d={path} stroke={`url(#grad-${fromNode.id}-${toNode.id})`} strokeWidth="1.2" strokeLinecap="round" fill="transparent" className="opacity-60" />
      <motion.path
        d={path}
        stroke={active ? "white" : "rgba(255,255,255,0.6)"}
        strokeWidth={active ? "3" : "1.8"}
        strokeLinecap="round"
        fill="transparent"
        filter="url(#glow-synapse)"
        initial={{ pathLength: 0.1, pathOffset: 0, opacity: 0 }}
        animate={{ pathOffset: [0, 1], opacity: [0, active ? 1 : 0.7, 0] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      />
    </svg>
  );
};

export default function NeuralFlow() {
  const nodeOffsets = useMemo(() => {
    return NODES.reduce((acc, node) => {
      acc[node.id] = new MotionValue(0);
      return acc;
    }, {} as Record<string, MotionValue<number>>);
  }, []);

  useEffect(() => {
    NODES.forEach((node, i) => {
      const duration = 5 + RANDOM_POOL[i % 256] * 5;
      const delay = RANDOM_POOL[(i + 12) % 256] * 3;
      animate(nodeOffsets[node.id], [0, 20, 0], { duration, delay, repeat: Infinity, ease: "easeInOut" });
    });
  }, [nodeOffsets]);

  const handleHover = (id: string, hovered: boolean) => {
    const target = hovered ? -80 : 0;
    animate(nodeOffsets[id], target, { type: "spring", stiffness: 200, damping: 18 });

    if (!hovered) {
      setTimeout(() => {
        const i = NODES.findIndex(n => n.id === id);
        const duration = 5 + RANDOM_POOL[i % 256] * 5;
        animate(nodeOffsets[id], [0, 20, 0], { duration, repeat: Infinity, ease: "easeInOut" });
      }, 800);
    }
  };

  return (
    <div className="relative w-full max-w-[950px] h-[780px] flex items-center justify-center p-12 bg-black/20 rounded-[4rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[40px_40px]" />
      
      <div className="relative z-10 w-full h-full">
        {LINKS.map((link) => (
          <DynamicLink
            key={`${link.from}-${link.to}`}
            fromNode={NODES.find(n => n.id === link.from)!}
            toNode={NODES.find(n => n.id === link.to)!}
            rawFromY={nodeOffsets[link.from]}
            rawToY={nodeOffsets[link.to]}
            active={link.active}
          />
        ))}
        {NODES.map((node) => (
          <NeuralNode key={node.id} node={node} rawOffset={nodeOffsets[node.id]} onHover={(h) => handleHover(node.id, h)} />
        ))}
      </div>

      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ y: [-100, 100, -100], x: [-50, 50, -50], opacity: [0.01, 0.1, 0.01] }}
          transition={{ duration: 10 + RANDOM_POOL[i % 256] * 15, repeat: Infinity, ease: "linear" }}
          className="absolute w-1 h-1 bg-white rounded-full pointer-events-none"
          style={{ top: `${RANDOM_POOL[(i + 20) % 256] * 100}%`, left: `${RANDOM_POOL[(i + 40) % 256] * 100}%` }}
        />
      ))}
    </div>
  );
}
