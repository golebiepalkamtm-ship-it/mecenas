import { useMemo, useDeferredValue, useState } from 'react';
import {
  Search,
  Zap,
  Eye,
  Coins,
  Star,
  X,
  Cpu,
  Shield,
  RotateCcw,
  Gavel,
  Trash2,
  Save
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';
import { useModels, type Model } from '../../hooks/useConfig';
import { getBrand } from '../Chat/constants';
import { supabase } from '../../utils/supabaseClient';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ModelTag = 'vision' | 'cheap' | 'fast' | 'most-powerful' | 'coding' | 'long-context' | 'reasoning';

interface OrchestratorModel extends Model {
  tags: ModelTag[];
  isRecent: boolean;
  isRecommended: boolean;
}

const LEGAL_RECOMMENDED_IDS = new Set<string>([
  // Legal models will be dynamically loaded
]);

function enrichModel(m: Model, recentIds: string[]): OrchestratorModel {
  const idLower = m.id.toLowerCase();
  const tags: ModelTag[] = [];

  if (m.vision) tags.push('vision');
  if (idLower.includes('flash') || idLower.includes('mini') || idLower.includes('lite')) tags.push('cheap');
  if (idLower.includes('flash') || idLower.includes('turbo') || idLower.includes('mini')) tags.push('fast');
  if (idLower.includes('opus') || idLower.includes('o3') || idLower.includes('gpt-4o') || idLower.includes('405b')) tags.push('most-powerful');
  if (idLower.includes('code')) tags.push('coding');
  if (idLower.includes('claude') || idLower.includes('gemini-2') || idLower.includes('gpt-4') || idLower.includes('deepseek-r1')) tags.push('reasoning');

  return {
    ...m,
    tags,
    isRecent: recentIds.includes(m.id),
    isRecommended: LEGAL_RECOMMENDED_IDS.has(m.id),
  };
}

const TAG_LABELS: Record<ModelTag | 'all', { label: string; icon: React.ElementType }> = {
  all: { label: 'Wszystkie', icon: Cpu },
  vision: { label: 'Wizja', icon: Eye },
  cheap: { label: 'Tanie', icon: Coins },
  fast: { label: 'Szybkie', icon: Zap },
  'most-powerful': { label: 'Mocne', icon: Zap },
  coding: { label: 'Kod', icon: Cpu },
  'long-context': { label: 'Kontekst', icon: Shield },
  reasoning: { label: 'Logika', icon: Gavel },
};

export function ModelOrchestrator() {
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const {
    recentModelIds,
    searchQuery,
    setSearchQuery,
    filterTag,
    setFilterTag,
    filterVendor,
    setFilterVendor,
    favoriteModelIds,
    toggleFavoriteModel,
  } = useOrchestratorStore();

  const { data: rawModels = [] } = useModels();
  const deferredSearch = useDeferredValue(searchQuery);

  const handleSaveModels = async () => {
    setIsSaving(true);
    setSuccessMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Use upsert to ensure row exists
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          favorite_models: favoriteModelIds,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;

      // Force refresh models in chat
      window.dispatchEvent(new CustomEvent('prawnik_profile_updated', {
        detail: { favorite_models: favoriteModelIds }
      }));

      setSuccessMsg('ZAPISANO!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving models:', error);
      const message = error instanceof Error ? error.message : 'Nieznany';
      setSuccessMsg(`BŁĄD: ${message}`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const enrichedModels = useMemo(
    () => rawModels.map((m) => enrichModel(m, recentModelIds)),
    [rawModels, recentModelIds]
  );

  const vendors = useMemo(() => {
    return [
      ...new Set(
        rawModels.map((m: Model) => {
          const v = m.name.includes(':') ? m.name.split(':')[0].trim() : m.id.split('/')[0];
          return v.toUpperCase();
        })
      ),
    ].sort();
  }, [rawModels]);

  const filteredModels = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return enrichedModels.filter((m) => {
      if (filterVendor !== 'all') {
        const v = (m.name.includes(':') ? m.name.split(':')[0].trim() : m.id.split('/')[0]).toUpperCase();
        if (v !== filterVendor) return false;
      }
      if (filterTag !== 'all' && !m.tags.includes(filterTag as ModelTag)) return false;
      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchId = m.id.toLowerCase().includes(q);
        const matchProvider = (m.provider || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchProvider) return false;
      }
      return true;
    });
  }, [enrichedModels, filterVendor, filterTag, deferredSearch]);

  const favoriteModels = useMemo(
    () => enrichedModels.filter((m) => favoriteModelIds.includes(m.id)),
    [enrichedModels, favoriteModelIds]
  );

  const groupedByVendor = useMemo(() => {
    return filteredModels.reduce((acc, m) => {
      const v = (m.name.includes(':') ? m.name.split(':')[0].trim() : m.id.split('/')[0]).toUpperCase();
      if (!acc[v]) acc[v] = [];
      acc[v].push(m);
      return acc;
    }, {} as Record<string, OrchestratorModel[]>);
  }, [filteredModels]);

  return (
    <div className="flex flex-col h-full bg-black/20 overflow-hidden relative">
      
      {/* HEADER WITH COMPACT FILTERS */}
      <div className="relative z-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl overflow-hidden">

        <div className="p-6 space-y-6 relative z-10">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative group">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Szukaj modeli..."
                        className="w-full bg-white/5 border border-white/10 focus:border-white/20 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 placeholder:text-white/20 outline-none transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"><X size={12} /></button>
                    )}
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 shrink-0">
                    <Star size={12} className="text-white/40" />
                    <span className={cn("text-[9px] font-black tracking-widest", favoriteModelIds.length > 20 ? "text-red-400" : "text-white/60")}>
                        {favoriteModelIds.length}/20
                    </span>
                    <button
                        onClick={() => useOrchestratorStore.getState().setFavoriteModels([])}
                        className="ml-2 px-4 py-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 group"
                    >
                        <Trash2 size={12} className="group-hover:rotate-12 transition-transform" />
                        WYCZYŚĆ
                    </button>
                    <button
                        onClick={handleSaveModels}
                        disabled={isSaving || favoriteModelIds.length === 0}
                        className="ml-2 px-4 py-2 bg-gold-primary text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                    >
                        <Save size={12} />
                        {isSaving ? 'ZAPISUJ...' : 'ZAPISZ'}
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('prawnik_models_updated'))}
                        className="ml-2 text-white/20 hover:text-white transition-colors"
                        title="Odśwież"
                    >
                        <RotateCcw size={12} />
                    </button>
                    {successMsg && (
                        <div className="ml-4 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            {successMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* Vendor Selection (Compact Grid) */}
            <div className="space-y-3">
                <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 ml-1">Wybierz Firmę</span>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto no-scrollbar pr-1">
                    <button
                        onClick={() => setFilterVendor('all')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border shrink-0",
                            filterVendor === 'all' 
                                ? "bg-white/10 border-white/30 text-white shadow-lg" 
                                : "bg-white/3 border-white/5 text-white/30 hover:bg-white/6 hover:text-white/60"
                        )}
                    >
                        WSZYSCY
                    </button>
                    {vendors.map((v) => {
                        const brand = getBrand(v);
                        const isSelected = filterVendor === v;
                        return (
                            <button
                                key={v}
                                onClick={() => setFilterVendor(v)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border shrink-0 flex items-center gap-2",
                                    isSelected 
                                        ? "bg-white/10 border-white/30 text-white shadow-lg" 
                                        : "bg-white/3 border-white/5 text-white/30 hover:bg-white/6 hover:text-white/60"
                                )}
                            >
                                <brand.icon size={10} className={cn("transition-colors", isSelected ? brand.color : "opacity-30")} />
                                {v}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tag/Category Filter */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {(Object.entries(TAG_LABELS) as [ModelTag | 'all', { label: string; icon: React.ElementType }][]).map(([tag, { label, icon: Icon }]) => (
                    <button
                        key={tag}
                        onClick={() => setFilterTag(tag)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all border shrink-0",
                            filterTag === tag 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-white/3 border-white/5 text-white/30 hover:text-white/60"
                        )}
                    >
                        <Icon size={10} />
                        <span className="text-[7px] font-black uppercase tracking-[0.2em]">{label}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* MODEL GRID Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10 bg-white/10">
            {/* Favorites Section */}
            {favoriteModels.length > 0 && searchQuery === '' && filterTag === 'all' && filterVendor === 'all' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold-primary/20" />
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">Twoje Ulubione</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {favoriteModels.map(m => (
                            <ModelMiniTile key={m.id} model={m} isFavorite={true} onToggle={() => toggleFavoriteModel(m.id)} />
                        ))}
                    </div>
                </div>
            )}

            {/* All Models Grouped */}
            {Object.entries(groupedByVendor).map(([vendor, vendorModels]) => {
                const brand = getBrand(vendor);
                return (
                    <div key={vendor} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <brand.icon size={12} className={brand.color} />
                                <span className={cn('text-[9px] font-black uppercase tracking-[0.3em]', brand.color)}>{vendor}</span>
                            </div>
                            <span className="text-[7px] text-white/10 font-black">{vendorModels.length}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {vendorModels.map((m) => (
                                <ModelMiniTile
                                    key={m.id}
                                    model={m}
                                    isFavorite={favoriteModelIds.includes(m.id)}
                                    onToggle={() => toggleFavoriteModel(m.id)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

            {filteredModels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 text-white/10 text-[9px] font-black uppercase tracking-[0.5em]">
                    Brak dopasowanych modeli
                </div>
            )}
      </div>
    </div>
  );
}

function ModelMiniTile({ model, isFavorite, onToggle }: { model: OrchestratorModel, isFavorite: boolean, onToggle: () => void }) {
  const brand = getBrand(model.provider || (model.id.includes('/') ? model.id.split('/')[0] : 'unknown'));
  const cleanName = model.name.includes(':') ? model.name.split(':').slice(1).join(':').trim() : model.name;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'group flex items-center gap-4 p-4 px-6 rounded-2xl border relative overflow-hidden min-h-[64px] h-auto w-full text-left transition-none no-shimmer',
        isFavorite 
            ? cn(brand.bg, brand.border, "shadow-[0_12px_24px_rgba(0,0,0,0.4)] ring-1 ring-white/20") 
            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15'
      )}
      style={{ animation: 'none' }}
    >
      {/* Selected indicator - Sharp and solid */}
      {isFavorite && (
          <div className={cn("absolute inset-0 opacity-10 pointer-events-none bg-current")} />
      )}

      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border z-10 transition-none", 
          isFavorite ? cn(brand.bg.replace('/10', '/30'), brand.border, brand.color) : "bg-black/40 border-white/10 text-white/10 group-hover:text-white/30")}>
        <brand.icon size={16} />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 z-10">
        <span className={cn("text-[11px] font-black uppercase tracking-tight leading-tight truncate", 
            isFavorite ? "text-white" : "text-white/60 group-hover:text-white")}>
            {cleanName || model.id}
        </span>
        <span className="text-[7px] text-white/20 font-bold uppercase tracking-widest mt-0.5">{(model.provider || (model.id.includes('/') ? model.id.split('/')[0] : 'unknown')).toUpperCase()}</span>
      </div>

      {isFavorite && (
          <div className={cn("shrink-0 ml-1 z-10 p-1.5 rounded-full bg-white/10", brand.color)}>
              <Star size={10} fill="currentColor" />
          </div>
      )}
    </button>
  );
}
