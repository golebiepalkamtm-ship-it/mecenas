import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Styles are now handled by global CSS utilities in index.css:
// .glass-prestige, .glass-prestige-embossed, .glass-prestige-input, .glass-prestige-button-gold


/* ── Floating input field ── */
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
      {/* Input shell */}
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-300 glass-prestige-input ${
          focused ? "ring-1 ring-gold/40 border-t-gold/80" : ""
        }`}
      >
        {/* Top reflection line */}
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

        {/* Left icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <Icon
            size={16}
            style={{
              color: focused
                ? "rgba(212,175,55,0.85)"
                : "rgba(255,255,255,0.28)",
              transition: "color 0.3s",
            }}
          />
        </div>

        {/* Input */}
        <input
          id={id}
          type={isPassword && !showPass ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={label}
          className="w-full bg-transparent pl-11 pr-11 py-4 text-[13px] font-medium outline-none"
          style={{ color: "rgba(240,244,255,0.9)" }}
        />

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-colors"
            style={{
              color: focused ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.2)",
            }}
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main LoginPortal ── */
const LoginPortal = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd autoryzacji");
      setLoading(false);
    }
  };

  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="relative flex items-center justify-center w-full max-w-[420px]">
      {/* Ambient glow under card */}
      <div
        className="absolute -inset-16 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -inset-8 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 65%)",
        }}
      />

      <motion.div
        className="relative w-full"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.3, ease: E }}
      >
        <div
          ref={cardRef}
          className="relative rounded-[2.5rem] overflow-hidden glass-prestige"
        >
          {/* ── Specular top edge ── */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-30"
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 20%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.55) 80%, transparent 100%)",
            }}
          />

          {/* ── Upper reflection layer ── */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-20 rounded-t-[2.5rem]"
            style={{
              height: "45%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 50%, rgba(255,255,255,0) 100%)",
            }}
          />

          {/* ── Prism edge ── */}
          <div
            className="absolute inset-0 pointer-events-none z-10 rounded-[2.5rem]"
            style={{
              background:
                "linear-gradient(135deg, rgba(180,220,255,0.1) 0%, rgba(160,240,200,0.03) 30%, transparent 55%, rgba(255,200,120,0.03) 75%, rgba(255,160,100,0.08) 100%)",
              mixBlendMode: "screen",
            }}
          />

          {/* ── Content ── */}
          <div className="relative z-20 p-10">
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.7,
                  type: "spring",
                  stiffness: 220,
                  damping: 18,
                }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 glass-prestige-embossed shadow-gold/10"
              >
                <Shield
                  size={26}
                  style={{ color: "#d4af37", strokeWidth: 1.5 }}
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.5, ease: E }}
                className="text-[18px] font-black uppercase italic tracking-tight text-white/90 leading-none"
              >
                Panel Autoryzacji
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="flex items-center justify-center gap-3 mt-4"
              >
                <div
                  style={{
                    height: "1px",
                    width: 36,
                    background:
                      "linear-gradient(90deg, transparent, rgba(212,175,55,0.55))",
                  }}
                />
                <span
                  className="text-[8px] font-black uppercase tracking-[0.55em] italic"
                  style={{ color: "rgba(212,175,55,0.75)" }}
                >
                  Restricted Access
                </span>
                <div
                  style={{
                    height: "1px",
                    width: 36,
                    background:
                      "linear-gradient(90deg, rgba(212,175,55,0.55), transparent)",
                  }}
                />
              </motion.div>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4" autoComplete="off">
              <GlassInput
                id="email"
                label="E-mail operatora"
                type="email"
                icon={Mail}
                delay={0.95}
                value={email}
                onChange={setEmail}
              />
              <GlassInput
                id="password"
                label="Klucz dostępu"
                type="password"
                icon={Lock}
                delay={1.08}
                value={password}
                onChange={setPassword}
              />

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-xl px-4 py-3 overflow-hidden"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      borderTop: "1px solid rgba(239,68,68,0.45)",
                      borderLeft: "1px solid rgba(239,68,68,0.15)",
                      borderRight: "1px solid rgba(239,68,68,0.05)",
                      borderBottom: "1px solid rgba(0,0,0,0.4)",
                      boxShadow: "inset 0 1px 0 rgba(239,68,68,0.3)",
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider text-center"
                      style={{ color: "rgba(239,68,68,0.9)" }}
                    >
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.22, duration: 0.5, ease: E }}
                className="pt-2"
              >
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { scale: 1.015, y: -1 }}
                  whileTap={loading ? {} : { scale: 0.985, y: 1 }}
                  className="w-full h-14 rounded-2xl relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group glass-prestige-button-gold"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                        style={{ color: "#d4af37" }}
                      />
                    ) : (
                      <>
                        <span
                          className="text-[11px] font-black uppercase tracking-[0.5em]"
                          style={{ color: "rgba(212,175,55,0.95)" }}
                        >
                          Autoryzuj sesję
                        </span>
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                          style={{ color: "rgba(212,175,55,0.8)" }}
                        />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </form>

            <div className="text-center pt-6">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[12px] font-black uppercase tracking-[0.5em] text-white/30 hover:text-[#d4af37] transition-colors py-2"
              >
                {isSignUp
                  ? "ALREADY ENROLLED? SIGN IN"
                  : "NO ACCESS KEY? REQUEST ENTRY"}
              </button>
            </div>

            {/* Security footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.45 }}
              className="mt-8 flex flex-col items-center gap-3"
            >
              {/* Separator */}
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)",
                }}
              />

              <div
                className="flex items-center gap-2.5 px-4 py-2 rounded-full glass-prestige-embossed shadow-gold/5"
              >
                <p
                  className="text-[8px] font-black uppercase tracking-[0.35em]"
                  style={{ color: "rgba(212,175,55,0.7)" }}
                >
                  Encrypted · AES-256 · TLS 1.3
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPortal;
