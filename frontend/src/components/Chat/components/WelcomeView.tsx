import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "../../../components/Shared/BrandLogo";
import { useQuickIntelligenceState } from "../../../hooks/chatSettingsSelectors";
import { translatePromptKey } from "../../../utils/promptLabels";
import { Zap, Shield, Gavel, Users } from "lucide-react";
import { cn } from "../../../utils/cn";

export function WelcomeView({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { currentTask, activeModels, activePromptPresetId } = useQuickIntelligenceState();

  const isProsecution = activePromptPresetId === 'prosecution';
  const hasActiveStrategy = activeModels.length > 0 || currentTask;

  return (
    <div className="welcome-view-root flex flex-col items-center justify-center min-h-[min(100%,36rem)] lg:min-h-[min(100%,42rem)] text-center py-8 lg:py-12 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-6 relative z-10 w-full max-w-2xl mx-auto px-2"
      >
        <div className="welcome-brand-wrap w-full">
          <BrandLogo size={80} className="w-full max-w-[min(100%,520px)] mx-auto" />
        </div>

        <div className="flex items-center justify-center gap-4 lg:gap-8">
          <div className="h-px flex-1 max-w-20 lg:max-w-22 bg-black/15" />
          <span className="text-[10px] lg:text-xs font-black tracking-[0.45em] lg:tracking-[0.55em] text-[#D4AF37] uppercase italic font-outfit shrink-0">
            System analizy przepisów
          </span>
          <div className="h-px flex-1 max-w-20 lg:max-w-22 bg-black/15" />
        </div>

        <AnimatePresence mode="popLayout">
          {hasActiveStrategy && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="mt-8 flex flex-col items-center gap-3 pt-6"
            >
              <div className="flex flex-wrap justify-center items-center gap-2 px-5 py-2.5 rounded-3xl bg-white/60 backdrop-blur-xl border border-gold-primary/20 shadow-[0_10px_30px_rgba(212,175,55,0.1)]">
                <div className={cn("flex items-center justify-center w-6 h-6 rounded-full shadow-sm", isProsecution ? "bg-red-500/10 text-red-700" : "bg-emerald-500/10 text-emerald-700")}>
                  {isProsecution ? <Gavel size={12} /> : <Shield size={12} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/80">
                  {isProsecution ? "Oskarżenie" : "Obrona"}
                </span>
                
                <div className="w-px h-4 bg-black/10 mx-2" />
                
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gold-primary/10 text-gold-deep shadow-sm">
                  <Users size={12} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/80">
                  {activeModels.length} {activeModels.length === 1 ? 'Ekspert' : (activeModels.length > 1 && activeModels.length < 5) ? 'Ekspertów' : 'Ekspertów'}
                </span>
                
                {currentTask && (
                  <>
                    <div className="w-px h-4 bg-black/10 mx-2 hidden sm:block" />
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-700 shadow-sm hidden sm:flex">
                      <Zap size={12} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/80 hidden sm:block">
                      {translatePromptKey(currentTask)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[9px] font-black text-gold-primary/80 uppercase tracking-[0.25em]">Aktywna Strategia - System gotowy do działania</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="absolute bottom-4 left-0 right-0 text-[8px] lg:text-[10px] font-bold text-green-700 tracking-[0.22em] leading-relaxed uppercase font-outfit px-2 z-10"
      >
        Serwis ma charakter wyłącznie informacyjny. Wygenerowane treści nie stanowią porady prawnej.
      </motion.p>

      <div className="absolute inset-0 pointer-events-none opacity-80 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(212,175,55,0.08),transparent_65%)]" />
    </div>
  );
}
