import { useState } from 'react';
import { Crown, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile } from '../types';
import { SettingsPrimaryButton } from './SettingsShared';

const VIP_PERKS = [
  'Priorytetowy dostęp do modeli',
  'Gemini 2.0 Flash bez limitów czasu',
  'Analiza prawna z pełnym kontekstem',
  'Wsparcie concierge 24/7 (wkrótce)',
] as const;

interface SubscriptionCardProps {
  profile: Profile | null;
}

export function SubscriptionCard({ profile }: SubscriptionCardProps) {
  const tier = profile?.subscription_tier || 'Trial';
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="lex-view-pass h-full p-5 sm:p-6 flex flex-col gap-4 relative z-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="library-view-ornament font-outfit text-white/40 flex items-center gap-2">
            <Crown size={10} className="text-gold-primary" />
            Membership
          </p>
          <p className="text-2xl sm:text-[1.65rem] font-semibold italic font-profile-display text-gold-gradient mt-1.5 leading-none">
            LexMind VIP
          </p>
          <p className="text-[12px] text-white/35 mt-1">Ekskluzywny dostęp do ekosystemu prawnego AI</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Tier</p>
          <p className="text-lg font-black text-gold-primary italic font-outfit mt-0.5">{tier}</p>
        </div>
      </div>

      <div className="h-px bg-linear-to-r from-transparent via-gold-primary/30 to-transparent" />

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {VIP_PERKS.map((perk) => (
          <li
            key={perk}
            className="flex items-center gap-2.5 text-[12px] font-medium text-white/70 px-3 py-2 rounded-lg bg-white/3 border border-white/5"
          >
            <span className="w-5 h-5 rounded-md bg-gold-primary/15 border border-gold-primary/25 flex items-center justify-center shrink-0">
              <Check size={11} className="text-gold-primary" strokeWidth={2.5} />
            </span>
            {perk}
          </li>
        ))}
      </ul>

      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SettingsPrimaryButton variant="vip" className="w-full">
          <Sparkles size={15} />
          Uaktualnij do Platinum VIP
        </SettingsPrimaryButton>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 bg-white border border-gold-primary/30 rounded-2xl shadow-[0_15px_30px_rgba(212,175,55,0.2)] text-left z-9999 pointer-events-none"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-gold-primary mb-1 text-center">
                Odblokuj Ekosystem
              </p>
              <p className="text-[8px] leading-relaxed text-black/70 font-bold uppercase tracking-wider mb-1 text-center">
                Dostęp do najszybszych modeli (np. Gemini 2.0 Pro) oraz asysta człowieka na życzenie w najtrudniejszych sprawach.
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2.5 h-2.5 bg-white border-r border-b border-gold-primary/30 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
