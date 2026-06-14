import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Shield } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import NeuralNetwork from "./NeuralNetwork";
import "./portal-page.css";

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
  </svg>
);

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

function GlassInput({
  id,
  label,
  type = "text",
  icon: Icon,
  delay = 0,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  icon: React.ElementType;
  delay?: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: E }}
      className="relative group"
    >
      <div
        className={`portal-login-field relative overflow-hidden transition-all duration-300 glass-prestige-input ${
          focused ? "ring-1 ring-gold-primary/40 border-t-gold-primary/80" : ""
        }`}
      >
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: "1px",
            background: focused
              ? "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.7) 40%, rgba(212,175,55,0.9) 60%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 40%, rgba(255,255,255,0.6) 60%, transparent 100%)",
            transition: "background 0.3s",
          }}
        />

        <div className="portal-login-field-icon absolute top-1/2 -translate-y-1/2 z-10">
          <Icon
            size={15}
            style={{
              color: focused ? "rgba(212,175,55,0.85)" : "rgba(255,255,255,0.28)",
              transition: "color 0.3s",
            }}
          />
        </div>

        <input
          id={id}
          type={isPassword && !showPass ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={label}
          className="portal-login-input w-full bg-transparent font-medium outline-none"
          style={{ color: "rgba(240,244,255,0.9)" }}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-colors"
            style={{ color: focused ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.2)" }}
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function LoginPortal({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Błąd autoryzacji przez ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError("Podaj adres e-mail");
        return;
      }
      if (!password) {
        setError("Podaj hasło");
        return;
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
      }

      if (!isSignUp) {
        let hasSession = false;
        for (let attempt = 0; attempt < 25; attempt++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            hasSession = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!hasSession) {
          throw new Error("Logowanie nie zostało potwierdzone (brak sesji). Spróbuj ponownie.");
        }
      }

      onLoginSuccess?.();
    } catch (err) {
      if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
        setError("Brak połączenia z serwerem logowania (DNS/Internet). Sprawdź połączenie lub firewall/VPN.");
      } else {
        setError(err instanceof Error ? err.message : "Błąd autoryzacji");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-outer portal-login-wrap relative flex items-center justify-center px-1 sm:px-0">
      <div
        className="portal-login-glow-outer absolute rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.1) 0%, transparent 72%)" }}
      />
      <div
        className="portal-login-glow-inner absolute rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 68%)" }}
      />

      <motion.div
        className="relative w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.3, ease: E }}
      >
        <div ref={cardRef} className="portal-login-card relative overflow-hidden glass-prestige">
          <div className="portal-login-card-highlight absolute top-0 left-0 right-0 pointer-events-none z-30" />
          <div className="portal-login-card-sheen absolute top-0 left-0 right-0 pointer-events-none z-20" />
          <div className="portal-login-card-tint absolute inset-0 pointer-events-none z-10" />

          <div className="portal-login-pad relative z-20">
            <div className="portal-login-hero text-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 220, damping: 18 }}
                className="portal-login-shield inline-flex items-center justify-center rounded-2xl glass-prestige-embossed shadow-gold-primary/10"
              >
                <Shield size={20} style={{ color: "#d4af37", strokeWidth: 1.5 }} />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.5, ease: E }}
                className="portal-login-title font-black uppercase italic tracking-tight text-white/90 leading-none"
              >
                Panel Autoryzacji
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="portal-login-sub flex items-center justify-center gap-3 mt-4"
              >
                <div className="sub-line" style={{ height: "1px", width: 36, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.55))" }} />
                <span className="portal-login-sub-label font-black uppercase italic">Restricted Access</span>
                <div className="sub-line" style={{ height: "1px", width: 36, background: "linear-gradient(90deg, rgba(212,175,55,0.55), transparent)" }} />
              </motion.div>
            </div>

            <form onSubmit={handleAuth} className="portal-login-form" autoComplete="off">
              <GlassInput id="email" label="E-mail operatora" type="email" icon={Mail} delay={0.95} value={email} onChange={setEmail} />
              <GlassInput id="password" label="Klucz dostępu" type="password" icon={Lock} delay={1.08} value={password} onChange={setPassword} />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="portal-login-error overflow-hidden text-center font-bold uppercase"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      borderTop: "1px solid rgba(239,68,68,0.45)",
                      borderLeft: "1px solid rgba(239,68,68,0.15)",
                      borderRight: "1px solid rgba(239,68,68,0.05)",
                      borderBottom: "1px solid rgba(0,0,0,0.4)",
                      boxShadow: "inset 0 1px 0 rgba(239,68,68,0.3)",
                      color: "rgba(239,68,68,0.9)",
                    }}
                  >
                    <p>
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.22, duration: 0.5, ease: E }}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { scale: 1.01 }}
                  whileTap={loading ? {} : { scale: 0.99 }}
                  className="portal-login-submit w-full relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group glass-prestige-button-primary"
                  style={{
                    borderColor: "rgba(212,175,55,0.28)",
                    background:
                      "linear-gradient(180deg, rgba(212,175,55,0.10) 0%, rgba(255,255,255,0.06) 35%, rgba(0,0,0,0.35) 100%)",
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" style={{ color: "#d4af37" }} />
                    ) : (
                      <>
                        <span className="portal-login-submit-label font-black uppercase">Autoryzuj sesję</span>
                        <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" style={{ color: "rgba(212,175,55,0.8)" }} />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </form>

            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/10" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12))" }} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 italic shrink-0">LUB AUTORYZUJ PRZEZ</span>
              <div className="flex-1 h-px bg-white/10" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)" }} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1 pointer-events-auto">
              <motion.button
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSocialLogin("google")}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)"
                }}
              >
                <GoogleIcon />
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">Google</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleSocialLogin("facebook")}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)"
                }}
              >
                <FacebookIcon />
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">Facebook</span>
              </motion.button>
            </div>

            <div className="portal-login-toggle text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="portal-login-toggle-btn font-black uppercase text-white/30 hover:text-gold-primary transition-colors"
              >
                {isSignUp ? "ALREADY ENROLLED? SIGN IN" : "NO ACCESS KEY? REQUEST ENTRY"}
              </button>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.45 }} className="portal-login-extras flex flex-col items-center gap-3">
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)",
                }}
              />

              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full glass-prestige-embossed shadow-gold-primary/5">
                <p className="portal-login-extras-badge font-black uppercase">Encrypted · AES-256 · TLS 1.3</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function PortalView({ onBack, onLoginSuccess }: { onBack?: () => void; onLoginSuccess?: () => void }) {
  useEffect(() => {
    document.documentElement.classList.add("portal-active");
    return () => document.documentElement.classList.remove("portal-active");
  }, []);

  return (
    <div
      className="portal-scroll-root portal-page fixed inset-0 z-50"
      style={{ background: "linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-sea) 55%, var(--bg-blue) 100%)" }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="aurora-bg opacity-20" />
        <div className="noise-overlay opacity-4" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)",
            backgroundSize: "100px 100px",
            maskImage: "radial-gradient(ellipse 68% 58% at 38% 50%, black 0%, transparent 78%)",
          }}
        />

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
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute rounded-full orb orb-gold"
          style={{ width: 340, height: 340, bottom: "20%", left: "10%" }}
        />
      </div>

      <div className="portal-page__neural">
        <NeuralNetwork />
      </div>

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

      {onBack && (
        <motion.button
          type="button"
          onClick={onBack}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: E }}
          className="fixed sm:absolute top-[calc(0.75rem+var(--safe-top))] right-[calc(0.75rem+var(--safe-right))] sm:top-8 sm:right-8 z-120 pointer-events-auto flex items-center gap-2 sm:gap-3 px-4 py-2.5 sm:px-7 sm:py-3.5 rounded-2xl border border-gold-primary/45 bg-black/55 backdrop-blur-md text-white shadow-[0_18px_40px_rgba(0,0,0,0.55)] hover:shadow-[0_18px_50px_rgba(0,0,0,0.65)] hover:border-gold-primary/70 hover:bg-black/65 transition-all"
          style={{
            boxShadow: "0 18px 45px rgba(0,0,0,0.6), 0 0 22px rgba(212,175,55,0.18)",
          }}
        >
          <ArrowLeft size={18} className="text-gold-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]" />
          <span className="text-[11px] font-black uppercase tracking-[0.42em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
            Powrót
          </span>
        </motion.button>
      )}

      {/* 2 osobne elementy: logo w lewym gornym rogu, napis na gorze na srodku */}
      <img
        src="/logo.png"
        alt="LexMind AI"
        onClick={onBack}
        className="fixed left-[-40px] top-[-40px] sm:left-[-80px] sm:top-[-80px] z-110 w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] select-none cursor-pointer object-contain pointer-events-auto"
        style={{
          filter: "drop-shadow(0 0 120px rgba(212,175,55,0.7))",
        }}
      />

      <div className="fixed left-1/2 -translate-x-1/2 top-6 sm:top-12 z-110 text-center pointer-events-none w-max">
        <h1 className="text-4xl sm:text-8xl font-black uppercase italic tracking-tight text-white/95 font-outfit leading-none" style={{ filter: "drop-shadow(0 0 40px rgba(255,255,255,0.25))" }}>
          LexMind <span className="text-gold-primary">AI</span>
        </h1>
        <p className="text-[10px] sm:text-lg font-black uppercase tracking-[0.45em] text-white/45 mt-3 sm:mt-5">
          Intelligent Justice
        </p>
      </div>

      <div className="portal-page__main relative">
        <div className="portal-page__form-wrap">
          <div className="portal-page__gradient" aria-hidden />
          <LoginPortal onLoginSuccess={onLoginSuccess} />
        </div>
      </div>

      <motion.div
        className="portal-page__ticker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 1.0 }}
      >
        <div className="portal-page__ticker-inner flex items-center overflow-hidden">
          <div className="ticker-track flex whitespace-nowrap gap-16 px-8" style={{ animation: "ticker-scroll 32s linear infinite" }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((text, i) => (
              <span key={i} className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#d4af37", boxShadow: "0 0 10px rgba(212,175,55,0.9)" }} />
                <span className="ticker-text text-[10px] font-inter font-black tracking-[0.40em] uppercase text-white/75 italic">{text}</span>
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

