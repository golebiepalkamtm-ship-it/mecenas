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
  ChevronLeft
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import NeuralFlow from "../Landing/NeuralFlow";

export function AuthView({ onBack }: { onBack: () => void }) {
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
          password
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#121212]">
      {/* ─── NEURAL FLOW BACKGROUND ─── */}
      <div className="absolute inset-0 z-0 opacity-40">
        <NeuralFlow />
      </div>

      <div className="absolute inset-0 bg-radial-at-c from-transparent to-[#121212]/80 z-1" />

      {/* ─── MAIN UI CONTAINER ─── */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-screen px-4">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="absolute top-12 left-12 flex items-center gap-3 px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
        >
          <ChevronLeft size={16} className="text-white group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Powrót</span>
        </motion.button>

        {/* Floating Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="relative overflow-hidden rounded-[3rem] border border-white/20 glass-prestige p-10 lg:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-12">
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-8 shadow-inner">
                <ShieldCheck size={28} className="text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-inter font-semibold tracking-tight text-white mb-3">
                {isSignUp ? "Nowy Operator" : "Panel Autoryzacji"}
              </h2>
              <p className="text-[9px] font-black uppercase tracking-[0.6em] text-white/30 italic">
                Restricted Access · LexMind v4
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="email"
                    placeholder="E-MAIL OPERATORA"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-xs font-bold tracking-[0.2em] text-white focus:outline-none focus:border-white/40 transition-all uppercase"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="KLUCZ DOSTĘPU"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-16 text-xs font-bold tracking-[0.2em] text-white focus:outline-none focus:border-white/40 transition-all uppercase"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white p-2"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`text-[10px] font-bold uppercase tracking-widest text-center p-4 rounded-xl border ${
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-5 bg-white text-white font-black uppercase tracking-[0.5em] text-[11px] rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-slate-100"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>{isSignUp ? "Poproś o dostęp" : "Autoryzuj sesję"}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="text-center pt-8 mt-8 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-colors"
              >
                {isSignUp ? "Masz już klucz? Zaloguj się" : "Nie masz dostępu? Wyślij prośbę"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
