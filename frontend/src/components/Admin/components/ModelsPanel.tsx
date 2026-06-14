import { useMemo, useState, useEffect } from "react";
import { Search, Zap, Cpu, Trash2, Activity, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import { useModels, readEnabledModels, saveEnabledModels, type Model } from "../../../hooks/useConfig";
import { useModelHealth } from "../../../hooks/useModelHealth";
import { useChatSettingsStore } from "../../../store/useChatSettingsStore";
import { getAdminModelGroupName } from "../../../utils/modelSource";
import { ModelTile } from "./ModelTile";
import { API_BASE } from "../../../config";

const VENDORS = ['WSZYSCY', 'GOOGLE', 'OPENAI', 'ANTHROPIC', 'META', 'MISTRAL', 'DEEPSEEK', 'COHERE', 'MICROSOFT', 'PERPLEXITY', 'STABILITY', 'UPSTAGE', 'X-AI'];
const CATEGORIES = ['WSZYSTKIE', 'DARMOWE', 'LOGIKA', 'SZYBKOŚĆ', 'KODOWANIE', 'WIZJA', 'MOCNE'];

export function ModelsPanel({ embedded = false }: { embedded?: boolean }) {
  const { data: allModels = [], isLoading: isModelsLoading } = useModels();
  const [enabledModels, setEnabledModels] = useState<string[]>(() => readEnabledModels());
  const [query, setQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState('WSZYSCY');
  const [selectedCategory, setSelectedCategory] = useState('WSZYSTKIE');
  const { healthData, refreshHealth, isLoading: isHealthLoading, latencies } = useModelHealth();


  // Load initially enabled models from backend database
  useEffect(() => {
    async function loadSelectedModels() {
      try {
        const res = await fetch(`${API_BASE}/models/admin/selected`);
        if (res.ok) {
          const data = await res.json();
          if (data.selected_models && Array.isArray(data.selected_models)) {
            setEnabledModels(data.selected_models);
            saveEnabledModels(data.selected_models);
          }
        }
      } catch (err) {
        console.error("Failed to load selected models from backend:", err);
      }
    }
    loadSelectedModels();
  }, []);

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

  const toggleModel = async (modelId: string): Promise<void> => {
    const next = enabledModels.includes(modelId)
      ? enabledModels.filter((id) => id !== modelId)
      : [...enabledModels, modelId];

    setEnabledModels(next);
    saveEnabledModels(next);

    // Sync to backend database
    try {
      await fetch(`${API_BASE}/models/admin/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_model_ids: next })
      });
    } catch (err) {
      console.error("Failed to save selected models to backend:", err);
    }
  };

  const clearAllModels = async (): Promise<void> => {
    console.log("Forcing clear of all enabled models...");
    // Clear all possible keys that might store selection
    const keys = ['prawnik_enabled_models', 'lexmind_enabled_models', 'enabled_models'];
    keys.forEach(k => window.localStorage.removeItem(k));

    // Reset local state
    setEnabledModels([]);

    // Update via official helper
    saveEnabledModels([]);

    // Sync empty list to backend database
    try {
      await fetch(`${API_BASE}/models/admin/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_model_ids: [] })
      });
    } catch (err) {
      console.error("Failed to clear selected models on backend:", err);
    }

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
        if (selectedCategory === 'DARMOWE') {
          if (!model.free) return false;
        }
        if (selectedCategory === 'SZYBKOŚĆ') {
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

      return true;
    });
  }, [allModels, query, selectedVendor, selectedCategory, latencies]);

  const modelPings = useChatSettingsStore(s => s.modelLatencies);

  const modelsByProvider = useMemo(() => {
    const groups: Record<string, Model[]> = {};

    visibleModels.forEach(model => {
      const provider = getAdminModelGroupName(model);

      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(model);
    });

      const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Pin API-level groupings to the top.
      const priority = ['GOOGLE API', 'GOOGLE / OPENROUTER', 'OPENAI', 'ANTHROPIC', 'META'];
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
      className="library-view-panel p-3 space-y-1"
    >
      <div className="flex items-center gap-4 px-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-gold-primary font-black uppercase tracking-[0.3em] mb-1">Dostawca</span>
          <h3 className="text-xl font-black text-black uppercase italic font-outfit tracking-tighter">{title}</h3>
        </div>
        <div className="flex-1 h-px bg-linear-to-r from-black/10 to-transparent ml-4" />
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
    <div className={cn('space-y-3 text-black', !embedded && 'min-h-screen pb-64')}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="library-view-panel p-4 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl border border-gold-primary/35 bg-gradient-to-br from-gold-bright to-gold-deep flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(180,120,40,0.25)]">
              <Cpu size={22} className="text-[#1a1208]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-admin-mono font-semibold text-black tabular-nums">
                {totalEnabled}
                <span className="text-black/40 text-[10px] font-outfit font-black not-italic ml-1.5 uppercase tracking-widest">
                  aktywnych
                </span>
              </p>
              <p className="library-view-label mt-0.5 not-italic">Mapa modeli OpenRouter</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={clearAllModels}
              className="px-3 py-2 library-view-cell text-red-700 hover:bg-red-600 hover:text-white hover:border-red-500/40 transition-all flex items-center gap-2"
              title="Wyczyść wszystkie"
            >
              <Trash2 size={14} />
              <span className="text-[8px] font-black uppercase tracking-widest font-outfit">Wyczyść</span>
            </button>
            <button
              type="button"
              onClick={() => refreshHealth()}
              className={cn(
                'p-2.5 library-view-cell text-black/50 hover:border-gold-primary/35 hover:text-gold-deep transition-all',
                isHealthLoading && 'animate-spin text-gold-primary',
              )}
              title="Odśwież statusy"
            >
              <Activity size={18} />
            </button>
          </div>
        </div>

        <div className="relative group max-w-2xl mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-gold-deep transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po nazwie, dostawcy lub cechach…"
            className="w-full h-11 library-view-cell pl-11 pr-4 text-[11px] font-outfit font-semibold text-black placeholder:text-black/20 outline-none focus:border-gold-primary/40"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="library-view-label ml-1 not-italic">Dostawcy</span>
            <div className="library-view-cell p-3 flex flex-wrap gap-2">
              {VENDORS.map((vendor) => (
                <button
                  key={vendor}
                  type="button"
                  onClick={() => setSelectedVendor(vendor)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border font-outfit',
                    selectedVendor === vendor
                      ? 'bg-gold-primary text-black border-gold-deep/50 shadow-[0_4px_16px_rgba(180,120,40,0.3)]'
                      : 'bg-white/40 border-black/8 text-black/55 hover:text-black',
                  )}
                >
                  {vendor}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="library-view-label ml-1 not-italic">Specjalizacje</span>
            <div className="library-view-cell p-3 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 font-outfit',
                    selectedCategory === cat
                      ? 'bg-black text-gold-bright border-black/80'
                      : 'bg-white/40 border-black/8 text-black/55 hover:border-emerald-600/25',
                  )}
                >
                  {cat === 'WIZJA' && <Zap size={12} />}
                  {cat}
                </button>
              ))}
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
                <h3 className="font-profile-display text-2xl font-semibold italic text-black/80">Brak modeli</h3>
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
