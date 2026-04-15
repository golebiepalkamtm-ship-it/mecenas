import { motion } from 'framer-motion';
import { Mail, CheckCircle2, Sparkles, Shield } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import type { SettingsViewProps } from '../types';
import { SettingsInput } from './SettingsInput';

export function ProfileSection({ user, profile, onUpdateProfile, isSaving, successMsg }: Pick<SettingsViewProps, 'user' | 'profile' | 'onUpdateProfile' | 'isSaving' | 'successMsg'>) {
  return (
    <motion.section 
      key="profil"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="glass-prestige rounded-2xl p-5 space-y-4 shadow-2xl"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl glass-prestige-gold flex items-center justify-center text-2xl font-black text-gold-primary shadow-[0_10px_30px_rgba(212,175,55,0.25)] overflow-hidden relative group">
          {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white italic tracking-tight truncate">{profile?.full_name || 'Użytkownik LexMind'}</h2>
          <p className="text-gold-300/60 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5 truncate">
            <Mail size={10} className="text-gold-primary flex-shrink-0" /> {user?.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SettingsInput 
          label="Pełne Imię i Nazwisko" 
          defaultValue={profile?.full_name || ''} 
          placeholder="Wpisz dane..."
          onBlur={(val) => onUpdateProfile({ full_name: val })}
        />
        <SettingsInput 
          label="ID Użytkownika" 
          defaultValue={user?.id?.substring(0, 12) + "..."} 
          disabled 
        />
      </div>

      <div className="flex items-center justify-between">
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
          >
            <CheckCircle2 size={12} /> {successMsg}
          </motion.div>
        )}
        <div className="flex-1" />
        <button
          className="px-5 py-2 bg-gold-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-[0_8px_20px_rgba(255,215,128,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz Profil'}
        </button>
      </div>

      {/* Subskrypcja */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-black text-white italic tracking-tight uppercase text-gold-gradient">Subskrypcja</h2>
        <span className="px-2 py-0.5 rounded-full bg-gold-primary/10 text-gold-primary border border-gold-primary/30 text-[8px] font-black uppercase tracking-widest">
          {profile?.subscription_tier || 'Free'}
        </span>
      </div>

      <div className="p-4 rounded-xl glass-prestige-gold relative overflow-hidden group">
        <Sparkles size={80} className="absolute -right-6 -bottom-6 text-gold-primary/10 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
        <p className="text-gold-primary font-black text-sm uppercase tracking-[0.2em] italic">Twój pakiet: LexMind Trial</p>
        <div className="mt-3 space-y-2">
          <p className="text-white/80 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-gold-primary shadow-[0_0_6px_#FFD780]" /> 10 kredytów na start
          </p>
          <p className="text-white/80 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-gold-primary shadow-[0_0_6px_#FFD780]" /> Dostęp do Gemini 2.0 Flash
          </p>
          <p className="text-white/80 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-gold-primary shadow-[0_0_6px_#FFD780]" /> Podstawowa analiza prawna
          </p>
        </div>
        <button className="mt-4 px-6 py-2.5 bg-white text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-2xl border-t-2 border-white/80">
          Uaktualnij do Pro
        </button>
      </div>

      {/* Bezpieczeństwo */}
      <div className="pt-1">
        <h3 className="text-[10px] font-black text-white italic tracking-tight uppercase text-gold-gradient flex items-center gap-2 mb-2">
          <Shield size={12} className="text-gold-primary" />
          Bezpieczeństwo
        </h3>
        <div className="space-y-1.5">
          <div className="p-3 rounded-xl glass-prestige flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Zmiana Hasła</p>
              <p className="text-[8px] text-white/30 font-bold uppercase mt-0.5 truncate">Link do resetowania na e-mail</p>
            </div>
            <button
              onClick={() => supabase.auth.resetPasswordForEmail(user?.email || '')}
              className="px-3 py-1.5 bg-white/10 hover:bg-gold-primary hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex-shrink-0"
            >
              Wyślij Link
            </button>
          </div>
          <div className="p-3 rounded-xl glass-prestige flex items-center justify-between opacity-50 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Dwuetapowa Weryfikacja</p>
              <p className="text-[8px] text-white/30 font-bold uppercase mt-0.5 truncate">Zwiększ bezpieczeństwo konta</p>
            </div>
            <span className="text-[7px] font-black uppercase text-gold-primary flex-shrink-0">Wkrótce</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
