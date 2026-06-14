import { useState } from "react";
import { DOCUMENT_TYPES } from "../constants";
import { LexIcon } from "../../Layout/LexIcon";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../utils";

interface TypeSelectorProps {
  selectedType: string;
  onSelect: (id: string) => void;
}

export function TypeSelector({ selectedType, onSelect }: TypeSelectorProps) {
  const categories = [...new Set(DOCUMENT_TYPES.map((t) => (t as { category?: string }).category || "Inne"))];
  const selected = DOCUMENT_TYPES.find((d) => d.id === selectedType);

  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTypeId, setHoveredTypeId] = useState<string | null>(null);

  return (
    <section className="space-y-2.5">
      <label className="library-view-label not-italic block pl-1">Klasyfikacja dokumentu</label>
      <div className="space-y-2 relative">
        {/* Custom Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full library-view-cell px-4 py-3.5 text-[13px] text-black font-medium focus:outline-none focus:border-gold-primary/40 transition-all cursor-pointer text-left flex items-center justify-between"
        >
          <span>{selected ? selected.label : "— wybierz typ dokumentu —"}</span>
          <ChevronDown size={14} className={cn("text-black/40 transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Custom Dropdown List */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay to close */}
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="absolute top-full left-0 w-full mt-2 bg-white border border-black/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] z-50 max-h-80 overflow-y-auto custom-scrollbar p-2"
              >
                {categories.map((category) => (
                  <div key={category} className="space-y-1 mt-2 first:mt-0">
                    <div className="text-[8px] font-black uppercase text-black/30 tracking-widest pl-3 py-1">
                      {category}
                    </div>
                    {DOCUMENT_TYPES.filter((d) => ((d as { category?: string }).category || "Inne") === category).map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          onSelect(type.id);
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setHoveredTypeId(type.id)}
                        onMouseLeave={() => setHoveredTypeId(null)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-between",
                          selectedType === type.id ? "bg-gold-primary/20 text-black font-bold" : "text-black/60 hover:text-black hover:bg-black/5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <LexIcon name={type.lexIcon} size={13} className="text-black/40" />
                          <span>{type.label}</span>
                        </div>
                        {selectedType === type.id && <Check size={12} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Tooltip positioned next to the dropdown */}
        <AnimatePresence>
          {isOpen && hoveredTypeId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute bottom-full left-0 mb-3 w-full p-4 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-50 pointer-events-none text-black"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-black mb-1">
                Typ: {DOCUMENT_TYPES.find(d => d.id === hoveredTypeId)?.label}
              </p>
              <p className="text-[9px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-2">
                Kategoria: {DOCUMENT_TYPES.find(d => d.id === hoveredTypeId)?.category}
              </p>
              <p className="text-[8px] leading-relaxed text-emerald-600 font-black uppercase tracking-wider">
                Domyślne wytyczne: {(DOCUMENT_TYPES.find(d => d.id === hoveredTypeId) as any)?.defaultInstructions || "Brak wytycznych."}
              </p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-white border-r border-b border-black/10 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected item status capsule and description */}
        {selected && (
          <div className="space-y-1.5 mt-2">
            <div className="library-view-cell rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gold-primary/15 text-gold-deep">
                <LexIcon name={selected.lexIcon} size={13} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-black/70">
                {selected.label}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
