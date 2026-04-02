import React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Cpu,
  ShieldCheck,
  Zap,
  Network,
  Activity,
  Database,
  Scale,
} from "lucide-react";

const NeuralNode = ({
  icon: Icon,
  label,
  sublabel,
  active = false,
  delay = 0,
  size = "md",
}: {
  icon: any;
  label: string;
  sublabel: string;
  active?: boolean;
  delay?: number;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-18 h-18",
    lg: "w-24 h-24",
  };
  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center group pointer-events-auto"
    >
      {/* Node Aura */}
      <div
        className={`absolute -inset-4 rounded-full blur-xl transition-opacity duration-1000 ${
          active
            ? "bg-gold-primary/60 opacity-100"
            : "bg-white/20 opacity-0 group-hover:opacity-100"
        }`}
      />

      {/* Main Circle */}
      <div
        className={`relative ${sizeClasses[size]} rounded-full border flex items-center justify-center transition-all duration-700 shadow-2xl ${
          active
            ? "bg-gold-primary/25 border-gold-primary/90 shadow-gold ring-2 ring-gold-primary/50"
            : "bg-white/[0.12] border-white/40 group-hover:border-gold-primary/70"
        }`}
      >
        <Icon
          className={`transition-colors duration-700 ${
            active
              ? "text-gold-primary animate-glow-pulse"
              : "text-white/70 group-hover:text-gold-primary/90"
          } ${iconSizes[size]}`}
          strokeWidth={1.2}
        />

        {/* Orbital Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 12 + Math.random() * 5,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -inset-2 border border-dashed border-white/25 rounded-full"
        />

        {active && (
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-gold-primary/20"
          />
        )}
      </div>

      {/* Labels */}
      <div className="mt-3 text-center">
        <p
          className={`text-[9px] font-inter font-black uppercase tracking-[0.35em] transition-colors duration-500 whitespace-nowrap ${
            active ? "text-white" : "text-white/75 group-hover:text-white"
          }`}
        >
          {label}
        </p>
        <p className="text-[7px] font-inter font-bold uppercase tracking-[0.2em] text-gold-primary/95 mt-0.5 italic">
          {sublabel}
        </p>
      </div>
    </motion.div>
  );
};

const DataStream = ({
  path,
  delay = 0,
  color = "gold",
}: {
  path: string;
  delay?: number;
  color?: "gold" | "teal";
}) => {
  const strokeColor = color === "gold" ? "#d4af37" : "#00ced1";

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      fill="none"
    >
      <defs>
        <linearGradient
          id={`gradient-path-${delay}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0" />
          <stop offset="50%" stopColor={strokeColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`gradient-pulse-${delay}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor={strokeColor} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Base Path */}
      <motion.path
        d={path}
        stroke={`url(#gradient-path-${delay})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.5, delay, ease: "easeInOut" }}
      />

      {/* Animated Data Pulse */}
      <motion.path
        d={path}
        stroke={`url(#gradient-pulse-${delay})`}
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0.05, pathOffset: 0, opacity: 0 }}
        animate={{
          pathOffset: [0, 1],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 3 + Math.random(),
          repeat: Infinity,
          delay: delay + 1,
          ease: "linear",
        }}
      />
    </svg>
  );
};

export default function NeuralFlow() {
  return (
    <div className="relative w-full max-w-[800px] h-[650px] flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.02)_0%,transparent_80%)]" />

      {/* SVG STREAMS - Coordinated with redistributed nodes */}
      {/* Row 1 -> Row 2 */}
      <DataStream path="M 120 100 Q 150 200 180 250" delay={0.2} />
      <DataStream path="M 280 60 Q 250 150 200 250" delay={0.4} />
      <DataStream path="M 520 60 Q 550 150 600 250" delay={0.6} />
      <DataStream path="M 680 100 Q 650 200 620 250" delay={0.8} />

      {/* Row 2 -> Row 3 (Consensus) */}
      <DataStream path="M 180 320 Q 250 400 380 430" delay={1.2} />
      <DataStream path="M 620 320 Q 550 400 420 430" delay={1.4} />
      <DataStream path="M 400 120 L 400 400" delay={1.0} color="teal" />

      {/* Row 3 -> Row 4 (Output) */}
      <DataStream path="M 400 480 L 400 580" delay={2.0} />

      {/* NEURAL NODES - REDISTRIBUTED FOR CLARITY */}
      <div className="relative z-10 w-full h-full">
        {/* ROW 1: CORE SOURCES */}
        <div className="absolute top-4 left-[5%]">
          <NeuralNode
            icon={Brain}
            label="Agentic RAG"
            sublabel="Vector Core"
            size="sm"
            delay={0.1}
          />
        </div>

        <div className="absolute top-0 left-[30%]">
          <NeuralNode
            icon={Zap}
            label="Neural Core A"
            sublabel="Logic layer"
            size="sm"
            delay={0.3}
          />
        </div>

        <div className="absolute top-0 right-[30%]">
          <NeuralNode
            icon={Network}
            label="Neural Core B"
            sublabel="Context sync"
            size="sm"
            delay={0.5}
          />
        </div>

        <div className="absolute top-4 right-[5%]">
          <NeuralNode
            icon={Database}
            label="Knowledge"
            sublabel="Legal Vault"
            size="sm"
            delay={0.7}
          />
        </div>

        {/* ROW 2: PROCESSING LAYER */}
        <div className="absolute top-[35%] left-[15%]">
          <NeuralNode
            icon={Activity}
            label="Analysis"
            sublabel="Pre-processing"
            size="md"
            delay={1.0}
          />
        </div>

        <div className="absolute top-[35%] right-[15%]">
          <NeuralNode
            icon={Scale}
            label="Synthesis"
            sublabel="Evaluation"
            size="md"
            delay={1.2}
          />
        </div>

        {/* ROW 3: MAIN HUB */}
        <div className="absolute top-[60%] left-1/2 -translate-x-1/2">
          <NeuralNode
            icon={Cpu}
            label="Consensus Engine"
            sublabel="Final Decision"
            active
            size="lg"
            delay={1.8}
          />
        </div>

        {/* ROW 4: OUTPUT */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <NeuralNode
            icon={ShieldCheck}
            label="Secure Verdict"
            sublabel="Zero Hallucination"
            size="md"
            delay={2.5}
          />
        </div>
      </div>

      {/* Ambient Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-40, 40, -40],
            x: [-20, 20, -20],
            opacity: [0.05, 0.25, 0.05],
          }}
          transition={{
            duration: 3 + Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-1 h-1 bg-gold-primary rounded-full blur-[1px]"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
