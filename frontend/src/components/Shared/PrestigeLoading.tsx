import React from "react";
import { motion } from "framer-motion";
import { Scale } from "lucide-react";

interface PrestigeLoadingProps {
  label?: string;
  sublabel?: string;
}

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PrestigeLoading: React.FC<PrestigeLoadingProps> = ({ 
  label = "Initializing Prestige Core",
  sublabel = "establishing secure handshake"
}) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center overflow-hidden" 
         style={{ background: 'radial-gradient(ellipse at center, #1b2735 0%, #090a0f 100%)' }}>
      {/* Top-right status */}
      <div className="fixed top-8 right-10 flex items-center gap-3">
        <div className="w-px h-4 bg-white/20" />
        <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/30">
          Node: LexMind-W-01 / Core v4.2
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: E }}
        className="relative z-10 flex flex-col items-center gap-16"
      >
        {/* Logo with rotating rings */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360, scale: [0.95, 1, 0.95] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-14 rounded-full"
            style={{ border: "1px dashed rgba(212,175,55,0.12)" }}
          />
          <motion.div
            animate={{ rotate: -360, opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-8 rounded-full"
            style={{ border: "2px solid rgba(255,255,255,0.03)" }}
          />
          <div
            className="w-28 h-28 rounded-4xl flex items-center justify-center relative overflow-hidden"
            style={{
              background:
                "linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(10,15,30,0.85) 100%)",
              borderTop: "2.5px solid rgba(255,255,255,1.0)",
              borderLeft: "2px solid rgba(212,175,55,0.6)",
              borderRight: "0.5px solid rgba(212,175,55,0.3)",
              borderBottom: "2.5px solid rgba(0,0,0,0.95)",
              boxShadow:
                "0 30px 100px rgba(0,0,0,0.9), inset 0 2px 0 rgba(255,255,255,0.6), 0 0 120px rgba(212,175,55,0.25)",
            }}
          >
            <Scale className="w-16 h-16 text-gold-primary drop-shadow-[0_0_25px_rgba(212,175,55,0.9)]" strokeWidth={1.5} />
            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-scanline pointer-events-none opacity-30" />
            <div className="absolute inset-0 bg-radial-to-t from-gold-primary/10 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Label & Progress */}
        <div className="flex flex-col items-center gap-10">
          <div className="flex flex-col items-center">
            <h1 className="shimmer-text text-[15px] font-black uppercase tracking-[1.5em] relative left-[0.75em] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
              {label}
            </h1>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[11px] font-black text-gold-primary uppercase tracking-[0.8em] mt-4 italic drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]"
            >
              {sublabel}
            </motion.span>
          </div>

          <div
            className="w-64 h-px relative overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <motion.div
              animate={{ x: ["-100%", "150%"] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-y-0 w-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)",
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
