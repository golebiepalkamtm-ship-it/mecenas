import { motion } from "framer-motion";

export const AmbientOrbs = () => {
  // Ultra-optimized background orbs. 
  // Minimal animations to prevent CPU spikes during boot/rag-load.
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Primary Jade orb — top left */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute rounded-full"
        style={{
          width: "120vw", height: "120vw",
          maxWidth: 1400, maxHeight: 1400,
          top: "-35%", left: "-25%",
          background: "radial-gradient(circle, rgba(167, 243, 208, 0.12) 0%, transparent 60%)",
        }}
      />
      
      {/* Secondary Jade accent — bottom right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="absolute rounded-full"
        style={{
          width: "100vw", height: "100vw",
          maxWidth: 1100, maxHeight: 1100,
          bottom: "-15%", right: "-22%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Pure white ambient highlight for Mercury effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3, delay: 1 }}
        className="absolute rounded-full"
        style={{
          width: "80vw", height: "80vw",
          maxWidth: 900, maxHeight: 900,
          top: "10%", right: "5%",
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};
