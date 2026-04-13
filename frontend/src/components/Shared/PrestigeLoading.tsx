import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";

interface PrestigeLoadingProps {
  label?: string;
  sublabel?: string;
  variant?: "full" | "compact";
  progress?: number;
}

const EASE_QUINT = [0.83, 0, 0.17, 1] as [number, number, number, number];

const TELEMETRY = [
  "CRYPTO_VAULT_OPEN", "SYL_PROTOCOL_ACTIVE", "LINK_STABILITY_0.999",
  "NODE_3_REPLICATED", "LATENCY_NOMINAL", "TR_MATRIX_STABLE",
  "SEC_XOR_ACTIVE", "BRUTALIST_UI_v4", "PLATINUM_CORE_READY"
];

const LOGS = [
  "Initializing neural matrices...",
  "Synchronizing legal knowledge graph...",
  "Verifying consensus engine...",
  "Applying industrial-luxury shaders...",
  "Establishing secure handshake...",
  "Finalizing LexMind orchestration...",
];

export const PrestigeLoading: React.FC<PrestigeLoadingProps> = ({
  label = "LEXMIND",
  sublabel = "Accessing High-Fidelity Infrastructure",
  variant = "full",
  progress: externalProgress,
}) => {
  const [internalProgress, setInternalProgress] = useState(0);
  
  const displayProgress = externalProgress !== undefined ? externalProgress : internalProgress;
  
  const barProgress = useSpring(displayProgress, {
    damping: 20,
    stiffness: 100,
    mass: 0.5
  });

  const width = useTransform(barProgress, [0, 100], ["0%", "100%"]);

  // Map progress (0-100) to log index (0-5)
  const currentLog = Math.min(LOGS.length - 1, Math.floor((displayProgress / 100) * LOGS.length));
  
  const mX = useMotionValue(0);
  const mY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mX.set(e.clientX);
      mY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    
    let interval: ReturnType<typeof setInterval> | undefined;
    if (externalProgress === undefined) {
      interval = setInterval(() => {
        setInternalProgress((p: number) => {
          if (p >= 100) return 100;
          return Math.min(100, p + (Math.random() * 2 + (100 - p) * 0.05));
        });
      }, 120);
    }
    
    // sync spring
    barProgress.set(displayProgress);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (interval) clearInterval(interval);
    };
  }, [displayProgress, externalProgress, mX, mY, barProgress]);

  const isFull = variant === "full";

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-center overflow-hidden relative font-outfit select-none ${
        isFull ? "fixed inset-0 z-2000 bg-[#030303]" : "bg-[#050505] rounded-[3rem]"
      }`}
    >
      <style>{`
        .text-stroke {
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.1);
          color: transparent;
        }
        .scanline-vertical {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          background-size: 2px 100%;
        }
        .grain-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.15;
          filter: contrast(150%) brightness(100%);
        }
      `}</style>

      {/* Global Grain & Distortion */}
      <div className="absolute inset-0 pointer-events-none grain-overlay z-100 mix-blend-overlay" />

      {/* HUD Telemetry - Rotating & Moving */}
      <div className="absolute inset-x-20 inset-y-20 pointer-events-none overflow-hidden">
        {TELEMETRY.map((txt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.12, 0], 
              y: [0, -100],
              x: Math.sin(i) * 20
            }}
            transition={{ duration: 10 + i, repeat: Infinity, delay: i * 1.5 }}
            className="absolute text-[8px] font-black uppercase tracking-[0.5em] text-white/40 whitespace-nowrap"
            style={{ 
              left: `${(i * 15) % 90}%`, 
              top: `${(i * 20) % 90}%`
            }}
          >
            {txt}
          </motion.div>
        ))}
      </div>

      {/* Main Massive Content */}
      <div className="relative z-50 flex flex-col items-center w-full text-center">
        {/* Central Logo & Interaction */}
        {isFull && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.5, ease: EASE_QUINT }}
            className="relative mb-[-40px] group"
          >
            <motion.img
              src="/logo.png"
              alt="LexMind"
              className="w-[200px] h-[200px] md:w-[300px] md:h-[300px] object-contain drop-shadow-[0_0_120px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_150px_rgba(255,255,255,0.15)] transition-all duration-700 contrast-[1.1] brightness-[1.05]"
            />
          </motion.div>
        )}

        {/* Branding & Status */}
        <div className="flex flex-col items-center mt-32 md:mt-0">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.5, ease: EASE_QUINT }}
            className="mb-8"
          >
            <h1 className="text-6xl md:text-10xl font-black italic uppercase tracking-[-0.08em] leading-none text-white mb-2">
              {label}
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.8em] text-white/20 animate-pulse mt-4">
              {sublabel}
            </p>
          </motion.div>

          {/* Precision Industrial Progress Bar */}
          <div className="relative w-[320px] md:w-[600px] h-20 flex flex-col items-center justify-center">
             <div className="w-full h-px bg-white/10 relative">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                  style={{ width }}
                />
                
                {/* Scanning Light */}
                <motion.div 
                  animate={{ left: ["-10%", "110%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 w-24 h-full bg-linear-to-r from-transparent via-white/40 to-transparent blur-sm"
                />
             </div>

             {/* Metric Counters */}
             <div className="w-full flex justify-between mt-4">
               <div className="flex flex-col gap-1 items-start">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Realtime Feed</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentLog}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em]"
                    >
                      {LOGS[currentLog]}
                    </motion.span>
                  </AnimatePresence>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[24px] font-black text-white italic tabular-nums leading-none">
                    {Math.round(displayProgress)}
                    <span className="text-[10px] ml-0.5 text-white/40 not-italic">%</span>
                  </span>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Status: Syncing</span>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Decoration: Minimal corner metadata */}
      {isFull && (
        <>
          <div className="fixed top-10 left-0 right-0 h-px bg-white/5" />
          <div className="fixed bottom-10 left-0 right-0 h-px bg-white/5" />
          
          <div className="fixed top-12 left-12 flex flex-col gap-1 text-[7px] font-black text-white/40 uppercase tracking-[0.3em]">
             <span>System_Auth: 0x992A</span>
             <span>Network: Encrypted Alpha</span>
          </div>
          <div className="fixed bottom-12 right-12 text-[7px] font-black text-white/40 uppercase tracking-[0.3em] flex flex-col items-end">
             <span>Stability Index: 1.00</span>
             <span>Ref: {new Date().toISOString().slice(0,10)}</span>
          </div>
        </>
      )}
    </div>
  );
};
