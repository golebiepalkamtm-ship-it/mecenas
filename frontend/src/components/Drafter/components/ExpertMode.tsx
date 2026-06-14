import { useState } from "react";
import { cn } from "../utils";
import { DRAFTING_PROMPTS } from "../constants";
import type { ExpertModeKey } from "../types";
import { LexIcon } from "../../Layout/LexIcon";
import { motion, AnimatePresence } from "framer-motion";

interface ExpertModeProps {
  selectedPrompt: ExpertModeKey;
  onSelect: (key: ExpertModeKey) => void;
}

interface ModeDetail {
  description: string;
  impact: string;
}

const MODE_DETAILS: Record<string, ModeDetail> = {
  drafter: {
    description: "Bezbłędne, precyzyjne i profesjonalne redagowanie ostatecznych pism procesowych.",
    impact: "Tworzy ustrukturyzowany dokument z metryczką, tytułem, żądaniami i logicznym uzasadnieniem."
  },
  defender: {
    description: "Agresywne podejście procesowe skupione na poszukiwaniu wad formalnych i uchybień drugiej strony.",
    impact: "Kładzie nacisk na luki w procedurze (KPK, KPA), podważanie wiarygodności dowodów i twardą obronę."
  },
  senior_partner: {
    description: "Strategiczne podejście partnera kancelarii, ważącego ryzyka i budującego silną pozycję negocjacyjną.",
    impact: "Zawiera szczegółową analizę ryzyka i chłodną, formalną argumentację odpierającą twierdzenia przeciwne."
  },
  apex_pl: {
    description: "Najwyższy stopień wyspecjalizowania w polskiej procedurze karnej oraz administracyjnej.",
    impact: "Używa wysoce specjalistycznego orzecznictwa, precyzyjnych jednostek redakcyjnych kodeksów i maksymalizuje formalny opór."
  }
};

export function ExpertMode({ selectedPrompt, onSelect }: ExpertModeProps) {
  const [hoveredKey, setHoveredKey] = useState<ExpertModeKey | null>(null);

  return (
    <section className="space-y-2.5">
      <label className="library-view-label not-italic block pl-1">Tryb ekspercki AI</label>
      <div className="relative">
        <div className="flex flex-wrap gap-2 relative">
          {(
            Object.entries(DRAFTING_PROMPTS) as [ExpertModeKey, (typeof DRAFTING_PROMPTS)[ExpertModeKey]][]
          ).map(([key, item]) => {
            const isSelected = selectedPrompt === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={cn(
                  "flex-1 min-w-[7rem] inline-flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg transition-all duration-300 group relative font-outfit",
                  isSelected
                    ? "library-filter-active"
                    : "library-view-cell text-black/50 hover:text-black",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all",
                    isSelected ? "bg-gold-primary/15 text-gold-deep" : "bg-black/5 text-black/25",
                  )}
                >
                  <LexIcon name={item.lexIcon} size={13} />
                </div>
                <span
                  className={cn(
                    "text-[7px] font-black uppercase tracking-wider leading-tight truncate",
                    isSelected ? "text-black" : "text-black/45",
                  )}
                >
                  {item.label}
                </span>
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold-primary shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredKey && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3.5 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-50 pointer-events-none text-black"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                Tryb: {DRAFTING_PROMPTS[hoveredKey].label}
              </p>
              <p className="text-[8px] leading-relaxed text-black/70 font-bold uppercase tracking-wider mb-2">
                {MODE_DETAILS[hoveredKey].description}
              </p>
              <p className="text-[7px] leading-relaxed text-emerald-600 font-black uppercase tracking-wider">
                Wpływ: {MODE_DETAILS[hoveredKey].impact}
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-white border-r border-b border-black/10 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>


      </div>
    </section>
  );
}
