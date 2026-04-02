import { cn } from "../utils";
import { DOCUMENT_TYPES } from "../constants";

interface TypeSelectorProps {
  selectedType: string;
  onSelect: (id: string) => void;
}

export function TypeSelector({ selectedType, onSelect }: TypeSelectorProps) {
  return (
    <section className="glass-prestige rounded-[2rem] p-3 shadow-inner">
      <label className="block text-[8px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 pl-1">
        Rodzaj Dokumentu
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {DOCUMENT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl text-center transition-all duration-300 group",
                isSelected
                  ? `${type.bg} ${type.color} ring-1 ${type.ring} scale-[1.04] shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10`
                  : "glass-prestige hover:bg-white/[0.04] text-white/30 hover:text-white/70 border border-transparent",
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all",
                isSelected ? `${type.iconBg} text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]` : "transparent"
              )}>
                <Icon
                  size={13}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className={cn(
                      "transition-transform group-hover:scale-110",
                      isSelected ? "text-white" : "text-white/20"
                  )}
                />
              </div>
              <span className={cn(
                "text-[7px] font-black uppercase tracking-wider leading-tight",
                isSelected ? type.color : "text-white/40"
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
