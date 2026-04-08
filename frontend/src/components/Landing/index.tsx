import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  CheckCircle2,
  Star,
  Database,
  GitMerge,
  ScrollText,
  ShieldCheck,
  FileSearch,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <Database size={18} />,
    badge: "16 aktów prawnych",
    title: "System RAG",
    desc: "Kodeks Karny, Cywilny, Pracy, KPC, KPK, Handlowy, Morski, Rodzinny, Konstytucja RP i 7 innych — system przeszukuje wyłącznie oficjalne, zweryfikowane akty. Zero danych z internetu.",
    accent: "rgba(212,175,55,0.10)",
    border: "rgba(212,175,55,0.22)",
    iconBg: "rgba(212,175,55,0.15)",
    iconColor: "#f0cc5a",
    badgeColor: "#f0cc5a",
  },
  {
    icon: <GitMerge size={18} />,
    badge: "Analiza równoległa · 3 niezależne modele",
    title: "Konsensus 3 Modeli AI",
    desc: "Każde pytanie trafia równolegle do trzech niezależnych modeli. Agregator syntetyzuje odpowiedzi — wynik pojawia się tylko tam, gdzie eksperci są zgodni.",
    accent: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
    iconBg: "rgba(139,92,246,0.15)",
    iconColor: "#c4b5fd",
    badgeColor: "#c4b5fd",
  },
  {
    icon: <ScrollText size={18} />,
    badge: "12+ typów dokumentów",
    title: "Generator Pism Prawnych",
    desc: "Pozwy, apelacje, skargi, zażalenia, odpowiedzi na pozew, umowy i inne — gotowe dokumenty oparte na RAG, dostosowane do konkretnej sprawy.",
    accent: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.22)",
    iconBg: "rgba(245,158,11,0.14)",
    iconColor: "#fcd34d",
    badgeColor: "#fcd34d",
  },
  {
    icon: <ShieldCheck size={18} />,
    badge: "≈ 0% halucynacji",
    title: "Eliminacja Błędów AI",
    desc: "Rozbieżności między modelami są wykrywane i flagowane. System nie zmyśla przepisów — gdy eksperci się nie zgadzają, informuje Cię o niepewności zamiast milczeć.",
    accent: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.22)",
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#6ee7b7",
    badgeColor: "#6ee7b7",
  },
];

const STATS = [
  { value: "16", label: "Aktów w RAG" },
  { value: "×3", label: "Modele AI" },
  { value: "12+", label: "Typy pism" },
  { value: "≈0%", label: "Halucynacji" },
];

const TICKER = [
  "RAG · Retrieval-Augmented Generation",
  "Kodeks Karny",
  "Analiza równoległa · 3 niezależne silniki AI",
  "Kodeks Cywilny",
  "Konsensus Wielu Modeli · Zero Halucynacji",
  "Kodeks Pracy",
  "Weryfikacja krzyżowa · Najwyższa dokładność",
  "Kodeks Postępowania Cywilnego",
  "Konsensus Wielu Modeli · Zero Halucynacji",
  "Kodeks Spółek Handlowych",
  "Generator Pism Prawnych · 12+ typów",
  "Konstytucja RP",
  "Kodeks Postępowania Karnego",
  "Kodeks Morski",
];

/* ─────────────────────────────────────────────────────────────
   ANIMATION VARIANTS
───────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────
   BACKGROUND
───────────────────────────────────────────────────────────── */

function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Black Foundation for Depth */}
      <div className="absolute inset-0 bg-[#020508]" />
      
      {/* Ultra-Smooth Mesh Orbs with High Blur */}
      <div
        className="absolute -top-[20%] -left-[20%] w-full h-full rounded-full opacity-30 blur-[160px] animate-aurora-slow"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.14) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute top-[10%] -right-[20%] w-[80%] h-[80%] rounded-full opacity-25 blur-[140px] animate-aurora-medium"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute -bottom-[30%] left-[10%] w-[90%] h-[90%] rounded-full opacity-20 blur-[180px] animate-aurora-fast"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)",
        }}
      />

      {/* Deep Vignette for Focus */}
      <div
        className="absolute inset-0 bg-linear-to-b from-transparent via-[#020508]/40 to-[#020508]"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TICKER
