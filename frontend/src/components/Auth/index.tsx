import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { LiquidMetalIcon } from "../UI";

export function AuthView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split("@")[0],
            },
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Wysłano link weryfikacyjny. Sprawdź e-mail.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0c1c2d]">
      {/* ─── PRESTIGE CINEMATIC BACKGROUND ─── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.div
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1.05, opacity: 1 }}
          transition={{ duration: 5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1589216532372-1c2a367900d9?q=80&w=2071&auto=format&fit=crop')",
            filter: "brightness(0.55) contrast(1.25) saturate(1.0) blur(0px)",
          }}
        />

        {/* Luxury Overlays */}
        <div className="absolute inset-0 bg-linear-to-t from-[#0c1c2d] via-transparent to-[#0c1c2d]/60" />
        <div className="absolute inset-0 bg-linear-to-r from-[#0c1c2d]/80 via-transparent to-[#0c1c2d]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(175,142,59,0.35)_0%,transparent_70%)]" />

        {/* Floating Anamorphic Light Leaks */}
        <motion.div
          animate={{
            x: [-400, 400],
            opacity: [0.02, 0.08, 0.02],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 left-0 w-full h-px bg-gold-primary/30 blur-xl"
        />
      </div>

      {/* ─── MAIN UI CONTAINER ─── */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-screen px-4 lg:px-20">
        {/* Subtle Top Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute top-12 flex items-center gap-4 px-6 py-2.5 rounded-full border border-white/5 bg-white/2 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse shadow-[0_0_10px_#af8e3b]" />
          <span className="text-[9px] font-black uppercase tracking-[0.6em] text-white/50 italic">
            LexMind Prestige Intelligence v4.0
          </span>
        </motion.div>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-32">
          {/* LEFT SIDE: PRESTIGE BRANDING */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="hidden lg:flex flex-col justify-center"
          >
            <div className="mb-12 relative">
              <h1 className="text-[130px] xl:text-[180px] font-black italic text-gold-gradient uppercase tracking-[-0.08em] leading-[0.65] select-none drop-shadow-[0_40px_120px_rgba(175,142,59,0.5)]">
                LEX
                <br />
                MIND
                <br />
                AI
              </h1>
              <div className="mt-12 h-px w-48 bg-linear-to-r from-gold-primary/60 to-transparent" />
            </div>
            <p className="text-white/40 font-bold uppercase tracking-[0.5em] text-[13px] mb-16 leading-relaxed max-w-[420px] italic">
              The evolution of professional legal intelligence. <br />
              Exclusively crafted for leaders.
            </p>

            <div className="grid grid-cols-2 gap-12 max-w-md">
              <div className="space-y-3 group cursor-default">
                <p className="text-[28px] font-black text-white italic tracking-tighter transition-colors group-hover:text-gold-primary">
                  PRESTIGE
                </p>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">
                  Neural Design Core
                </p>
                <div className="w-10 h-[2px] bg-gold-primary/40 group-hover:w-full transition-all duration-700" />
              </div>
              <div className="space-y-3 group cursor-default">
                <p className="text-[28px] font-black text-white italic tracking-tighter transition-colors group-hover:text-gold-primary">
                  QUANTUM
                </p>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">
                  Legal Precision
                </p>
                <div className="w-10 h-[2px] bg-gold-primary/40 group-hover:w-full transition-all duration-700" />
              </div>
            </div>
          </motion.div>

          {/* RIGHT SIDE: AUTHENTICATION INTERFACE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[560px] ml-auto"
          >
            <div className="relative group">
              {/* Outer Luxury Glow */}
              <div className="absolute -inset-4 bg-linear-to-tr from-gold-primary/20 via-transparent to-blue-500/10 rounded-[4.5rem] blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

              {/* The Prestige Card */}
              <div className="relative overflow-hidden rounded-[4rem] border border-white/40 bg-[#0f2236]/95 backdrop-blur-xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] p-12 lg:p-20 group/glass transition-all duration-700 hover:border-gold-primary/60">
                {/* Moving highlight inside card */}
                <div className="absolute -top-20 -right-20 pointer-events-none opacity-40">
                  <LiquidMetalIcon size={250} color="#ffffff" speed={0.4} distortion={1.5} scale={0.002} />
                </div>
                <div className="absolute -bottom-24 -left-24 pointer-events-none opacity-30 rotate-45">
                  <LiquidMetalIcon size={300} color="#00fedc" speed={0.3} distortion={1.2} scale={0.0015} />
                </div>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-16">
                  <div className="lg:hidden mb-12">
                    <div className="w-40 h-40 flex items-center justify-center relative translate-y-4">
                      {/* Aura behind icon */}
                      <div className="absolute inset-0 bg-gold-primary/20 blur-[60px] rounded-full animate-pulse" />
                      <LiquidMetalIcon 
                        size={160} 
                        color="#d4af37" 
                        speed={0.8}
                        distortion={2.0}
                        scale={0.004}
                      />
                    </div>
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mb-6 italic">
                    {isSignUp ? "Enrollment" : "Credential Check"}
                  </h2>
                  <div className="flex items-center gap-6">
                    <div className="h-px w-12 bg-gold-primary/40" />
                    <p className="text-[11px] font-black uppercase tracking-[0.8em] text-gold-primary/70 italic">
                      Restricted Access
                    </p>
                    <div className="h-px w-12 bg-gold-primary/40" />
                  </div>
                </div>

                {/* Auth Form */}
                <form
                  onSubmit={handleAuth}
                  className="space-y-8"
                  autoComplete="off"
                >
                  <div className="space-y-6">
                    {/* Identity Field */}
                    <div className="relative group/input">
                      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-gold-primary transition-colors duration-300">
                        <Mail size={24} strokeWidth={1.2} />
                      </div>
                      <input
                        type="email"
                        placeholder="OPERATOR E-MAIL"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/3 border border-white/10 rounded-[2.2rem] py-8 pl-20 pr-8 text-[14px] font-bold tracking-[0.25em] text-white focus:outline-none focus:border-gold-primary/50 focus:bg-white/8 transition-all placeholder:text-white/10 uppercase shadow-inner"
                        required
                      />
                    </div>

                    {/* Keycode Field */}
                    <div className="relative group/input">
                      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-gold-primary transition-colors duration-300">
                        <Lock size={24} strokeWidth={1.2} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="SECURITY KEY"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/3 border border-white/10 rounded-[2.2rem] py-8 pl-20 pr-20 text-[14px] font-bold tracking-[0.25em] text-white focus:outline-none focus:border-gold-primary/50 focus:bg-white/8 transition-all placeholder:text-white/10 uppercase shadow-inner"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors p-2"
                      >
                        {showPassword ? (
                          <EyeOff size={24} />
                        ) : (
                          <Eye size={24} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Status Feedback */}
                  <AnimatePresence mode="wait">
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`text-[12px] font-black uppercase tracking-[0.2em] text-center py-6 rounded-3xl border backdrop-blur-md ${
                          message.type === "error"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{
                      scale: 1.02,
                      translateY: -10,
                      boxShadow: "0 60px 120px -15px rgba(175, 142, 59, 0.6)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative overflow-hidden bg-linear-to-r from-[#af8e3b] via-[#f0c27b] to-[#8e6e3c] text-black font-black uppercase text-[14px] tracking-[0.8em] py-10 rounded-[3rem] shadow-[0_40px_80px_-10px_rgba(175, 142, 59, 0.4)] group/btn transition-all duration-700"
                  >
                    <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1200 ease-in-out" />
                    <div className="relative flex items-center justify-center gap-6">
                      {loading ? (
                        <Loader2 size={28} className="animate-spin" />
                      ) : (
                        <>
                          <span>
                            {isSignUp
                              ? "GENERATE ACCESS"
                              : "INITIALIZE SESSION"}
                          </span>
                          <ArrowRight
                            size={22}
                            className="group-hover/btn:translate-x-4 transition-transform"
                          />
                        </>
                      )}
                    </div>
                  </motion.button>

                  {/* Mode Toggle */}
                  <div className="text-center pt-6">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-[12px] font-black uppercase tracking-[0.5em] text-white/30 hover:text-gold-primary transition-colors py-2"
                    >
                      {isSignUp
                        ? "ALREADY ENROLLED? SIGN IN"
                        : "NO ACCESS KEY? REQUEST ENTRY"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Status Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.8, duration: 1.5 }}
          className="absolute bottom-12 flex items-center gap-16"
        >
          <div className="flex items-center gap-4">
            <ShieldCheck size={20} className="text-gold-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white">
              Quantum Encryption Enabled
            </span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-4">
            <Cpu size={20} className="text-gold-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white">
              Neural Engine Active
            </span>
          </div>
        </motion.div>
      </div>

      {/* Global Artistic Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none noise-overlay mix-blend-overlay" />
    </div>
  );
}
