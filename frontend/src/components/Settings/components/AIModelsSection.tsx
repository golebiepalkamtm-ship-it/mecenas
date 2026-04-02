import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Search, 
  Check, 
  Info,
  ChevronDown,
  X,
  Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useModels, type Model } from '../../../hooks/useConfig';
import { useChatSettingsStore } from '../../../store/useChatSettingsStore';
import type { SettingsViewProps } from '../types';
import { getBrand, normalizeVendor } from '../../Chat/constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function AIModelsSection({ onUpdateProfile, isSaving, successMsg }: Pick<SettingsViewProps, 'onUpdateProfile' | 'isSaving' | 'successMsg'>) {
  const { favoriteModels, toggleFavorite, setFavoriteModels } = useChatSettingsStore();
  const { data: availableModels = [], isLoading } = useModels();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVendor, setFilterVendor] = useState("all");

  // Normalize and group models
  const groupedAndFilteredModels = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const groups: Record<string, Model[]> = {};

    availableModels.forEach((m: Model) => {
      const vendor = normalizeVendor(m.name, m.id);
      
      // Filter by vendor
      if (filterVendor !== "all" && vendor !== filterVendor) return;
      
      // Filter by search
      if (query) {
        const matchName = m.name.toLowerCase().includes(query);
        const matchId = m.id.toLowerCase().includes(query);
        if (!matchName && !matchId) return;
      }

      if (!groups[vendor]) groups[vendor] = [];
      groups[vendor].push(m);
    });

    return groups;
  }, [availableModels, filterVendor, searchQuery]);

  const vendors = useMemo(() => {
    return Object.keys(groupedAndFilteredModels).sort();
  }, [groupedAndFilteredModels]);

  const selectedModelsData = useMemo(() => {
    return availableModels.filter(m => favoriteModels.includes(m.id));
  }, [availableModels, favoriteModels]);

  const handleSave = async () => {
    await onUpdateProfile({ favorite_models: favoriteModels });
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-primary"></div>
      </div>
    );
  }

  return (
    <motion.section 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-prestige rounded-[2.5rem] p-8 space-y-8 shadow-2xl overflow-hidden relative border border-white/5"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl glass-prestige-gold flex items-center justify-center shadow-lg border-t border-white/20">
            <Cpu size={28} className="text-gold-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Biblioteka Modelu AI</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Skomponuj swój zespół do 20 ulubionych modeli</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
          <div className="text-right">
            <div className="text-2xl font-black text-gold-gradient italic leading-none">{favoriteModels.length}/20</div>
            <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-1">Wybrano</div>
          </div>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFavoriteModels([])}
              className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all"
            >
              WYCZYŚĆ
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gold-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'ZAPIS...' : 'ZAPISZ'}
            </button>
          </div>
        </div>
      </div>

      {/* SELECTION BAR - The "Visual Confirmation" requested by the user */}
      <AnimatePresence mode="popLayout">
        {selectedModelsData.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-white/5 border border-white/10 rounded-3xl space-y-3"
          >
            <div className="flex items-center justify-between px-2">
              <span className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em]">Twoja aktualna lista:</span>
              <button 
                onClick={() => useChatSettingsStore.getState().setFavoriteModels([])}
                className="text-[9px] text-white/20 hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
              >
                Wyczyść wszystko
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedModelsData.map(m => {
                const brand = getBrand(normalizeVendor(m.name, m.id));
                return (
                  <motion.div 
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    key={`pill-${m.id}`}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 bg-black/40 border border-white/10 rounded-full group cursor-default"
                  >
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", brand.border, brand.bg)}>
                      <brand.icon size={12} className={brand.color} />
                    </div>
                    <span className="text-[10px] text-white/70 font-bold whitespace-nowrap">
                      {m.name.includes(":") ? m.name.split(":").slice(1).join(":").trim() : m.name}
                    </span>
                    <button 
                      onClick={() => toggleFavorite(m.id)}
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all"
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-primary transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SZUKAJ MODELI..." 
              className="w-full bg-black/40 border border-white/10 focus:border-gold-primary/40 rounded-2xl py-4 pl-12 pr-4 text-[11px] font-black uppercase tracking-widest text-white/90 placeholder:text-white/20 transition-all outline-none"
            />
          </div>
          <div className="relative min-w-[220px]">
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="w-full appearance-none bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-bold text-white/80 outline-none focus:border-gold-primary/40 transition-all cursor-pointer uppercase tracking-widest"
            >
              <option value="all">Wszyscy Dostawcy</option>
              {vendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
          </div>
        </div>

        {/* Models List - Grouped */}
        <div className="space-y-8 max-h-[600px] overflow-y-auto custom-scrollbar pr-4 p-1">
          {vendors.map(vendor => (
            <div key={vendor} className="space-y-4">
              <div className="flex items-center gap-3 sticky top-0 bg-black/80 backdrop-blur-md py-2 z-10">
                <div className={cn("w-2 h-6 rounded-full", getBrand(vendor).bg, "border", getBrand(vendor).border)} />
                <h3 className="text-[12px] font-black text-white/60 uppercase tracking-[0.3em] font-prestige">{vendor}</h3>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {groupedAndFilteredModels[vendor].map((m) => {
                  const isFavorite = favoriteModels.includes(m.id);
                  const brand = getBrand(vendor);
                  const cleanName = m.name.includes(":") ? m.name.split(":").slice(1).join(":").trim() : m.name;
                  
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleFavorite(m.id)}
                      disabled={!isFavorite && favoriteModels.length >= 20}
                      className={cn(
                        "group relative flex items-center justify-between p-4 rounded-2xl transition-all border text-left overflow-hidden",
                        isFavorite
                          ? cn(brand.bg, brand.border, "shadow-lg shadow-black/20")
                          : "bg-white/3 border-white/5 hover:border-white/20 hover:bg-white/6 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0 pr-4 relative z-10">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                          isFavorite ? cn(brand.bg, brand.border, brand.color, "scale-110") : "bg-black/40 border-white/10 text-white/40"
                        )}>
                          <brand.icon size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-[11px] font-black uppercase tracking-wide truncate transition-colors",
                            isFavorite ? brand.color : "text-white/80 group-hover:text-white"
                          )}>
                            {cleanName || m.id}
                          </span>
                          <span className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{vendor}</span>
                            {m.vision && <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">👁️ Vision</span>}
                            {m.id.toLowerCase().includes('free') && <span className="bg-blue-500/20 text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Free</span>}
                            {(m.id.includes('128k') || m.id.includes('200k') || m.id.includes('opus') || m.id.includes('pro')) && <span className="bg-purple-500/20 text-purple-400 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">🧠 Premium</span>}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center transition-all shrink-0 z-10",
                        isFavorite ? cn(brand.bg, brand.border, brand.color) : "border-white/10 text-transparent"
                      )}>
                        {isFavorite ? <Check size={14} strokeWidth={4} /> : <Plus size={14} className="group-hover:text-white/40 transition-colors" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 max-w-[500px]">
          <Info size={16} className="text-white/40 shrink-0" />
          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
            Dodaj do 20 modeli, które chcesz mieć pod ręką podczas czatu. W trybie "Konsylium" będziesz mógł angażować je do wspólnej analizy prawnej.
          </p>
        </div>
        <div className="flex items-center gap-4">
           {successMsg && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/30"
            >
              <Check size={12} /> {successMsg}
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
