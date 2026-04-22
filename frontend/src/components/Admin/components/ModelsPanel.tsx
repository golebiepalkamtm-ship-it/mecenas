import { useMemo, useState, useEffect } from "react";
import { Search, Zap, Cpu, Trash2, Star, Layers, Activity, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import { useModels, readEnabledModels, saveEnabledModels, type Model } from "../../../hooks/useConfig";
import { useModelHealth } from "../../../hooks/useModelHealth";
import { useChatSettingsStore } from "../../../store/useChatSettingsStore";
import { ModelTile } from "./ModelTile";

const VENDORS = ['WSZYSCY', 'GOOGLE', 'OPENAI', 'ANTHROPIC', 'META', 'MISTRAL', 'DEEPSEEK', 'COHERE', 'MICROSOFT', 'PERPLEXITY', 'STABILITY', 'UPSTAGE', 'X-AI'];
const CATEGORIES = ['WSZYSTKIE', 'WIZJA', 'TANIE', 'SZYBKIE', 'MOCNE', 'LOGIKA'];

export function ModelsPanel({ activeProviders = [] }: { activeProviders?: string[] }) {
  const { data: allModels = [], isLoading: isModelsLoading } = useModels();
  const [enabledModels, setEnabledModels] = useState<string[]>(() => readEnabledModels());
  const [query, setQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState('WSZYSCY');
  const [selectedCategory, setSelectedCategory] = useState('WSZYSTKIE');
  const { healthData, refreshHealth, isLoading: isHealthLoading, latencies } = useModelHealth();


  // Sync with localStorage across tabs and events
  useEffect(() => {
    const sync = () => {
      const next = readEnabledModels();
      setEnabledModels(next);
    };

    window.addEventListener('prawnik_models_updated', sync);
    window.addEventListener('storage', (e) => {
      if (e.key === 'prawnik_enabled_models') sync();
    });

    return () => {
      window.removeEventListener('prawnik_models_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleModel = (modelId: string): void => {
    const next = enabledModels.includes(modelId)
      ? enabledModels.filter((id) => id !== modelId)
      : [...enabledModels, modelId];

    setEnabledModels(next);
    saveEnabledModels(next);
  };

  const clearAllModels = (): void => {
    console.log("Forcing clear of all enabled models...");
    // Clear all possible keys that might store selection
    const keys = ['prawnik_enabled_models', 'lexmind_enabled_models', 'enabled_models'];
    keys.forEach(k => window.localStorage.removeItem(k));

    // Reset local state
    setEnabledModels([]);

    // Update via official helper
    saveEnabledModels([]);

    // Force event
    window.dispatchEvent(new CustomEvent('prawnik_models_updated'));

    // Final safety check
    setTimeout(() => {
      const check = readEnabledModels();
      if (check.length > 0) {
        console.warn("Selection still present after clear! Forcing empty array.");
        window.localStorage.setItem('prawnik_enabled_models', '[]');
        setEnabledModels([]);
      }
    }, 100);
  };

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allModels.filter((model) => {
      const searchable = `${model.name} ${model.id} ${model.provider}`.toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;

      if (selectedVendor !== 'WSZYSCY') {
        const provider = (model.provider || '').toLowerCase();
        const vendorMap: Record<string, string> = {
          'GOOGLE': 'google',
          'OPENAI': 'openai',
          'ANTHROPIC': 'anthropic',
          'META': 'meta',
          'MISTRAL': 'mistral',
          'DEEPSEEK': 'deepseek',
          'COHERE': 'cohere',
          'MICROSOFT': 'microsoft',
          'PERPLEXITY': 'perplexity',
          'STABILITY': 'stability',
          'UPSTAGE': 'upstage',
          'X-AI': 'x-ai'
        };
        const target = vendorMap[selectedVendor];
        if (target && !provider.includes(target)) return false;
      }

      if (selectedCategory !== 'WSZYSTKIE') {
        if (selectedCategory === 'WIZJA' && !model.vision) return false;
        if (selectedCategory === 'TANIE') {
          const price = parseFloat(model.pricing?.prompt || '1.0');
          if (price * 1000000 > 1.0) return false;
        }
        if (selectedCategory === 'SZYBKIE') {
          const latency = latencies[model.id];
          if (!latency || latency > 1500) return false;
        }
        if (selectedCategory === 'MOCNE') {
          const lowQuality = /haiku|flash|mini|small|lite|tiny|7b/i;
          if (lowQuality.test(model.id) || lowQuality.test(model.name)) return false;
        }
        if (selectedCategory === 'LOGIKA') {
          const logical = /gpt-4|claude-3-5-sonnet|claude-3-opus|gemini-1.5-pro/i;
          if (!logical.test(model.id) && !logical.test(model.name)) return false;
        }
      }

      // FILTER BY ACTIVE API PROVIDERS
      const provider = (model.provider || '').toLowerCase();

      // Normalize common providers to match Security Panel IDs
      let normalizedProviderId = provider;
      if (provider.includes('google')) normalizedProviderId = 'google';
      else if (provider.includes('openai')) normalizedProviderId = 'openai';
      else if (provider.includes('anthropic')) normalizedProviderId = 'anthropic';
      else if (provider.includes('mistral')) normalizedProviderId = 'mistral';
      else if (provider.includes('meta')) normalizedProviderId = 'meta';
      else if (provider.includes('deepseek')) normalizedProviderId = 'deepseek';
      else if (provider.includes('perplexity')) normalizedProviderId = 'perplexity';
      else if (provider.includes('openrouter')) normalizedProviderId = 'openrouter';
      else if (provider.includes('mindee')) normalizedProviderId = 'mindee';
      else if (provider.includes('cohere')) normalizedProviderId = 'cohere';
      else if (provider.includes('microsoft')) normalizedProviderId = 'microsoft';
      else if (provider.includes('stability')) normalizedProviderId = 'stability';
      else if (provider.includes('upstage')) normalizedProviderId = 'upstage';
      else if (provider.includes('x-ai')) normalizedProviderId = 'x-ai';

      const isVisibleThroughDirect = activeProviders.includes(normalizedProviderId);
      const isVisibleThroughOpenRouter = activeProviders.includes('openrouter');

      if (!isVisibleThroughDirect && !isVisibleThroughOpenRouter) {
        return false;
      }

      return true;
    });
  }, [allModels, query, selectedVendor, selectedCategory, latencies, activeProviders]);

  const modelPings = useChatSettingsStore(s => s.modelLatencies);

  const modelsByProvider = useMemo(() => {
    const groups: Record<string, Model[]> = {};

    visibleModels.forEach(model => {
      let provider = (model.provider || 'INNE').toUpperCase();
      // Normalize common providers
      if (provider.includes('GOOGLE')) provider = 'GOOGLE';
      if (provider.includes('OPENAI')) provider = 'OPENAI';
      if (provider.includes('ANTHROPIC')) provider = 'ANTHROPIC';
      if (provider.includes('META')) provider = 'META';
      if (provider.includes('MISTRAL')) provider = 'MISTRAL';
      if (provider.includes('DEEPSEEK')) provider = 'DEEPSEEK';

      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(model);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Pin major providers to top
      const priority = ['GOOGLE', 'OPENAI', 'ANTHROPIC', 'META'];
      const aIdx = priority.indexOf(a);
      const bIdx = priority.indexOf(b);

      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;

      return a.localeCompare(b);
    });

    return sortedKeys.map(key => ({
      name: key,
      models: groups[key].sort((a, b) => a.name.localeCompare(b.name))
    }));
  }, [visibleModels]);

  const totalEnabled = enabledModels.length;

  const renderSection = (title: string, models: Model[]) => (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-prestige rounded-2xl p-3 border border-white/40 bg-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.05),inset_0_1px_4px_rgba(255,255,255,0.8)] space-y-1"
    >
      <div className="flex items-center gap-4 px-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-gold-primary font-black uppercase tracking-[0.3em] mb-1">Dostawca</span>
          <h3 className="text-xl font-black text-black uppercase italic font-outfit tracking-tighter">{title}</h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-black/10 to-transparent ml-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-1.5 px-1">
        <AnimatePresence mode="popLayout">
          {models.map(model => (
            <motion.div
              key={model.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <ModelTile
                model={model}
                isEnabled={enabledModels.includes(model.id)}
                latency={modelPings[model.id]}
                health={healthData[model.id]}
                onToggle={() => toggleModel(model.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-transparent text-black p-2 space-y-1 custom-scrollbar overflow-y-auto pb-64">
      {/* HEADER SECTION - ULTRA PREMIUM */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-prestige rounded-2xl p-4 border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.1),inset_0_1px_5px_rgba(255,255,255,0.9)] relative overflow-hidden group"
      >
        <div className="liquid-caustics opacity-50" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gold-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="absolute top-0 right-0 p-8 flex flex-col items-end gap-4">
          <div className="flex items-center gap-3 glass-prestige px-2 py-2 rounded-[1.5rem] border border-black/5 shadow-xl bg-white/20">
            <div className="flex items-center gap-3 px-6 py-3 bg-white/40 rounded-[1.2rem] border border-black/5 shadow-inner">
              <Star size={16} className="text-gold-primary" fill="currentColor" />
              <div className="flex flex-col">
                <span className="text-[15px] font-black italic text-black leading-none tabular-nums">
                  {totalEnabled} <span className="text-black/40 text-[10px] not-italic ml-1">/ 20</span>
                </span>
                <span className="text-[7px] text-black/60 font-black uppercase tracking-widest mt-1">Aktywne modele</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearAllModels}
                className="px-4 py-3 glass-prestige bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all duration-500 rounded-[1rem] border border-red-500/30 shadow-sm flex items-center gap-2"
                title="WYCZYŚĆ WSZYSTKIE"
              >
                <Trash2 size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Wyczyść wybór</span>
              </button>
              <button
                onClick={() => refreshHealth()}
                className={cn(
                  "p-3 glass-prestige bg-white/40 text-black/40 hover:bg-gold-primary hover:text-black transition-all duration-500 rounded-[1rem] border border-white/60 shadow-sm",
                  isHealthLoading && "animate-spin text-gold-primary"
                )}
                title="ODŚWIEŻ STATUSY"
              >
                <Activity size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -5 }}
              className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-gold-primary via-gold-dark to-black border border-gold-primary/50 flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.2)] relative"
            >
              <div className="absolute inset-0 bg-gold-primary/20 blur-xl rounded-full" />
              <Cpu size={32} className="text-[#1a1c20] relative z-10" strokeWidth={2.5} />
            </motion.div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-black flex items-center gap-3">
                ARSENAŁ <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-primary to-gold-light">INTELIGENCJI</span>
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-black/40 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                  <Layers size={12} className="text-gold-primary" />
                  KWANTOWY SYSTEM ZARZĄDZANIA MODELAMI LEXMIND
                </p>
              </div>
            </div>
          </div>

          {/* SEARCH BAR - THE "APPLE" STYLE */}
          <div className="relative group max-w-2xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold-primary/0 via-gold-primary/20 to-gold-primary/0 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
            <div className="relative flex items-center">
              <Search size={20} className="absolute left-6 text-black/10 group-focus-within:text-gold-primary transition-all duration-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SZUKAJ PO NAZWIE, DOSTAWCY LUB CECHACH..."
                className="w-full h-14 rounded-xl bg-white/20 border border-black/5 focus:border-gold-primary/30 px-16 text-sm font-black tracking-tight text-black placeholder:text-black/10 outline-none shadow-xl transition-all duration-500 focus:bg-white/40 ring-0"
              />
            </div>
          </div>

          {/* FILTERS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <span className="text-[10px] text-black/60 font-black uppercase tracking-[0.3em] ml-2">Dostawcy</span>
              <div className="glass-prestige p-4 rounded-[2rem] bg-black/5 border border-black/10 flex flex-wrap gap-2.5 shadow-inner">
                {VENDORS.map(vendor => (
                  <button
                    key={vendor}
                    onClick={() => setSelectedVendor(vendor)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border relative overflow-hidden",
                      selectedVendor === vendor
                        ? "bg-gold-primary text-black border-gold-primary shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-105"
                        : "bg-white/10 border-white/40 text-black/60 hover:text-black hover:bg-white/20"
                    )}
                  >
                    {vendor}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <span className="text-[10px] text-black/60 font-black uppercase tracking-[0.3em] ml-2">Specjalizacje</span>
              <div className="glass-prestige p-4 rounded-[2rem] bg-black/5 border border-black/10 flex flex-wrap gap-2.5 shadow-inner">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border flex items-center gap-2.5",
                      selectedCategory === cat
                        ? "bg-black text-white border-black shadow-[0_10px_20px_rgba(0,0,0,0.15)] scale-105"
                        : "bg-white/10 border-white/40 text-black/60 hover:text-emerald-600 hover:border-emerald-600/30 hover:bg-emerald-600/5"
                    )}
                  >
                    {cat === 'WIZJA' && <Zap size={14} />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MODEL GROUPS */}
      <div className="space-y-1">
        {isModelsLoading ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-16 h-16 border-4 border-gold-primary/20 border-t-gold-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {modelsByProvider.map(group => (
              renderSection(group.name, group.models)
            ))}

            {modelsByProvider.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-40 flex flex-col items-center justify-center text-center px-4"
              >
                <div className="w-20 h-20 rounded-3xl bg-gold-primary/5 border border-gold-primary/10 flex items-center justify-center text-gold-primary mb-8 animate-pulse shadow-2xl">
                  <Shield size={40} className="opacity-40" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-[0.4em] italic text-black/80">Odmowa Dostępu</h3>
                <p className="text-[11px] font-bold text-black/30 uppercase tracking-[0.3em] mt-6 max-w-lg leading-relaxed">
                  Skonfiguruj i aktywuj klucze API dla wybranych dostawców w zakładce <span className="text-gold-primary">"Klucze API"</span>.
                  System automatycznie aktywuje "Arsenał Inteligencji" po wykryciu poprawnego połączenia.
                </p>
                <div className="mt-10 flex gap-4">
                  <div className="px-5 py-2 rounded-xl bg-black/5 border border-black/5 text-[9px] font-black uppercase tracking-widest text-black/40">Status: Oczekiwanie na Konfigurację</div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
