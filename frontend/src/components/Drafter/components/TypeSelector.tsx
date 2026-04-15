import { cn } from "../utils";
import { DOCUMENT_TYPES } from "../constants";

interface TypeSelectorProps {
  selectedType: string;
  onSelect: (id: string) => void;
}

export function TypeSelector({ selectedType, onSelect }: TypeSelectorProps) {
  return (
    <section className="p-3">
      <label className="block text-[8px] font-black uppercase tracking-[0.3em] text-black/40 mb-3 pl-1">
        Klasyfikacja Dokumentu
      </label>
      <div className="grid grid-cols-3 gap-2">
        {DOCUMENT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          const neonByIndex = [
            "#22d3ee",
            "#a855f7",
            "#f59e0b",
            "#10b981",
            "#f43f5e",
            "#3b82f6",
          ];
          const neonColor = neonByIndex[Math.abs(type.id.length) % neonByIndex.length];
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={cn(
                "flex flex-col items-center gap-2 px-2 py-3 rounded-xl text-center transition-all duration-300 group",
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
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all bg-black/5",
                isSelected ? "text-black" : "text-black/20"
              )}>
                <Icon
                  size={14}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="transition-transform group-hover:scale-110"
                />
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest leading-tight",
                isSelected ? "text-black" : "text-black/40"
              )}>
                {type.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
