import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Star, Check } from "lucide-react";
import { useModels, readEnabledModels } from "../../../hooks/useConfig";
import { useChatSettingsStore } from "../../../store/useChatSettingsStore";
import { getBrand } from "../constants";
import { cn } from "../../../utils/cn";

export function MainModelSelector() {
  const { data: rawModels = [] } = useModels();
  const { selectedSingleModel, setSelectedSingleModel, favoriteModels } = useChatSettingsStore();
  const adminSelectedModels = readEnabledModels();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zamknij dropdown przy kliknięciu poza
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filtrujemy modele — ulubione na górze, potem reszta
  const availableModels = useMemo(() => {
    let pool = rawModels;
    
    if (adminSelectedModels.length > 0) {
      pool = pool.filter(m => adminSelectedModels.includes(m.id));
    }
    
    if (favoriteModels.length > 0) {
      const favs = pool.filter(m => favoriteModels.includes(m.id));
      const others = pool.filter(m => !favoriteModels.includes(m.id));
      return [...favs, ...others];
    }
    
    return pool;
  }, [rawModels, adminSelectedModels, favoriteModels]);

  const selectedModel = useMemo(() => {
    return availableModels.find(m => m.id === selectedSingleModel) || availableModels[0];
  }, [availableModels, selectedSingleModel]);

  if (!selectedModel) return null;

  const vendor = selectedModel.provider || (selectedModel.id.includes('/') ? selectedModel.id.split('/')[0] : 'unknown');
  const brand = getBrand(vendor);
  const BrandIcon = brand.icon;
  const cleanName = selectedModel.name.includes(':') ? selectedModel.name.split(':')[1].trim() : selectedModel.name;

  return (
    <div className="relative z-50" ref={containerRef}>
      {/* Trigger Button — kompaktowy pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer group/model-sel",
          isOpen
            ? "bg-white/80 border-gold-primary/30 shadow-[0_2px_10px_rgba(212,175,55,0.15)]"
            : "bg-white/50 border-black/10 hover:border-black/20 hover:bg-white/70 shadow-sm"
        )}
      >
        <BrandIcon size={11} className={brand.color} />
        <span className="text-[9px] font-black uppercase tracking-widest text-black/75 max-w-[100px] sm:max-w-[140px] truncate">
          {cleanName}
        </span>
        <ChevronDown size={10} className={cn("text-black/30 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown lista modeli */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop na mobile */}
            <motion.div
              key="model-sel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 sm:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              key="model-sel-dropdown"
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
              className="absolute top-full left-0 mt-1.5 w-72 max-h-72 overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl rounded-2xl border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.18)] flex flex-col z-50"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-black/5 bg-white/90 backdrop-blur-md flex items-center justify-between">
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-black/35">Model AI</span>
                <span className="text-[7px] font-bold uppercase tracking-widest text-black/25">{availableModels.length}</span>
              </div>

              {/* Ulubione — sekcja */}
              {favoriteModels.length > 0 && (
                <div className="px-1.5 pt-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <Star size={8} className="text-gold-primary" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gold-primary/70">Ulubione</span>
                  </div>
                </div>
              )}

              {/* Lista modeli */}
              <div className="p-1.5 space-y-0.5">
                {availableModels.map((m, idx) => {
                  const isSelected = m.id === selectedSingleModel;
                  const isFav = favoriteModels.includes(m.id);
                  const mVendor = m.provider || (m.id.includes('/') ? m.id.split('/')[0] : 'unknown');
                  const mBrand = getBrand(mVendor);
                  const MBrandIcon = mBrand.icon;
                  const mCleanName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;

                  // Separator między ulubionymi a resztą
                  const showSeparator = favoriteModels.length > 0 
                    && idx === favoriteModels.filter(fId => availableModels.some(am => am.id === fId)).length
                    && idx > 0;

                  return (
                    <div key={m.id}>
                      {showSeparator && (
                        <div className="flex items-center gap-2 px-2 py-1.5 my-0.5">
                          <div className="h-px flex-1 bg-black/5" />
                          <span className="text-[6px] font-black uppercase tracking-[0.3em] text-black/20">Pozostałe</span>
                          <div className="h-px flex-1 bg-black/5" />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSingleModel(m.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-xl transition-all",
                          isSelected
                            ? "bg-gold-primary/10 border border-gold-primary/20"
                            : "hover:bg-black/[0.03] border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                          isSelected
                            ? cn(mBrand.bg, mBrand.border)
                            : "bg-black/5 border-black/5"
                        )}>
                          <MBrandIcon size={11} className={isSelected ? mBrand.color : "text-black/30"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider truncate block",
                            isSelected ? "text-black" : "text-black/65"
                          )}>
                            {mCleanName}
                          </span>
                          <span className="text-[6.5px] font-bold uppercase tracking-widest text-black/30 block mt-0.5">
                            {mVendor}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {isFav && <Star size={8} className="text-gold-primary/50" fill="currentColor" />}
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-gold-primary/20 flex items-center justify-center">
                              <Check size={9} className="text-gold-primary" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
