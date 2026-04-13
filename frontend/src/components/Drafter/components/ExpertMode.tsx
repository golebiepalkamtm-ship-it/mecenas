import { cn } from "../utils";
import { DRAFTING_PROMPTS } from "../constants";
import type { ExpertModeKey } from "../types";

const MODE_COLORS: Record<ExpertModeKey, { bg: string; ring: string; iconBg: string; text: string }> = {
  drafter: { bg: "bg-amber-500/15", ring: "ring-amber-500/30", iconBg: "bg-amber-500/20", text: "text-amber-300" },
  defender: { bg: "bg-emerald-500/15", ring: "ring-emerald-500/30", iconBg: "bg-emerald-500/20", text: "text-emerald-300" },
  senior_partner: { bg: "bg-violet-500/15", ring: "ring-violet-500/30", iconBg: "bg-violet-500/20", text: "text-violet-300" },
  apex_pl: { bg: "bg-cyan-500/15", ring: "ring-cyan-500/30", iconBg: "bg-cyan-500/20", text: "text-cyan-300" },
};

interface ExpertModeProps {
  selectedPrompt: ExpertModeKey;
  onSelect: (key: ExpertModeKey) => void;
}

export function ExpertMode({ selectedPrompt, onSelect }: ExpertModeProps) {
  return (
    <section className="glass-prestige rounded-[2rem] p-3 shadow-inner">
      <label className="block text-[8px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 pl-1">
        Tryb Ekspercki AI
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {(
          Object.entries(DRAFTING_PROMPTS) as [ExpertModeKey, { label: string; icon: React.ElementType }][]
        ).map(([key, item]) => {
          const ItemIcon = item.icon;
          const isSelected = selectedPrompt === key;
          const mc = MODE_COLORS[key];
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all duration-300 group relative overflow-hidden",
                isSelected
                  ? `${mc.bg} ring-1 ${mc.ring} scale-[1.04] shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10`
                  : "glass-prestige hover:bg-white/[0.04] border border-transparent",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  isSelected
                    ? `${mc.iconBg} text-white`
                    : "glass-prestige text-white/30 group-hover:text-white/60",
                )}
              >
                <ItemIcon size={13} />
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest leading-tight truncate",
                isSelected ? mc.text : "text-white/50 group-hover:text-white/70",
              )}>
                {item.label}
              </span>
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor] opacity-60" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
