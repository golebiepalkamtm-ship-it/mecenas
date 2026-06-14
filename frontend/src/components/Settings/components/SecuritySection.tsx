import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabaseClient';
import type { SettingsViewProps } from '../types';

export function SecuritySection({ user }: Pick<SettingsViewProps, 'user'>) {
  return (
    <motion.section 
      key="security"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-prestige rounded-2xl p-5 space-y-3 shadow-2xl"
    >
      <h2 className="text-sm font-black text-white italic tracking-tight uppercase text-gold-gradient">Bezpieczeństwo</h2>
      <div className="space-y-2">
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
    </motion.section>
  );
}
