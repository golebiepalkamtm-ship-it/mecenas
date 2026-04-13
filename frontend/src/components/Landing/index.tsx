import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Scale,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import NeuralNetwork from "./NeuralNetwork";

/*   DATA   */

const TICKER = [
  "RAG · Retrieval-Augmented Generation",
  "Kodeks Karny",
  "Analiza równolegla · 3 niezalezne silniki AI",
  "Kodeks Cywilny",
  "Konsensus Wielu Modeli · Zero Halucynacji",
  "Kodeks Pracy",
  "Weryfikacja krzyzowa · Najwyzsza dokladnosc",
  "Kodeks Postepowania Cywilnego",
  "Konsensus Wielu Modeli · Zero Halucynacji",
  "Kodeks Spólek Handlowych",
  "Generator Pism Prawnych · 12+ typów",
  "Konstytucja RP",
  "Kodeks Postepowania Karnego",
  "Kodeks Morski",
];

/*   ANIMATION VARIANTS   */

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};



const slideUpShort = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 60,
      damping: 18,
      delay: 0.6,
    },
  },
};

/*   BACKGROUND   */

function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#222222]" />
      
      <div
        className="absolute -top-[20%] -left-[20%] w-full h-full rounded-full opacity-60 blur-[160px] animate-aurora-slow"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.14) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute top-[10%] -right-[20%] w-[80%] h-[80%] rounded-full opacity-55 blur-[140px] animate-aurora-medium"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute -bottom-[30%] left-[10%] w-[90%] h-[90%] rounded-full opacity-50 blur-[180px] animate-aurora-fast"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)",
        }}
      />

      <div
        className="absolute inset-0 bg-linear-to-b from-transparent via-black/10 to-black"
      />
      
      <div className="absolute inset-0 opacity-80" style={{ transform: "translate(-80px, 5vh)" }}>
        <NeuralNetwork />
      </div>
    </div>
  );
}

/*   TICKER   */

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative overflow-hidden border-t border-white/5 bg-black/30 backdrop-blur-sm shrink-0">
      <div
        className="flex gap-12 whitespace-nowrap py-3"
        style={{ animation: "lx-ticker 38s linear infinite" }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2.5 text-[8px] font-black uppercase tracking-[0.4em] text-white/25"
          >
            <span className="w-1 h-1 rounded-full bg-gold-primary/40 shrink-0" />
            {item}
          </span>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 w-20 bg-linear-to-r from-[#020a13] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-linear-to-l from-[#020a13] to-transparent pointer-events-none" />
    </div>
  );
}

/*   MAIN COMPONENT   */

