import React, { useEffect } from "react";
import { motion } from "framer-motion";

const LOADING_STYLES = `
  ::-webkit-scrollbar { display: none !important; width: 0 !important; }
  * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
  
  .lex-brand-monument {
    font-family: 'Outfit', sans-serif;
    font-weight: 200;
    color: #D4AF37;
    text-transform: uppercase;
    letter-spacing: 0.5em;
    margin-top: -100px;
    user-select: none;
    pointer-events: none;
  }
`;

export const ModernLoading: React.FC = React.memo(() => {
  useEffect(() => {
    // Blokujemy scroll u podstaw
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <section 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0
      }}
    >
      <style>{LOADING_STYLES}</style>

      <div className="relative flex flex-col items-center">
        {/* LOGO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <img
            src="/logo.png?v=999"
            alt="LexMind"
            className="w-72 h-72 md:w-[480px] md:h-[480px] object-contain block border-none outline-none"
          />
        </motion.div>

        {/* NAPIS */}
        <motion.h1 
          className="lex-brand-monument text-3xl md:text-5xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          LEXMIND AI
        </motion.h1>
        
        {/* KROPKI - EKSTREMALNY WĘŻYK (FALA) */}
        <div className="mt-16 flex gap-2.5 h-6 items-center justify-center">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                opacity: [0.3, 1, 0.3],
                y: [0, -15, 0] 
              }}
              transition={{ 
                duration: 1.4, 
                repeat: Infinity, 
                delay: i * 0.1,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
            />
          ))}
        </div>
      </div>
    </section>
  );
});
