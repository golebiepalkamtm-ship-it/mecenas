import React from "react";
import { motion } from "framer-motion";

export const PrestigeLoading: React.FC<any> = () => {
  return (
    <div className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Czysty CSS dla brandingu - zapobiega tylko kursorowi tekstowemu */}
      <style>{`
        * { caret-color: transparent !important; }
        body, html { overflow: hidden !important; }
      `}</style>

      <div className="relative flex flex-col items-center">
        {/* LOGO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <img
            src="/logo.png?v=110"
            alt="LexMind"
            className="w-80 h-80 md:w-[500px] md:h-[500px] object-contain block"
          />
        </motion.div>

        {/* LABEL */}
        <div style={{ marginTop: "-120px" }}>
           <div 
             className="text-2xl md:text-5xl font-extralight text-[#D4AF37] uppercase"
             style={{ 
               letterSpacing: '0.45em',
               fontFamily: "'Outfit', sans-serif"
             }}
           >
             LEXMIND AI
           </div>
        </div>

        {/* KROPKI */}
        <div className="mt-8 flex gap-3 h-2 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
