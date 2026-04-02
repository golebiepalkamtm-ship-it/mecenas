import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{
        top: "10px",
        left: "-130px",
        margin: "0",
        padding: "0",
      }}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative shrink-0 pointer-events-auto cursor-pointer flex items-start group">
        {/* LOGO BOX */}
        <div className="relative">
          <img
            src="/logo.png"
            alt="LexMind AI"
            className="block select-none pointer-events-none"
            style={{
              width: 560,
              height: 560,
              objectFit: "contain",
              objectPosition: "left top",
              filter: "drop-shadow(0 0 70px rgba(212,175,55,0.75))",
            }}
          />
        </div>
        
        {/* BRAND TEXT FROM BRANDHEADING */}
        <div 
          className="ml-[-60px] mt-[40px]" // Subtelne przesunięcie napisu w dół dla balansu
          style={{
            zIndex: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg width="100%" height="200" viewBox="0 0 1200 200" preserveAspectRatio="xMinYMid meet" className="italic font-black overflow-visible" style={{ marginLeft: "-40px" }}>
              <defs>
                <linearGradient id="lexMindGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="35%" stopColor="#cbd5e1" />
                  <stop offset="50%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
                <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f9e29d" />
                  <stop offset="35%" stopColor="#d4af37" />
                  <stop offset="50%" stopColor="#b89108" />
                  <stop offset="100%" stopColor="#854d0e" />
                </linearGradient>
                <filter id="raised" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.5" />
                </filter>
              </defs>
              <g filter="url(#raised)">
                {/* LexMind - Layer 1 (Stroke Only) */}
                <text x="50" y="150" style={{ fontSize: "160px", fill: "none", stroke: "rgba(148,163,184,0.6)", strokeWidth: "4px" }}>LexMind</text>
                {/* LexMind - Layer 2 (Fill Only - Covers inner stroke) */}
                <text x="50" y="150" style={{ fontSize: "160px", fill: "url(#lexMindGradient)" }}>LexMind</text>
                
                {/* AI - Layer 1 (Stroke Only) */}
                <text x="760" y="150" style={{ fontSize: "160px", fill: "none", stroke: "rgba(249,226,157,0.7)", strokeWidth: "4px" }}>AI</text>
                {/* AI - Layer 2 (Fill Only - Covers inner stroke) */}
                <text x="760" y="150" style={{ fontSize: "160px", fill: "url(#aiGradient)" }}>AI</text>
              </g>
            </svg>
            <div className="flex items-center gap-5 mt-4 justify-center">
              <div className="h-[2px] w-16 bg-[#c0c0c0]/30 shadow-[0_0_15px_rgba(192,192,192,0.5)]" />
              <p className="text-[24px] font-inter font-black tracking-[0.8em] text-[#c0c0c0]/80 uppercase italic whitespace-nowrap">
                Intelligent Justice
              </p>
              <div className="h-[2px] w-16 bg-[#c0c0c0]/30 shadow-[0_0_15px_rgba(192,192,192,0.5)]" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroSection;
