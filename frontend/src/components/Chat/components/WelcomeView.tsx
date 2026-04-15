import { motion } from "framer-motion";
import { BrandLogo } from "../../../components/Shared/BrandLogo";
import type { Tab } from "../../../types/navigation";

export function WelcomeView({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center p-4 xs:p-6 lg:p-20 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-3 xs:space-y-4 lg:space-y-6 relative z-10 w-full"
      >
        <div className="flex flex-col items-center">
          <div className="mb-10 lg:mb-14 w-full px-4 lg:px-10">
            <BrandLogo size={80} className="w-full max-w-[800px] mx-auto" />
          </div>

          
          <div className="flex flex-col items-center gap-6">
             <div className="flex items-center justify-center gap-4 lg:gap-8">
              <div className="h-px w-10 lg:w-20 bg-black opacity-10" />
              <span className="text-[10px] lg:text-sm font-black tracking-[0.6em] text-white uppercase italic">
                System analizy przepisów
              </span>
              <div className="h-px w-10 lg:w-20 bg-black opacity-10" />
            </div>
            
            <p className="max-w-[300px] lg:max-w-2xl mx-auto text-[8px] lg:text-[11px] font-bold text-white/40 tracking-[0.25em] leading-relaxed uppercase">
              Serwis ma charakter wyłącznie informacyjny. Wygenerowane treści nie stanowią porady prawnej.
            </p>

            {onNavigate && (
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.05)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate("documents")}
                className="mt-4 px-6 py-2 rounded-xl border-2 border-black text-white text-[10px] font-black uppercase tracking-widest transition-all glass-prestige-platinum"
              >
                Przejdź do Dokumentów
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
      <div className="absolute inset-0 bg-radial-to-c from-black/5 to-transparent" />
    </div>
  );
}
