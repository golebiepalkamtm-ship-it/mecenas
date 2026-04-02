import { motion } from "framer-motion";
import HeroSection from "./HeroSection";
import LoginPortal from "./LoginPortal";
import NeuralNetwork from "./NeuralNetwork";

const TICKER_ITEMS = [
  "Quantum Neural Processing Active",
  "AES-256 Multi-Layer Encryption",
  "TLS 1.3 Secure Protocol",
  "Consensus Architecture v4.2",
  "Zero-Hallucination Compliance",
  "Agentic RAG Pipeline Online",
  "Enterprise Grade Infrastructure",
  "Legal Intelligence Core 2026",
];

export function LandingView() {
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-sea) 55%, var(--bg-blue) 100%)",
      }}
    >
      {/* ─── BACKGROUND LAYERS ─── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Aurora radial glow */}
        <div className="aurora-bg opacity-20" />

        {/* Film-grain noise */}
        <div className="noise-overlay opacity-4" />

        {/* Architectural grid — fades toward edges */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)",
            backgroundSize: "100px 100px",
            maskImage:
              "radial-gradient(ellipse 68% 58% at 38% 50%, black 0%, transparent 78%)",
          }}
        />

        {/* Floating colour orbs */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full orb orb-gold"
          style={{ width: 580, height: 580, top: -110, left: "16%" }}
        />
        <motion.div
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full orb orb-teal"
          style={{ width: 820, height: 820, bottom: -260, right: -160 }}
        />
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute rounded-full orb orb-gold"
          style={{ width: 340, height: 340, bottom: "20%", left: "10%" }}
        />
      </div>

      <div className="absolute inset-0" style={{ zIndex: 100, pointerEvents: "none" }}>
        <NeuralNetwork />
      </div>

      {/* ─── GOLD HAIRLINE AT TOP ─── */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-20"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.1) 20%, rgba(212,175,55,0.2) 50%, rgba(212,175,55,0.1) 80%, transparent 100%)",
          transformOrigin: "left center",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2.4, delay: 0.15, ease: "easeOut" }}
      />

      {/* ─── LOGO + TAGLINE — top-left (HeroSection is absolute inside) ─── */}
      <HeroSection />

      {/* ─── GRADIENT VEIL behind login form ─── */}
      {/* Provides clean visual separation without a harsh edge */}
      <div
        className="absolute top-0 right-0 bottom-0 pointer-events-none"
        style={{
          zIndex: 8,
          width: "460px",
          background:
            "linear-gradient(to left, rgba(9, 61, 77,0.50) 0%, rgba(9, 61, 77,0.20) 55%, transparent 100%)",
          
          
        }}
      />

      {/* ─── LOGIN FORM — right column ─── */}
      <div
        className="absolute top-0 right-0 bottom-0 flex items-center justify-center"
        style={{
          zIndex: 10,
          width: "460px",
          paddingTop: "64px",
          paddingBottom: "56px",
          paddingLeft: "10px",
          paddingRight: "44px",
        }}
      >
        <LoginPortal />
      </div>

      {/* ─── BOTTOM DATA TICKER ─── */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-20 overflow-hidden border-t bg-black/50 backdrop-blur-md"
        style={{ borderColor: "rgba(212,175,55,0.55)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 1.0 }}
      >
        <div className="py-[14px] flex items-center overflow-hidden">
          <div
            className="flex whitespace-nowrap gap-16 px-8"
            style={{ animation: "ticker-scroll 32s linear infinite" }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((text, i) => (
              <span key={i} className="flex items-center gap-4">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: "#d4af37",
                    boxShadow: "0 0 10px rgba(212,175,55,0.9)",
                  }}
                />
                <span className="text-[10px] font-inter font-black tracking-[0.40em] uppercase text-white/75 italic">
                  {text}
                </span>
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