───────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export function LandingView() {
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
    html.style.overflow = "auto";
    body.style.overflow = "auto";
    if (root) root.style.overflow = "auto";
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
          text: "Sprawdź e-mail i potwierdź rejestrację!",
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

  const startTrial = () => {
    setIsSignUp(true);
    setMessage(null);
    setTimeout(() => emailRef.current?.focus(), 120);
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

      <div className="relative min-h-screen w-screen flex flex-col selection:bg-gold-primary/30 selection:text-white overflow-x-hidden">
        {/* ══════ BODY ══════ */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row lg:items-stretch">
          {/* ──────────────────────────────────────
              HERO — LEFT
          ────────────────────────────────────── */}
          <motion.section
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-14 lg:py-20"
          >
            <div className="max-w-[640px]">
              {/* Logo mark */}
              <motion.div variants={itemUp} className="mb-8">
                <div className="relative inline-flex">
                  <div className="absolute -inset-4 rounded-[2.4rem] border border-gold-primary/10 animate-pulse-slow" />
                  <div className="absolute -inset-2 rounded-[1.8rem] border border-gold-primary/18" />
                  <div className="relative w-[88px] h-[88px] lg:w-[100px] lg:h-[100px] rounded-[1.6rem] bg-gold-primary flex items-center justify-center overflow-hidden shadow-[0_0_100px_rgba(255,215,128,0.5),0_0_40px_rgba(255,215,128,0.3)] animate-glow-pulse">
                    <Scale
                      className="w-11 h-11 lg:w-12 lg:h-12 text-black relative z-10"
                      fill="currentColor"
                      strokeWidth={1}
                    />
                    <div
                      className="lx-scan absolute left-0 right-0 h-14 pointer-events-none z-20"
                      style={{
                        background:
                          "linear-gradient(to bottom, transparent, rgba(255,255,255,0.22), transparent)",
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Brand name */}
              <motion.div variants={itemUp} className="mb-3">
                <h1 className="text-[5.5rem] sm:text-[7rem] lg:text-[8.5rem] xl:text-[10rem] font-outfit font-black italic uppercase leading-[0.88] tracking-[-0.05em] text-gold-gradient">
                  LexMind
                </h1>
              </motion.div>

              {/* Tagline */}
              <motion.div variants={itemUp} className="mb-10">
                <h2 className="text-[1.6rem] sm:text-[2rem] lg:text-[2.4rem] font-outfit font-black italic uppercase leading-none tracking-[-0.02em]">
                  <span className="block text-white">Trzy modele AI.</span>
                  <span className="block text-white">Jeden werdykt.</span>
                  <span className="block shimmer-text">Zero halucynacji.</span>
                </h2>
              </motion.div>

              {/* Description */}
              <motion.p
                variants={itemUp}
                className="text-[15px] leading-[1.75] text-white/65 max-w-[560px] mb-10"
              >
                System <span className="text-white font-semibold">RAG</span>{" "}
                przeszukuje{" "}
                <span className="text-white font-semibold">
                  16 polskich kodeksów i ustaw
                </span>
                , pobierając wyłącznie zweryfikowane cytaty prawa. Pytanie
                trafia równolegle do{" "}
                <span className="text-white font-semibold">
                  Claude&nbsp;3.7,&nbsp;GPT-4o i Gemini&nbsp;2.5&nbsp;Flash
                </span>{" "}
                — agregator syntetyzuje konsensus wolny od błędów.
              </motion.p>

              {/* Feature grid 2×2 */}
              <motion.div
                variants={itemUp}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10"
              >
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="relative group rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      background: f.accent,
                      border: `1px solid ${f.border}`,
                    }}
                  >
                    {/* Top row: icon + badge */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: f.iconBg, color: f.iconColor }}
                      >
                        {f.icon}
                      </div>
                      <span
                        className="text-[8px] font-black uppercase tracking-[0.22em] leading-tight"
                        style={{ color: f.badgeColor }}
                      >
                        {f.badge}
                      </span>
                    </div>
                    {/* Title */}
                    <p className="text-[13px] font-black uppercase tracking-[0.08em] text-white mb-1.5 leading-tight">
                      {f.title}
                    </p>
                    {/* Desc */}
                    <p className="text-[11.5px] text-white/60 leading-relaxed font-medium">
                      {f.desc}
                    </p>
                    {/* Corner glow */}
                    <div
                      className="absolute top-0 right-0 w-24 h-24 -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(ellipse, ${f.badgeColor}20 0%, transparent 70%)`,
                      }}
                    />
                  </div>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div
                variants={itemUp}
                className="flex flex-wrap items-center gap-3 mb-10"
              >
                <motion.button
                  onClick={startTrial}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 0 70px rgba(255,215,128,0.45)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative flex items-center gap-3 bg-gold-primary text-black font-black uppercase text-[10px] tracking-[0.3em] px-8 py-[18px] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,215,128,0.3)]"
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
                    }}
                  />
                  <Star size={14} className="shrink-0" />
                  Wypróbuj RAG bezpłatnie
                  <ArrowRight
                    size={13}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </motion.button>

                <motion.button
                  onClick={() => {
                    setIsSignUp(false);
                    setMessage(null);
                  }}
                  whileHover={{
                    scale: 1.02,
                    borderColor: "rgba(255,255,255,0.35)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-8 py-[18px] rounded-2xl border border-white/18 text-[10px] font-black uppercase tracking-[0.3em] text-white/65 hover:text-white transition-all"
                >
                  Zaloguj się
                </motion.button>

                <p className="w-full text-[9px] font-bold uppercase tracking-[0.25em] text-white/30 mt-1">
                  7 dni bezpłatnie · bez karty kredytowej
                </p>
              </motion.div>

              {/* Stats */}
              <motion.div
                variants={itemUp}
                className="flex flex-wrap gap-x-8 gap-y-4"
              >
                {STATS.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <div className="group">
                      <p className="text-[2rem] font-outfit font-black text-gold-gradient leading-none mb-0.5">
                        {s.value}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">
                        {s.label}
                      </p>
                    </div>
                    {i < STATS.length - 1 && (
                      <div className="w-px self-stretch bg-white/8 hidden sm:block" />
                    )}
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* Vertical divider */}
          <div
            className="hidden lg:block shrink-0 w-px my-16 self-stretch"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(255,215,128,0.2) 25%, rgba(255,215,128,0.28) 50%, rgba(255,215,128,0.2) 75%, transparent 100%)",
            }}
          />

          {/* ──────────────────────────────────────
              AUTH PANEL — RIGHT
          ────────────────────────────────────── */}
          <motion.aside
            variants={slideIn}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full lg:w-[480px] xl:w-[520px] flex items-center justify-center px-6 sm:px-10 lg:px-10 pb-16 lg:py-20"
          >
            <div className="w-full max-w-[420px]">
              {/* Card */}
              <div
                className="relative rounded-4xl overflow-hidden lx-panel glass-prestige"
              >
                {/* Decorative glows inside card */}
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
                  {/* Free trial banner */}
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
                            7 dni bezpłatnie · pełen dostęp do RAG
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Header */}
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
                            ? "Rozpocznij bezpłatny okres próbny"
                            : "Zaloguj się do kancelarii AI"}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Form */}
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
                        placeholder="HASŁO"
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
                            : "WEJDŹ DO KANCELARII"}
                          <ArrowRight
                            size={14}
                            className="group-hover:translate-x-1 transition-transform"
                          />
                        </>
                      )}
                    </motion.button>
                  </form>

                  {/* Toggle */}
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
                        ? "MASZ JUŻ KONTO? ZALOGUJ SIĘ"
                        : "NIE MASZ KONTA? WYPRÓBUJ BEZPŁATNIE →"}
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t border-white/8 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        size={10}
                        className="text-gold-primary animate-pulse"
                      />
                      <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/25">
                        Enterprise Protection v3.1
                      </span>
                    </div>
                    <p className="text-[7.5px] text-white/20 font-bold uppercase tracking-widest text-center max-w-[260px] leading-relaxed">
                      Korzystając z systemu akceptujesz politykę prywatności i
                      regulamin LexMind AI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-5 flex items-center justify-center gap-5"
              >
                {[
                  { icon: <ShieldCheck size={11} />, label: "RODO" },
                  { icon: <FileSearch size={11} />, label: "RAG Verified" },
                  { icon: <Star size={11} />, label: "7 dni free" },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-[7.5px] font-black uppercase tracking-[0.22em] text-white/20"
                  >
                    <span className="text-gold-primary/35">{b.icon}</span>
                    {b.label}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.aside>
        </div>

        {/* ══════ TICKER ══════ */}
        <Ticker />
      </div>
    </>
  );
}
