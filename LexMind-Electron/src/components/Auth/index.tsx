
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Mail, Lock, Sparkles, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export function AuthView() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

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
                            full_name: email.split('@')[0],
                        }
                    }
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Sprawdź e-mail, aby potwierdzić rejestrację!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            }
        } catch (error) {
            const err = error as Error;
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-(--bg-top)">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full h-full sm:h-auto sm:max-w-md glass-prestige bg-(--bg-top) sm:rounded-4xl p-8 lg:p-12 border-gold-gradient shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_100px_rgba(255,215,128,0.2)] relative overflow-hidden flex flex-col justify-center sm:block transform-gpu"
            >
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex flex-col items-center text-center mb-10 xs:mb-12">
                    <div className="relative group mb-8">
                        <div className="w-16 h-16 xs:w-20 xs:h-20 rounded-2xl xs:rounded-3xl bg-gold-primary flex items-center justify-center shadow-gold animate-pulse-slow">
                            <Scale className="text-black w-8 h-8 xs:w-10 xs:h-10" fill="currentColor" strokeWidth={1.5} />
                        </div>
                        <div className="absolute inset-0 rounded-2xl xs:rounded-3xl border border-white/40 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-black italic text-gold-gradient uppercase tracking-[-0.05em] leading-none mb-3">
                        {isSignUp ? 'Rejestracja' : 'Logowanie'}
                    </h2>
                    <p className="text-[9px] xs:text-[10px] font-black uppercase tracking-[0.4em] text-gold-muted/80 opacity-60 italic">
                        LexMind Enterprise AI Core
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6 relative z-10" autoComplete="off">
                    <div className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-primary transition-colors" size={18} />
                            <input 
                                type="email"
                                name="user_email_identity"
                                placeholder="E-MAIL"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-gold-muted/30 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold tracking-widest text-(--text-primary) focus:outline-hidden focus:border-gold-primary transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_4px_6px_-1px_rgba(0,0,0,0.2)]"
                                required
                                autoComplete="email-no-fill"
                                data-lpignore="true"
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-primary transition-colors" size={18} />
                            <input 
                                type={showPassword ? 'text' : 'password'}
                                name="user_password_field"
                                placeholder="HASŁO"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-gold-muted/30 rounded-2xl py-4 pl-12 pr-12 text-xs font-bold tracking-widest text-(--text-primary) focus:outline-hidden focus:border-gold-primary transition-all placeholder:text-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_4px_6px_-1px_rgba(0,0,0,0.2)]"
                                required
                                autoComplete="new-password"
                                data-lpignore="true"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gold-primary transition-colors p-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {message && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`text-[10px] font-black uppercase tracking-widest text-center py-2 px-4 rounded-xl border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}
                            >
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gold-primary text-black font-black uppercase text-[10px] tracking-[0.3em] py-5 rounded-2xl shadow-[0_10px_30px_-5px_rgba(255,215,128,0.4),0_5px_15px_-3px_rgba(255,215,128,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                {isSignUp ? 'STWÓRZ KONTO' : 'WEJDŹ DO KANCELARII'}
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="text-center pt-4">
                        <button 
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-gold-primary transition-colors"
                        >
                            {isSignUp ? 'MASZ JUŻ KONTO? ZALOGUJ SIĘ' : 'NIE MASZ KONTA? ZAREJESTRUJ SIĘ'}
                        </button>
                    </div>
                </form>

                <div className="mt-12 xs:mt-16 pt-8 border-t border-gold-primary/10 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Sparkles size={14} className="text-gold-primary animate-pulse" />
                        <span className="text-[9px] xs:text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Enterprise Protection v3.1</span>
                    </div>
                    <p className="text-[7.5px] xs:text-[8px] text-slate-600 font-bold uppercase tracking-widest opacity-40 text-center max-w-[280px] leading-relaxed">
                        Korzystając z systemu akceptujesz politykę prywatności i regulamin kancelarii LexMind AI.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
