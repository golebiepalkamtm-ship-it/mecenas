import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, RotateCcw } from 'lucide-react';

import { useTrialRoomStore } from '../../store/useTrialRoomStore';
import { TRIAL_STEPS } from './types';
import { cn } from '../../utils/cn';

function stepUnlocked(
  target: (typeof TRIAL_STEPS)[number]['id'],
  step: string,
  defenseBrief: string,
  prosecutionBrief: string,
): boolean {
  const order = TRIAL_STEPS.map((s) => s.id);
  const cur = order.indexOf(step as (typeof order)[number]);
  const tgt = order.indexOf(target);
  if (tgt <= cur) return true;
  if (target === 'defense') return true;
  if (target === 'prosecution') return defenseBrief.trim().length > 0;
  if (target === 'hearing' || target === 'verdict') {
    return defenseBrief.trim().length > 0 && prosecutionBrief.trim().length > 0;
  }
  return false;
}

export function TrialRoomStepper() {
  const { step, defenseBrief, prosecutionBrief, verdict, setStep } = useTrialRoomStore();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const stepIndex = step === 'done' ? TRIAL_STEPS.length : TRIAL_STEPS.findIndex((s) => s.id === step);

  const handleReset = () => {
    // We dispatch a custom event so that TrialRoomPanel can catch it and clear its local drafts
    window.dispatchEvent(new Event('trial-room-reset'));
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={handleReset}
          onMouseEnter={() => setHoveredAction('reset')}
          onMouseLeave={() => setHoveredAction(null)}
          className="p-2 rounded-xl glass-prestige text-white/70 hover:text-white shrink-0 flex items-center justify-center transition-colors border border-white/10 hover:bg-white/10"
          aria-label="Nowa sprawa"
        >
          <RotateCcw size={14} />
        </button>
        <AnimatePresence>
          {hoveredAction === 'reset' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              className="absolute top-full left-0 mt-3 w-48 p-3 glass-prestige-embossed rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] text-left z-[9999] pointer-events-none"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-gold-primary mb-1">
                Nowa Sprawa
              </p>
              <p className="text-[8px] leading-relaxed text-white/60 font-bold uppercase tracking-wider">
                Resetuje obecną salę rozpraw i czyści cały dotychczasowy postęp.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5 ml-2">
        {TRIAL_STEPS.map((s, i) => {
          const unlocked = stepUnlocked(s.id, step, defenseBrief, prosecutionBrief);
          const done = i < stepIndex || (s.id === 'verdict' && !!verdict);
          const current = s.id === step;
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => setStep(s.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300',
                  current
                    ? 'glass-prestige-gold text-gold-primary shadow-[0_0_15px_rgba(234,179,8,0.3)] ring-1 ring-gold-primary/30'
                    : done
                    ? 'glass-prestige text-white hover:bg-white/10'
                    : 'text-white/30 opacity-50 cursor-not-allowed border border-white/5 bg-black/20'
                )}
              >
                <span className="hidden md:inline">{s.label}</span>
                <span className="md:hidden">{s.short}</span>
              </button>
              {i < TRIAL_STEPS.length - 1 && (
                <ChevronRight
                  size={12}
                  className={cn(
                    'transition-colors duration-300',
                    done ? 'text-gold-primary/70' : 'text-white/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