export function PortalView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const prevH = html.style.overflow;
    const prevB = body.style.overflow;
    const prevR = root?.style.overflow ?? "";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevH;
      body.style.overflow = prevB;
      if (root) root.style.overflow = prevR;
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: email.split("@")[0] } },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Sprawdz e-mail i potwierdz rejestracje!",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <style>{`
        @keyframes lx-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lx-scan { 0% { transform: translateY(-120%); } 100% { transform: translateY(250%); } }
        @keyframes lx-panel-pulse {
          0%,100% { box-shadow: 0 0 0 1px rgba(255,215,128,0.18), 0 32px 80px rgba(0,0,0,0.6); }
          50%      { box-shadow: 0 0 0 1px rgba(255,215,128,0.30), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,215,128,0.08); }
        }
        @keyframes aurora-flow {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10%, 10%) scale(1.1); }
          66% { transform: translate(-5%, 15%) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .animate-aurora-slow { animation: aurora-flow 25s infinite ease-in-out; }
        .animate-aurora-medium { animation: aurora-flow 18s infinite ease-in-out reverse; }
        .animate-aurora-fast { animation: aurora-flow 12s infinite ease-in-out; }
        .lx-panel { animation: lx-panel-pulse 5s ease-in-out infinite; }
        .lx-scan  { animation: lx-scan 7s linear infinite; }
      `}</style>

      <Background /> 
      <div className="absolute inset-0 bg-linear-to-b from-[#0a0800] via-[#050400] to-[#020100] opacity-0" />



      {/* Animacje keyframes */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulse-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.3); }
          50% { text-shadow: 0 0 30px rgba(212,175,55,0.8), 0 0 60px rgba(212,175,55,0.5), 0 0 80px rgba(255,220,120,0.3); }
        }
      `}</style>

      {/* LOGO: Massive Top-Left Corner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="fixed -top-10 -left-10 lg:-top-16 lg:-left-16 z-100"
      >
        <img
          src="/logo.png"
          alt="LexMind"
          className="w-80 h-80 sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px] object-contain filter drop-shadow-[0_0_100px_rgba(212,175,55,0.6)] mix-blend-screen opacity-90"
        />
      </motion.div>

      <div className="relative h-screen w-screen flex flex-col selection:bg-gold-primary/30 selection:text-white overflow-hidden">
        
        {/* TOP HEADER: Centered Branding - ENLARGED */}
        <motion.header
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="fixed top-0 left-0 right-0 pt-12 z-50 flex flex-col items-center pointer-events-none"
          style={{ transform: "translateX(-200px)" }}
        >
          <div className="space-y-4 flex flex-col items-center">
            {/* Meta HUD Label */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.6em] text-white">
                Neural Reasoning Engine v4.2
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse" />
            </motion.div>

            {/* Centered LexMind Title - LARGER - Adjusted to prevent clipping */}
            <div className="relative inline-block px-12 overflow-visible">
              <h1
                className="text-6xl sm:text-7xl lg:text-9xl font-outfit font-black italic uppercase tracking-[-0.02em] leading-[1.1] pr-12"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #d1d5db 40%, #d4af37 55%, #fde68a 70%, #ffffff 100%)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 40px rgba(212,175,55,0.25))",
                  animation: "shimmer 5s ease-in-out infinite",
                  overflow: "visible",
                }}
              >
                LexMind
              </h1>
            </div>

            <div className="flex items-center justify-center gap-6 opacity-60">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gold-primary">Selected AI Models</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white">Zero Hallucinations</span>
            </div>
          </div>
        </motion.header>

        {/* MAIN BODY: Login Panel shifted further Right */}
        <div className="relative z-20 flex-1 flex items-center justify-center lg:justify-end px-6 lg:pr-12 xl:pr-20">
          <motion.aside
            variants={slideUpShort}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[420px] relative z-10"
          >
            <div className="relative rounded-4xl overflow-hidden lx-panel glass-prestige"
                 style={{ transformStyle: "preserve-3d", perspective: "1000px" }}>
              
              <div className="absolute top-0 right-0 w-64 h-64 -translate-y-1/2 translate-x-1/3 pointer-events-none rounded-full"
                   style={{ background: "radial-gradient(ellipse, rgba(255,215,128,0.06) 0%, transparent 65%)" }} />

              <div className="relative p-8 lg:p-10">
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">
                          7 dni bezpłatnie · pełen dostęp do RAG
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="text-center mb-8">
                  <div className="flex justify-center mb-5">
                    <div className="w-12 h-12 rounded-2xl border border-gold-primary/25 bg-gold-primary/10 flex items-center justify-center">
                      <Scale size={20} className="text-gold-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isSignUp ? "su" : "li"}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <h3 className="text-[1.5rem] lg:text-[1.75rem] font-outfit font-black italic text-gold-gradient uppercase tracking-[-0.03em] leading-none mb-2">
                        {isSignUp ? "Utwórz konto" : "Witaj z powrotem"}
                      </h3>
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/35">
                        {isSignUp ? "Rozpocznij okres próbny" : "Zaloguj się do portalu AI"}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <form onSubmit={handleAuth} className="space-y-3.5" autoComplete="off">
                  <div className="relative group">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-gold-primary transition-colors duration-200" />
                    <input
                      ref={emailRef}
                      type="email"
                      placeholder="ADRES E-MAIL"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-[15px] pl-11 pr-4 text-[10px] font-bold tracking-[0.2em] text-white placeholder:text-white/20 focus:outline-none focus:border-gold-primary/60 focus:bg-white/8 transition-all"
                      required
                    />
                  </div>

                  <div className="relative group">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-gold-primary transition-colors duration-200" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="HASŁO"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-[15px] pl-11 pr-12 text-[10px] font-bold tracking-[0.2em] text-white placeholder:text-white/20 focus:outline-none focus:border-gold-primary/60 focus:bg-white/8 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-gold-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`overflow-hidden text-[9px] font-black uppercase tracking-widest text-center py-2.5 px-4 rounded-xl border ${
                          message.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={loading ? {} : { scale: 1.01, boxShadow: "0 0 30px rgba(212,175,55,0.3)" }}
                    whileTap={loading ? {} : { scale: 0.98 }}
                    className="group relative w-full bg-gold-primary text-black font-black uppercase text-[10px] tracking-[0.3em] py-[16px] rounded-2xl flex items-center justify-center gap-2 overflow-hidden shadow-[0_4px_30px_rgba(255,215,128,0.25)] transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <> {isSignUp ? "UTWÓRZ KONTO" : "ZALOGUJ SIĘ"} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /> </>}
                  </motion.button>
                </form>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(v => !v); setMessage(null); }}
                    className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-gold-primary/80 transition-colors"
                  >
                    {isSignUp ? "MASZ JUŻ KONTO? ZALOGUJ SIĘ" : "NIE MASZ KONTA? WYPRÓBUJ BEZPŁATNIE"}
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-white/8">
                  <p className="text-[7.5px] text-white/10 font-bold uppercase tracking-widest text-center leading-relaxed">
                    System LexMind AI v4.2 · Secure Connection Active
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>

        <Ticker />
      </div>
    </>
  );
}
