import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  CheckCircle2,
  Scale,
  ArrowRight,
  ShieldCheck,
  FileSearch,
  Star,
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

const itemUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 16 },
  },
};

const slideIn = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 60,
      damping: 18,
      delay: 0.35,
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
      
      <div className="absolute inset-0 opacity-80 transform translate-y-[5vh]">
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



      {/* Logo w lewym górnym rogu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed -top-8 -left-8 z-50"
      >
        <img
          src="/logo.png"
          alt="LexMind Logo"
          className="w-80 h-80 lg:w-96 lg:h-96 object-contain drop-shadow-[0_0_80px_rgba(212,175,55,0.9)]"
        />
      </motion.div>

      <div className="relative h-screen w-screen flex flex-col selection:bg-gold-primary/30 selection:text-white overflow-hidden">
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row lg:items-stretch h-full w-full">
          <motion.section
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 flex flex-col justify-between p-8 lg:p-16 lg:pl-20"
          >
            {/* PRZYWRÓCONA ORYGINALNA TREŚĆ - UŁOŻONA TAK BY NIE ZASŁANIAĆ DRZEWA */}
            <div className="max-w-lg space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h1
                  className="text-5xl sm:text-6xl lg:text-7xl font-outfit font-black italic uppercase tracking-tighter"
                  style={{
                    background: "linear-gradient(135deg, #d4af37 0%, #f9e29d 25%, #ffffff 50%, #f9e29d 75%, #d4af37 100%)",
                    backgroundSize: "200% 200%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "0 0 60px rgba(212,175,55,0.4)",
                    animation: "shimmer 3s ease-in-out infinite",
                  }}
                >
                  LexMind
                </h1>

                <h2 className="text-xs sm:text-base font-outfit font-bold italic uppercase tracking-[0.15em] text-white/90">
                  Wybrane modele AI <span className="text-gold-primary/80">•</span> Jeden werdykt <span className="text-gold-primary/80">•</span> Zero halucynacji
                </h2>

                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed max-w-md font-medium uppercase tracking-wide">
                  System RAG przeszukuje polskie kodeksy, ustawy oraz orzeczenia sądów, pobierając wyłącznie zweryfikowane źródła.
                  Pytanie trafia równolegle do czołowych modeli od liderów rynku – OpenAI, Google, Anthropic oraz xAI.
                  Zaawansowany agregator syntetyzuje ich odpowiedzi w jeden konsensus, eliminując błędy i dostarczając precyzyjną wykładnię opartą na faktach.
                </p>

                <div className="flex flex-col gap-3">
                  <p
                    className="text-[10px] sm:text-sm font-outfit font-black italic uppercase tracking-[0.25em]"
                    style={{
                      color: "#d4af37",
                      textShadow: "0 0 20px rgba(212,175,55,0.6)",
                      animation: "pulse-glow 2s ease-in-out infinite",
                    }}
                  >
                    LexMind. Pewność prawa, potęga technologii.
                  </p>
                  
                  <div
                    className="w-32 h-px"
                    style={{
                      background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
                      boxShadow: "0 0 10px rgba(212,175,55,0.5)",
                    }}
                  />
                </div>
              </motion.div>
            </div>

          </motion.section>



          <motion.aside
            variants={slideIn}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full lg:w-[500px] xl:w-[540px] flex items-center justify-center px-6 sm:px-10 lg:px-10 py-12 lg:py-0"
          >
            <div className="w-full max-w-[420px]">
              <motion.div
                className="relative rounded-4xl overflow-hidden lx-panel glass-prestige"
                style={{
                  transformStyle: "preserve-3d",
                  perspective: "1000px",
                }}
                whileHover={{
                  rotateX: -3,
                  rotateY: 5,
                  z: 20,
                  boxShadow: "0 60px 120px rgba(0,0,0,0.8), 0 0 80px rgba(212,175,55,0.15)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div
                  className="absolute top-0 right-0 w-64 h-64 -translate-y-1/2 translate-x-1/3 pointer-events-none rounded-full"
                  style={{
                    background:
                      "radial-gradient(ellipse, rgba(255,215,128,0.06) 0%, transparent 65%)",
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 w-48 h-48 translate-y-1/2 -translate-x-1/3 pointer-events-none rounded-full"
                  style={{
                    background:
                      "radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 65%)",
                  }}
                />

                <div className="relative p-8 lg:p-10">
                  <AnimatePresence>
                    {isSignUp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          marginBottom: 24,
                        }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2
                            size={14}
                            className="text-emerald-400 shrink-0"
                          />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">
                            7 dni bezplatnie · pelen dostep do RAG
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-5">
                      <div className="w-12 h-12 rounded-2xl border border-gold-primary/25 bg-gold-primary/10 flex items-center justify-center">
                        <Scale
                          size={22}
                          className="text-gold-primary"
                          strokeWidth={1.5}
                        />
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
                        <h3 className="text-[1.75rem] lg:text-[2rem] font-outfit font-black italic text-gold-gradient uppercase tracking-[-0.03em] leading-none mb-2">
                          {isSignUp ? "Utwórz konto" : "Witaj z powrotem"}
                        </h3>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/35">
                          {isSignUp
                            ? "Rozpocznij bezplatny okres próbny"
                            : "Zaloguj sie do kancelarii AI"}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <form
                    onSubmit={handleAuth}
                    className="space-y-3.5"
                    autoComplete="off"
                  >
                    <div className="relative group">
                      <Mail
                        size={15}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-gold-primary transition-colors duration-200"
                      />
                      <input
                        ref={emailRef}
                        type="email"
                        placeholder="ADRES E-MAIL"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-[15px] pl-11 pr-4 text-[11px] font-bold tracking-[0.2em] text-white placeholder:text-white/20 focus:outline-none focus:border-gold-primary/60 focus:bg-white/8 transition-all"
                        required
                        autoComplete="off"
                        data-lpignore="true"
                      />
                    </div>

                    <div className="relative group">
                      <Lock
                        size={15}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-gold-primary transition-colors duration-200"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="HASLO"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-[15px] pl-11 pr-12 text-[11px] font-bold tracking-[0.2em] text-white placeholder:text-white/20 focus:outline-none focus:border-gold-primary/60 focus:bg-white/8 transition-all"
                        required
                        autoComplete="new-password"
                        data-lpignore="true"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-gold-primary transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
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
                            message.type === "error"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {message.text}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={
                        loading
                          ? {}
                          : {
                              scale: 1.02,
                              boxShadow: "0 0 44px rgba(255,215,128,0.4)",
                            }
                      }
                      whileTap={loading ? {} : { scale: 0.97 }}
                      className="group relative w-full bg-gold-primary text-black font-black uppercase text-[10px] tracking-[0.3em] py-[18px] rounded-2xl flex items-center justify-center gap-2 overflow-hidden shadow-[0_4px_30px_rgba(255,215,128,0.25)] transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(105deg, transparent 28%, rgba(255,255,255,0.2) 50%, transparent 72%)",
                        }}
                      />
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          {isSignUp
                            ? "STWÓRZ KONTO PRÓBNE"
                            : "WEJDZ DO KANCELARII"}
                          <ArrowRight
                            size={14}
                            className="group-hover:translate-x-1 transition-transform"
                          />
                        </>
                      )}
                    </motion.button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp((v) => !v);
                        setMessage(null);
                      }}
                      className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-gold-primary/80 transition-colors"
                    >
                      {isSignUp
                        ? "MASZ JUZ KONTO? ZALOGUJ SIE"
                        : "NIE MASZ KONTA? WYPRÓBUJ BEZPLATNIE ->"}
                    </button>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/8 flex flex-col items-center">
                    <p className="text-[7.5px] text-white/20 font-bold uppercase tracking-widest text-center max-w-[260px] leading-relaxed">
                      Korzystając z systemu akceptujesz politykę prywatności i
                      regulamin LexMind AI.
                    </p>
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.aside>
        </div>

        <Ticker />
      </div>
    </>
  );
}
