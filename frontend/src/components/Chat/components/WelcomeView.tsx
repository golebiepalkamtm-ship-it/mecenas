import { motion } from "framer-motion";
import { BrandLogo } from "../../../components/Shared/BrandLogo";
import { LexIcon } from "../../Layout/LexIcon";
import type { Tab } from "../../../types/navigation";

const QUICK_HINTS = [
  { icon: "shield" as const, label: "Analiza sprawy", tint: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { icon: "judgments" as const, label: "Orzecznictwo", tint: "text-amber-700 bg-amber-500/10 border-amber-500/20" },
  { icon: "documents" as const, label: "Dokumenty", tint: "text-blue-700 bg-blue-500/10 border-blue-500/20" },
] as const;

export function WelcomeView({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  return (
    <div className="welcome-view-root flex flex-col items-center justify-center min-h-[min(100%,42rem)] text-center py-8 lg:py-12 relative">
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
          <div className="h-px flex-1 max-w-[5rem] lg:max-w-[5.5rem] bg-black/15" />
          <span className="text-[10px] lg:text-xs font-black tracking-[0.45em] lg:tracking-[0.55em] text-[#D4AF37] uppercase italic font-outfit shrink-0">
            System analizy przepisów
          </span>
          <div className="h-px flex-1 max-w-[5rem] lg:max-w-[5.5rem] bg-black/15" />
        </div>

        <p className="text-[8px] lg:text-[10px] font-bold text-green-700 tracking-[0.22em] leading-relaxed uppercase font-outfit px-2">
          Serwis ma charakter wyłącznie informacyjny. Wygenerowane treści nie stanowią porady prawnej.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {QUICK_HINTS.map((hint) => (
            <span
              key={hint.label}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider font-outfit ${hint.tint}`}
            >
              <LexIcon name={hint.icon} size={12} />
              {hint.label}
            </span>
          ))}
        </div>

        {onNavigate && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("documents")}
            className="mt-2 px-6 py-2.5 rounded-xl glass-liquid-convex text-black text-[10px] font-black uppercase tracking-widest shadow-md font-outfit"
          >
            Przejdź do Dokumentów
          </motion.button>
        )}
      </motion.div>

      <div className="absolute inset-0 pointer-events-none opacity-80 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(212,175,55,0.08),transparent_65%)]" />
    </div>
  );
}
