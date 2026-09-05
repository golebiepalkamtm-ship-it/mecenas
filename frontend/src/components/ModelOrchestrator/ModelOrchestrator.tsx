import { useMemo, useDeferredValue, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Save,
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useModelOrchestratorState, useAssignedModelsState } from '../../hooks/chatSettingsSelectors';
import { useModels, type Model, readEnabledModels } from '../../hooks/useConfig';
import { useApiManagement } from '../../hooks';
import { getBrand } from '../Chat/constants';
import { supabase } from '../../utils/supabaseClient';
import { useModelHealth, type ModelHealth } from '../../hooks/useModelHealth';
import { API_BASE } from '../../config';

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
  
  // cheap: free or cost <= $1.0 per 1M tokens or keyword matching
  const isCheap = m.free || 
    (m.pricing && m.pricing.prompt && parseFloat(m.pricing.prompt) * 1000000 <= 1.0) ||
    idLower.includes('flash') || idLower.includes('mini') || idLower.includes('lite');
  if (isCheap) tags.push('cheap');

  // fast: flash, turbo, mini, speed
  if (idLower.includes('flash') || idLower.includes('turbo') || idLower.includes('mini') || idLower.includes('speed')) {
    tags.push('fast');
  }

  // most-powerful: exclude known low-quality/small keywords (matching Admin panel style)
  const isLowQuality = /haiku|flash|mini|small|lite|tiny|7b|8b/i.test(m.id) || /haiku|flash|mini|small|lite|tiny|7b|8b/i.test(m.name);
  if (!isLowQuality) {
    tags.push('most-powerful');
  }

  // coding: code, coder
  if (idLower.includes('code') || idLower.includes('coder')) {
    tags.push('coding');
  }

  // long-context: context length >= 120k or long-context keywords
  if ((m.context_length && m.context_length >= 120000) || idLower.includes('128k') || idLower.includes('200k') || idLower.includes('1m') || idLower.includes('long') || idLower.includes('context')) {
    tags.push('long-context');
  }

  // reasoning: logical models
  const logicalRegex = /gpt-4|claude-3|claude-2|gemini-1.5-pro|gemini-2.0-pro|deepseek-r1|deepseek-reasoner|^openai\/o[13]/i;
  if (logicalRegex.test(m.id) || logicalRegex.test(m.name)) {
    tags.push('reasoning');
  }

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<ModelTag | 'all'>('all');
  const [filterVendor, setFilterVendor] = useState('all');
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'favorites' | 'assignments'>('favorites');
  const { assignedModels, setAssignedModels, setAssignedModel } = useAssignedModelsState();
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Load assignments
  useEffect(() => {
    if (activeSubTab === 'assignments') {
      setLoadingAssignments(true);
      fetch(`${API_BASE}/models/assigned`)
        .then(res => res.json())
        .then(data => {
          setAssignedModels(data);
          setLoadingAssignments(false);
        })
        .catch(err => {
          console.error('Error fetching assignments:', err);
          setLoadingAssignments(false);
        });
    }
  }, [activeSubTab]);

  // Save assignments
  const handleSaveAssignments = async () => {
    setSavingAssignments(true);
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/models/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments: assignedModels }),
      });
      if (!res.ok) throw new Error('Nie udało się zapisać przypisań');
      setSuccessMsg('ZAPISANO PRZYPISANIA!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving assignments:', error);
      setSuccessMsg('BŁĄD ZAPISU!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } finally {
      setSavingAssignments(false);
    }
  };

  const {
    recentModelIds,
    favoriteModels: favoriteModelIds,
    setFavoriteModels,
    toggleFavorite: toggleFavoriteModel,
  } = useModelOrchestratorState();

  const { data: rawModels = [] } = useModels();
  const { healthData, isLoading: isHealthLoading, refreshHealth, latencies } = useModelHealth();
  const { providers } = useApiManagement();
  const deferredSearch = useDeferredValue(searchQuery);

  // Admin-selected models (hierarchia dostępu)
  const adminSelectedModels = readEnabledModels();

  const sortedModelsForSelect = useMemo(() => {
    // Użytkownik widzi wyłącznie modele ze swojej puli (do 20 modeli)
    const basePool = favoriteModelIds.length > 0
      ? rawModels.filter(m => favoriteModelIds.includes(m.id) && (adminSelectedModels.length === 0 || adminSelectedModels.includes(m.id)))
      : (adminSelectedModels.length > 0
          ? rawModels.filter(m => adminSelectedModels.includes(m.id))
          : rawModels);

    return [...basePool].sort((a, b) => {
      const providerA = (a.provider || '').toUpperCase();
      const providerB = (b.provider || '').toUpperCase();
      if (providerA !== providerB) return providerA.localeCompare(providerB);
      return a.name.localeCompare(b.name);
    });
  }, [rawModels, favoriteModelIds, adminSelectedModels]);

  const activeProviders = useMemo(() => 
    providers
      .filter(p => p.active && p.key && p.key.trim() !== "")
      .map(p => p.id.toLowerCase()),
    [providers]
  );

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
      // HIERARCHIA DOSTĘPU: Pokazuj tylko modele wybrane przez admina
      if (adminSelectedModels.length > 0 && !adminSelectedModels.includes(m.id)) {
        return false;
      }

      // STRICT PROVIDER FILTER
      const providerStr = (m.provider || '').toLowerCase();
      let normalizedProviderId = providerStr;
      if (providerStr.includes('google')) normalizedProviderId = 'google';
      else if (providerStr.includes('openai')) normalizedProviderId = 'openai';
      else if (providerStr.includes('anthropic')) normalizedProviderId = 'anthropic';
      else if (providerStr.includes('mistral')) normalizedProviderId = 'mistral';
      else if (providerStr.includes('meta')) normalizedProviderId = 'meta';
      else if (providerStr.includes('deepseek')) normalizedProviderId = 'deepseek';
      else if (providerStr.includes('perplexity')) normalizedProviderId = 'perplexity';
      else if (providerStr.includes('openrouter')) normalizedProviderId = 'openrouter';
      else if (providerStr.includes('mindee')) normalizedProviderId = 'mindee';
      else if (providerStr.includes('cohere')) normalizedProviderId = 'cohere';
      else if (providerStr.includes('microsoft')) normalizedProviderId = 'microsoft';
      else if (providerStr.includes('stability')) normalizedProviderId = 'stability';
      else if (providerStr.includes('upstage')) normalizedProviderId = 'upstage';
      else if (providerStr.includes('x-ai')) normalizedProviderId = 'x-ai';

      const isVisibleThroughDirect = activeProviders.includes(normalizedProviderId);
      const isVisibleThroughOpenRouter = activeProviders.includes('openrouter');
      
      if (!(!!m.free || isVisibleThroughDirect || isVisibleThroughOpenRouter)) {
        return false;
      }

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
  }, [enrichedModels, adminSelectedModels, filterVendor, filterTag, deferredSearch, activeProviders]);

  const favoriteModels = useMemo(
    () => enrichedModels
      .filter((m) => favoriteModelIds.includes(m.id))
      .sort((a, b) => {
        // SORTOWANIE WEDŁUG SZYBKOŚCI: Najszybsze modele najpierw
        const aLatency = latencies[a.id] || 9999;
        const bLatency = latencies[b.id] || 9999;
        if (aLatency !== bLatency) return aLatency - bLatency;

        // Jeśli takie same latency, sortuj alfabetycznie
        return a.name.localeCompare(b.name);
      }),
    [enrichedModels, favoriteModelIds, latencies]
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
      <div className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-3xl">

        <div className="p-6 space-y-6 relative z-10">
            {/* Top Sub-tabs */}
            <div className="flex border-b border-white/5 mb-4">
              <button
                onClick={() => setActiveSubTab('favorites')}
                className={cn(
                  "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2",
                  activeSubTab === 'favorites'
                    ? "border-gold-primary text-white"
                    : "border-transparent text-white/30 hover:text-white/60"
                )}
              >
                Ulubione modele i status
              </button>
              <button
                onClick={() => setActiveSubTab('assignments')}
                className={cn(
                  "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2",
                  activeSubTab === 'assignments'
                    ? "border-gold-primary text-white"
                    : "border-transparent text-white/30 hover:text-white/60"
                )}
              >
                Przypisywanie modeli do funkcji
              </button>
            </div>

            {activeSubTab === 'favorites' ? (
              <>
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
                        <div className="relative">
                            <button
                                onClick={() => setFavoriteModels([])}
                                onMouseEnter={() => setHoveredAction('clear')}
                                onMouseLeave={() => setHoveredAction(null)}
                                className="ml-2 px-4 py-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 group"
                            >
                                <Trash2 size={12} className="group-hover:rotate-12 transition-transform" />
                                WYCZYŚĆ
                            </button>
                            <AnimatePresence>
                                {hoveredAction === 'clear' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                                    >
                                        <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1">
                                            Usuń Ulubione
                                        </p>
                                        <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                                            Odznacza wszystkie zapisane ulubione modele.
                                        </p>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <div className="relative">
                            <button
                                onClick={handleSaveModels}
                                disabled={isSaving || favoriteModelIds.length === 0}
                                onMouseEnter={() => setHoveredAction('save')}
                                onMouseLeave={() => setHoveredAction(null)}
                                className="ml-2 px-4 py-2 bg-gold-primary text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                                <Save size={12} />
                                {isSaving ? 'ZAPISUJ...' : 'ZAPISZ'}
                            </button>
                            <AnimatePresence>
                                {hoveredAction === 'save' && !(isSaving || favoriteModelIds.length === 0) && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                                    >
                                        <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                                            Zapisz Zmiany
                                        </p>
                                        <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                                            Zapisuje wybrane modele do Twojego profilu (max 20).
                                        </p>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
    
                        <div className="relative">
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('prawnik_models_updated'));
                                    refreshHealth();
                                }}
                                onMouseEnter={() => setHoveredAction('refresh')}
                                onMouseLeave={() => setHoveredAction(null)}
                                className={cn("ml-2 p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all", isHealthLoading && "animate-spin")}
                            >
                                <RotateCcw size={12} />
                            </button>
                            <AnimatePresence>
                                {hoveredAction === 'refresh' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                        className="absolute top-full right-0 mt-2 w-48 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                                    >
                                        <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                                            Odśwież statusy i ping serwerów
                                        </p>
                                        <div className="absolute bottom-full right-4 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
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
                    <div className="flex flex-wrap gap-1.5 max-h-30 overflow-y-auto no-scrollbar pr-1">
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
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">
                  Dopasuj model sztucznej inteligencji do konkretnego zadania w systemie
                </span>
                <div className="flex items-center gap-3">
                  {successMsg && (
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{successMsg}</span>
                  )}
                  <button
                    onClick={handleSaveAssignments}
                    disabled={savingAssignments}
                    className="px-4 py-2 bg-gold-primary text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                  >
                    <Save size={12} />
                    {savingAssignments ? 'ZAPISYWANIE...' : 'ZAPISZ PRZYPISANIA'}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* MODEL GRID Area */}
      {activeSubTab === 'favorites' ? (
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
                            <ModelMiniTile 
                                key={m.id} 
                                model={m} 
                                isFavorite={true} 
                                onToggle={() => toggleFavoriteModel(m.id)} 
                                health={healthData[m.id]}
                            />
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
                                    health={healthData[m.id]}
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
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white/10 animate-fadeIn">
          {loadingAssignments ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="animate-spin text-gold-primary" size={28} />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 animate-pulse font-outfit">Wczytywanie przypisań...</span>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {[
                {
                  id: 'embedding',
                  label: 'Model Embeddingów (Embedding Model)',
                  desc: 'Służy do wektoryzacji i indeksowania dokumentów oraz zapytań użytkownika w RAG. Zalecany model to openai/text-embedding-3-small (1536 wymiarów). Ostrzeżenie: wymiarowość wektorów wybranego modelu musi być zgodna z bazą danych (1536d dla bazy użytkownika).',
                },
                {
                  id: 'ocr',
                  label: 'Model OCR / Wizyjny (OCR / Vision Model)',
                  desc: 'Odpowiedzialny za dokładną analizę i odczytywanie tekstu ze skanów dokumentów i plików graficznych. Wymaga modelu z obsługą multimodalną (Vision).',
                },
                {
                  id: 'judge',
                  label: 'Model Sędziego MoA (MoA Judge Model)',
                  desc: 'Główny model orkiestrujący, który analizuje debaty ekspertów, weryfikuje fakty i przygotowuje końcową syntezę dla klienta.',
                },
                {
                  id: 'drafter',
                  label: 'Model do Pism i Draftów (Drafter Model)',
                  desc: 'Specjalizuje się w precyzyjnym pisaniu dokumentów procesowych, opinii prawnych, umów oraz pism procesowych.',
                },
                {
                  id: 'fast',
                  label: 'Domyślny Szybki Model (Default Fast Model)',
                  desc: 'Wykorzystywany do prostych zadań, szybkiej ekstrakcji metadanych oraz weryfikacji w CitationGuard w celu skrócenia czasu oczekiwania.',
                },
                {
                  id: 'long_context',
                  label: 'Model Długiego Kontekstu (Long Context Model)',
                  desc: 'Przeznaczony do analizy bardzo długich dokumentów, które mieszczą się w całości w oknie kontekstowym bez dzielenia ich na fragmenty.',
                },
                {
                  id: 'query_planner',
                  label: 'Model Plannera Zapytań (Query Planner Model)',
                  desc: 'Analizuje zapytanie klienta i decyduje, jakie zapytania RAG oraz integracje zewnętrzne (np. SAOS/ELI) powinny zostać uruchomione.',
                },
                {
                  id: 'retrieval',
                  label: 'Model Uściślania Zapytań (Search Refinement Model)',
                  desc: 'Odpowiedzialny za optymalizację i wyodrębnianie precyzyjnych słów kluczowych do wyszukiwarek orzecznictwa i aktów prawnych.',
                },
              ].map((func) => (
                <div key={func.id} className="bg-black/30 border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-white">
                        {func.label}
                      </span>
                      <p className="text-[9px] text-white/50 leading-relaxed font-medium">
                        {func.desc}
                      </p>
                    </div>
                    <div className="w-full md:w-80 shrink-0">
                      <select
                        value={assignedModels[func.id] || ''}
                        onChange={(e) => setAssignedModel(func.id, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-gold-primary/50 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white outline-none transition-all cursor-pointer"
                      >
                        <option value="" className="bg-[#0b0c10] text-white/30">
                          {sortedModelsForSelect.length === 0 ? '(Brak modeli w Twojej puli - wybierz w zakładce Ulubione)' : 'Wybierz model z Twojej puli (do 20)...'}
                        </option>
                        {sortedModelsForSelect.map((model) => {
                          const assignedRole = Object.entries(assignedModels || {}).find(([rId, mId]) => mId === model.id && rId !== func.id)?.[0];
                          const isAssignedToOther = !!assignedRole;
                          
                          // Funkcja pomocnicza do mapowania ID roli na czytelną etykietę (uproszczona)
                          const getRoleLabel = (rId: string) => {
                            const labels: Record<string, string> = {
                              'embedding': 'Embedding', 'ocr': 'OCR', 'judge': 'Sędzia', 'drafter': 'Pisma', 
                              'fast': 'Szybki', 'long_context': 'Długi Kontekst', 'query_planner': 'Planner', 'retrieval': 'Wyszukiwanie'
                            };
                            return labels[rId] || rId;
                          };

                          return (
                            <option 
                              key={model.id} 
                              value={model.id} 
                              className="bg-[#0b0c10] text-white"
                              disabled={isAssignedToOther}
                            >
                              {model.name} ({model.id}) {isAssignedToOther ? `(przypisany: ${getRoleLabel(assignedRole)})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelMiniTile({ model, isFavorite, onToggle, health }: { model: OrchestratorModel, isFavorite: boolean, onToggle: () => void, health?: ModelHealth }) {
  const brand = getBrand(model.provider || (model.id.includes('/') ? model.id.split('/')[0] : 'unknown'));
  const cleanName = model.name.includes(':') ? model.name.split(':').slice(1).join(':').trim() : model.name;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'group flex items-center gap-4 p-4 px-6 rounded-2xl border relative overflow-hidden min-h-16 h-auto w-full text-left transition-none no-shimmer',
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
        <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[7px] text-white/20 font-bold uppercase tracking-widest">{(model.provider || (model.id.includes('/') ? model.id.split('/')[0] : 'unknown')).toUpperCase()}</span>
            {health && (
                <div className="flex items-center gap-1.5 ml-1">
                    <div className={cn(
                        "w-1 h-1 rounded-full", 
                        health.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                        health.status === 'degraded' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                        "bg-red-500"
                    )} />
                    <span className={cn(
                        "text-[6px] font-black tracking-tighter transition-colors", 
                        health.status === 'online' ? "text-emerald-500/80" : 
                        health.status === 'degraded' ? "text-amber-500/80" :
                        "text-red-500/80"
                    )}>
                        {health.status === 'online' ? `${health.latency_ms}ms` : 
                         health.status === 'degraded' ? `${health.latency_ms}ms*` : 
                         'OFFLINE'}
                    </span>
                    {health.status === 'online' && health.latency_ms < 1000 && (
                        <Zap size={8} className="text-gold-primary animate-pulse ml-0.5" />
                    )}
                </div>
            )}
        </div>
      </div>

      {isFavorite && (
          <div className={cn("shrink-0 ml-1 z-10 p-1.5 rounded-full bg-white/10", brand.color)}>
              <Star size={10} fill="currentColor" />
          </div>
      )}
    </button>
  );
}
