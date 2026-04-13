import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PrestigeLoadingProps {
  label?: string;
  sublabel?: string;
  variant?: "full" | "compact";
}

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PHASES = [
  "Inicjalizacja rdzenia LexMind",
  "Synchronizacja bazy wiedzy",
  "Weryfikacja modeli neuronowych",
  "Optymalizacja interfejsu",
  "Finalizacja połączenia",
];

export const PrestigeLoading: React.FC<PrestigeLoadingProps> = ({
  label = "LEXMIND SYSTEM",
  sublabel = "weryfikacja parametrów systemu",
  variant = "full",
}) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 99) return p;
        const increment = (100 - p) * 0.04 + Math.random() * 0.5;
        return Math.min(99, p + increment);
      });
    }, 80);
    const phaseInterval = setInterval(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, 1600);
    return () => {
      clearInterval(interval);
      clearInterval(phaseInterval);
    };
  }, []);

  const isFull = variant === "full";

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-center overflow-hidden relative ${isFull ? "bg-[#050505]" : "bg-transparent rounded-2xl"}`}
    >
      <style>{`
        @keyframes prestige-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes prestige-glitch {
          0% { transform: translate(0); text-shadow: -1px 0 #fff, 1px 0 #d4af37; }
          20% { transform: translate(-1px, 1px); text-shadow: -2px 0 #fff, 2px 0 #d4af37; }
          40% { transform: translate(-1px, -1px); text-shadow: 1px 0 #fff, -1px 0 #d4af37; }
          60% { transform: translate(1px, 1px); text-shadow: -1px 0 #fff, 1px 0 #d4af37; }
          80% { transform: translate(1px, -1px); text-shadow: 1px 0 #fff, -1px 0 #d4af37; }
          100% { transform: translate(0); text-shadow: -1px 0 #fff, 1px 0 #d4af37; }
        }
        .prestige-text-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.1) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: prestige-shimmer 4s linear infinite;
        }
      `}</style>

      {/* Background Lighting - Mercury Layering */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.03)_0%,transparent_70%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/3 blur-[120px] rounded-full" />
      </div>

      {/* Sharp Industrial Grid */}
      {isFull && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      )}

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Logo Section */}
        {isFull && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, ease: E }}
            className="relative mb-[-120px] pointer-events-none"
          >
            <img
              src="/logo.png"
              alt="LexMind"
              className="w-[500px] h-[500px] object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.15)] mix-blend-screen"
            />
            {/* Specular highlights on logo */}
            <motion.div 
              animate={{ opacity: [0, 0.5, 0], x: [-100, 400] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
            />
          </motion.div>
        )}

        {/* Text & Progress Section */}
        <div className="flex flex-col items-center text-center max-w-xl">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 1, ease: E }}
            className="mb-8"
          >
            <span className="text-[9px] font-black uppercase tracking-[1em] text-white/30 mb-4 block">System Orchestration</span>
            <h1 className="text-3xl md:text-5xl font-outfit font-black italic uppercase tracking-tight prestige-text-shimmer leading-none mb-4">
              {isFull ? label : "Wait for Access"}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-gold-primary/70 animate-pulse">
              {sublabel}
            </p>
          </motion.div>

          {/* New Progress Bar - Precise & Sharp */}
          <div className="w-[300px] md:w-[450px] space-y-4">
            <div className="relative h-[1.5px] bg-white/5 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-white"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="absolute inset-y-0 left-0 bg-gold-primary opacity-50 blur-xs"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="flex justify-between items-center text-[8px] font-black tracking-[0.3em] uppercase">
              <div className="flex items-center gap-4">
                <span className="text-white/40">Status</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phase}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-white/80"
                  >
                    {PHASES[phase]}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="text-gold-primary">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Decorative Corners for Master View */}
      {isFull && (
        <>
          <div className="absolute top-12 left-12 w-8 h-8 border-t border-l border-white/20" />
          <div className="absolute top-12 right-12 w-8 h-8 border-t border-r border-white/20" />
          <div className="absolute bottom-12 left-12 w-8 h-8 border-b border-l border-white/20" />
          <div className="absolute bottom-12 right-12 w-8 h-8 border-b border-r border-white/20" />
          
          <div className="fixed bottom-8 left-10 flex flex-col gap-1 text-[7px] font-bold text-white/20 uppercase tracking-[0.3em]">
             <span>Encrypted Tunnel: 0x4F2A</span>
             <span>Stability: Nominal</span>
          </div>
        </>
      )}

      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-size-[100%_4px,3px_100%]" />
    </div>
  );
};
