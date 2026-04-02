import { motion } from "framer-motion";

const BrandHeading = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1
          className="font-outfit font-black text-white tracking-tighter italic leading-none"
          style={{
            fontSize: "calc(60px + 6vw)",
            textShadow: "0 0 80px rgba(0,0,0,0.5)",
          }}
        >
          <span
            style={{
              color: "#d4af37",
              textShadow: "0 0 100px rgba(212,175,55,0.95)",
            }}
          >
            Lex
          </span>
          MindAI
        </h1>
        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="h-[2px] w-24 bg-white/30 shadow-glow" />
          <p className="text-[24px] font-inter font-black tracking-[0.8em] text-white/50 uppercase italic whitespace-nowrap">
            Intelligent Justice
          </p>
          <div className="h-[2px] w-24 bg-white/30 shadow-glow" />
        </div>
      </motion.div>
    </div>
  );
};

export default BrandHeading;
