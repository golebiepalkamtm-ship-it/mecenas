import { cn } from "../utils";
import { DRAFTING_PROMPTS } from "../constants";
import type { ExpertModeKey } from "../types";

const MODE_COLORS: Record<ExpertModeKey, { bg: string; ring: string; iconBg: string; text: string }> = {
  drafter: { bg: "glass-prestige-button-primary", ring: "ring-black/10", iconBg: "bg-black/5", text: "text-black" },
  defender: { bg: "glass-prestige-button-primary", ring: "ring-black/10", iconBg: "bg-black/5", text: "text-black" },
  senior_partner: { bg: "glass-prestige-button-primary", ring: "ring-black/10", iconBg: "bg-black/5", text: "text-black" },
  apex_pl: { bg: "glass-prestige-button-primary", ring: "ring-black/10", iconBg: "bg-black/5", text: "text-black" },
};

interface ExpertModeProps {
  selectedPrompt: ExpertModeKey;
  onSelect: (key: ExpertModeKey) => void;
}

export function ExpertMode({ selectedPrompt, onSelect }: ExpertModeProps) {
  const modeNeon: Record<ExpertModeKey, string> = {
    drafter: "#22d3ee",
    defender: "#10b981",
    senior_partner: "#a855f7",
    apex_pl: "#f59e0b",
  };

  return (
    <section className="p-3">
      <label className="block text-[8px] font-black uppercase tracking-[0.3em] text-black/40 mb-3 pl-1">
        Tryb Ekspercki AI
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(
          Object.entries(DRAFTING_PROMPTS) as [ExpertModeKey, { label: string; icon: React.ElementType }][]
        ).map(([key, item]) => {
          const ItemIcon = item.icon;
          const isSelected = selectedPrompt === key;
          const mc = MODE_COLORS[key];
          const neonColor = modeNeon[key];
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-300 group relative overflow-hidden",
                isSelected
                  ? "glass-liquid-convex scale-[1.02] shadow-xl text-black"
                  : "opacity-60 hover:opacity-100",
              )}
              style={
                isSelected
                  ? {
                      backgroundColor: neonColor,
                      backgroundImage:
                        "linear-gradient(145deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 52%, rgba(0,0,0,0.12) 100%)",
                      boxShadow: `0 0 26px ${neonColor}cc, 0 12px 40px -10px ${neonColor}99, inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15)`,
                    }
                  : undefined
              }
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  isSelected
                    ? "bg-black/5 text-black"
                    : "bg-black/5 text-black/20 group-hover:text-black/40",
                )}
              >
                <ItemIcon size={14} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest leading-tight truncate",
                isSelected ? mc.text : "text-black/40 group-hover:text-black/60",
              )}>
                {item.label}
              </span>
              {isSelected && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
