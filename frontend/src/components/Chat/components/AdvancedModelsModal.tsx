import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Cpu, Eye, Zap, Shield, Gavel, FileText, Compass, RotateCcw, Sliders, ExternalLink } from 'lucide-react';
import { useModels, readEnabledModels, type Model } from '../../../hooks/useConfig';
import { useAssignedModelsState, useFavoriteModelsState, useSettingsNavigationState } from '../../../hooks/chatSettingsSelectors';
import { cn } from '../../../utils/cn';
import { getBrand, normalizeVendor } from '../constants';

interface AdvancedModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModelRoleDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  tag: string;
  iconColor: string;
  badgeBg: string;
  isModelRecommended: (model: Model) => boolean;
}

const MODEL_ROLES: ModelRoleDef[] = [
  {
    id: 'ocr',
    name: 'Model OCR / Wizyjny',
    description: 'Odczytywanie i analiza tekstu ze skanów dokumentów, załączników PDF i zdjęć dowodowych.',
    icon: Eye,
    tag: 'Wizja / Vision',
    iconColor: 'text-sky-500',
    badgeBg: 'bg-sky-500/15 border-sky-400/35 shadow-[0_0_12px_rgba(14,165,233,0.25)] text-sky-500',
    isModelRecommended: (m) => !!m.vision || /vision|flash|gpt-4o|claude-3/i.test(m.id),
  },
  {
    id: 'query_planner',
    name: 'Planner Zapytań i Wyszukiwania',
    description: 'Analiza zapytania, wybór źródeł (SAOS/ISAP) i precyzyjny podział na frazy kluczowe.',
    icon: Compass,
    tag: 'Szybki / Logiczny',
    iconColor: 'text-orange-500',
    badgeBg: 'bg-orange-500/15 border-orange-400/35 shadow-[0_0_12px_rgba(249,115,22,0.25)] text-orange-500',
    isModelRecommended: (m) => /flash|mini|nano|turbo/i.test(m.id),
  },
  {
    id: 'judge',
    name: 'Sędzia MoA / Główny Syntezator',
    description: 'Nadzoruje debatę ekspertów, weryfikuje fakty i przygotowuje końcową opinię prawną.',
    icon: Gavel,
    tag: 'Głęboka Logika',
    iconColor: 'text-amber-800',
    badgeBg: 'bg-amber-800/15 border-amber-800/35 shadow-[0_0_12px_rgba(146,64,15,0.25)] text-amber-800',
    isModelRecommended: (m) => /gpt-4|claude-3|gemini-2.5-pro|deepseek-r1|qwen3.8-max|reason/i.test(m.id),
  },
  {
    id: 'drafter',
    name: 'Pisma Procesowe (Drafter)',
    description: 'Formatowanie pozwów, apelacji, umów i oficjalnych pism procesowych.',
    icon: FileText,
    tag: 'Precyzja Językowa',
    iconColor: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/15 border-emerald-400/35 shadow-[0_0_12px_rgba(16,185,129,0.25)] text-emerald-500',
    isModelRecommended: (m) => /claude|grok|gpt-4o|qwen/i.test(m.id),
  },
  {
    id: 'fast',
    name: 'Szybki Model Pomocniczy',
    description: 'Weryfikacja cytowań (CitationGuard), ekstrakcja metadanych i scoring.',
    icon: Zap,
    tag: 'Niska Latencja',
    iconColor: 'text-yellow-600',
    badgeBg: 'bg-yellow-500/15 border-yellow-400/35 shadow-[0_0_12px_rgba(234,179,8,0.25)] text-yellow-600',
    isModelRecommended: (m) => /flash|mini|haiku|speed/i.test(m.id),
  },
  {
    id: 'long_context',
    name: 'Model Długiego Kontekstu',
    description: 'Analiza obszernych akt spraw, umów i wielostronicowych dokumentów.',
    icon: Shield,
    tag: 'Duże Okno Kontekstu',
    iconColor: 'text-indigo-500',
    badgeBg: 'bg-indigo-500/15 border-indigo-400/35 shadow-[0_0_12px_rgba(99,102,241,0.25)] text-indigo-500',
    isModelRecommended: (m) => (m.context_length ? m.context_length >= 120000 : false) || /long|128k|200k|1m|pro/i.test(m.id),
  },
];

export const AdvancedModelsModal: React.FC<AdvancedModelsModalProps> = ({ isOpen, onClose }) => {
  const { data: rawModels = [] } = useModels();
  const { favoriteModels } = useFavoriteModelsState();
  const { assignedModels, setAssignedModel, setAssignedModels } = useAssignedModelsState();
  const { setSettingsTab } = useSettingsNavigationState();

  // Pula modeli użytkownika: wyłącznie modele z favoriteModels (do 20).
  const userAvailableModels = useMemo(() => {
    const adminEnabled = readEnabledModels();
    
    if (favoriteModels && favoriteModels.length > 0) {
      const favSet = new Set(favoriteModels);
      return rawModels
        .filter((m) => favSet.has(m.id) && (adminEnabled.length === 0 || adminEnabled.includes(m.id)))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (adminEnabled.length > 0) {
      const adminSet = new Set(adminEnabled);
      return rawModels
        .filter((m) => adminSet.has(m.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return [...rawModels].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawModels, favoriteModels]);

  const handleOpenSettings = () => {
    onClose();
    setSettingsTab('Modele AI');
    window.location.hash = '#/settings';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex flex-col pointer-events-none p-1 md:p-1.5 lg:p-2 text-black">
        {/* Niewidoczne tło */}
        <div 
          className="absolute inset-0 pointer-events-auto" 
          onClick={onClose} 
          aria-hidden="true" 
        />
        <motion.div
          initial={{ y: '100%', opacity: 0.1 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="relative w-full h-full flex flex-col glass-liquid-convex rounded-3xl select-none overflow-hidden pointer-events-auto text-[#1d1d1f] border-t-[3.5px] border-t-white border-l-[3px] border-l-white/90 border-r border-r-black/25 border-b-[3.5px] border-b-black/35 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
        >
          {/* Header */}
          <div className="shrink-0 px-6 py-5 border-b border-black/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl btn-convex-prestige active flex items-center justify-center shadow-lg text-amber-500">
                  <Sliders size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[12px] md:text-[13px] font-black uppercase tracking-[0.2em] text-black italic font-outfit">
                      Przypisania Modeli
                    </h3>
                    <span className="shrink-0 text-[7px] font-bold tracking-widest uppercase bg-gold-primary/20 text-black px-2 py-0.5 rounded-lg border border-gold-primary/30">
                      PULA: {userAvailableModels.length} / 20
                    </span>
                  </div>
                  <p className="text-[7px] text-black/60 font-bold uppercase tracking-widest">
                    Wybór taktyki i silników AI dla ról
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenSettings}
                  className="px-3.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider text-black btn-convex-prestige flex items-center gap-1.5 cursor-pointer"
                  title="Przejdź do konfiguracji do 20 modeli w Ustawieniach"
                >
                  <Cpu size={12} className="text-amber-600" />
                  <span>Edytuj pulę (20)</span>
                  <ExternalLink size={10} className="text-black/60" />
                </button>

                <button
                  onClick={() => setAssignedModels({})}
                  className="px-3.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider text-black/70 hover:text-black btn-convex-prestige flex items-center gap-1.5 cursor-pointer"
                  title="Wyczyść wszystkie przypisania i użyj głównego modelu"
                >
                  <RotateCcw size={11} className="text-black/60" />
                  <span>Domyślne</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl flex items-center justify-center transition-all btn-convex-prestige text-black/60 hover:text-black cursor-pointer ml-1"
                  aria-label="Zamknij"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-3 custom-scrollbar">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-amber-500" /> Zespół Ról Procesowych ({MODEL_ROLES.length})
            </h4>

            {userAvailableModels.length === 0 ? (
              <div className="py-6 text-center glass-liquid-convex rounded-2xl px-4 border border-black/10 space-y-2 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-black/40">
                  Brak wybranych modeli w profilu.
                </p>
                <button
                  onClick={handleOpenSettings}
                  className="prestige-panel-action px-5 py-2 rounded-xl text-black text-[9px] font-black uppercase tracking-widest mt-2"
                >
                  Wybierz 20 modeli
                </button>
              </div>
            ) : (
              MODEL_ROLES.map((role) => {
                const RoleIcon = role.icon;
                const selectedModelId = assignedModels[role.id] || '';
                const recommendedModels = userAvailableModels.filter(role.isModelRecommended);
                const isAssigned = !!selectedModelId;

                return (
                  /* Wypukły kontener 3D z kolorową ikoną w wypukłej ramce */
                  <div
                    key={role.id}
                    className={cn(
                      "group p-3.5 rounded-2xl transition-all duration-300 w-full space-y-2.5 btn-convex-prestige cursor-pointer text-left",
                      isAssigned && "active scale-[1.006]"
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Kolorowa wypukła ramka z nasyconą ikoną */}
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all relative overflow-hidden",
                          "border-t-2 border-t-white/80 border-l-[1.5px] border-l-white/60 border-r-[1.5px] border-r-black/20 border-b-2 border-b-black/40",
                          "shadow-[0_4px_10px_rgba(0,0,0,0.2)]",
                          role.badgeBg,
                          isAssigned && "scale-[1.05] shadow-[0_6px_14px_rgba(0,0,0,0.3)] ring-1 ring-black/10"
                        )}>
                          {isAssigned && <div className="absolute inset-0 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />}
                          <RoleIcon size={19} className={role.iconColor} style={{ color: 'currentColor' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider truncate font-outfit",
                              isAssigned ? "text-black" : "text-black/90"
                            )}>
                              {role.name}
                            </span>
                            <span className="shrink-0 text-[7px] font-bold tracking-widest uppercase bg-gold-primary/20 text-black px-2 py-0.5 rounded-md border border-gold-primary/30">
                              {role.tag}
                            </span>
                            {isAssigned && (
                              <span className="shrink-0 text-[7px] font-bold tracking-widest uppercase bg-gold-primary/25 text-black px-2 py-0.5 rounded-md border border-gold-primary/35">
                                AKTYWNA
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-black/60 font-bold mt-0.5 leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </div>

                      {/* Dropdown Selector */}
                      <div className="w-full md:w-80 shrink-0">
                        <select
                          value={selectedModelId}
                          onChange={(e) => setAssignedModel(role.id, e.target.value)}
                          className="w-full bg-white/95 border-t-2 border-t-white border-l-2 border-l-white/90 border-r border-r-black/20 border-b-2 border-b-black/30 focus:border-gold-primary rounded-xl px-3.5 py-2 text-[9px] font-black text-black outline-none transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)] pr-8"
                        >
                          <option value="" className="bg-white text-black/60 font-bold">
                            (Domyślny: {
                              role.id === 'ocr' ? 'Gemini 3.7 Flash' :
                              role.id === 'query_planner' ? 'GPT-5.4 Nano' :
                              role.id === 'judge' ? 'GPT-5.6 Luna' :
                              role.id === 'drafter' ? 'Claude Sonnet 5' :
                              role.id === 'fast' ? 'GPT-5.4 Nano' :
                              role.id === 'long_context' ? 'Gemini 3.1 Pro Preview' :
                              'Zależny od silnika'
                            })
                          </option>
                          {userAvailableModels.map((m) => {
                            const isRec = role.isModelRecommended(m);
                            const vendor = normalizeVendor(m.name, m.id);
                            
                            const assignedRole = Object.entries(assignedModels || {}).find(([rId, mId]) => mId === m.id && rId !== role.id)?.[0];
                            const isAssignedToOther = !!assignedRole;
                            
                            const getRoleLabel = (rId: string) => {
                              const labels: Record<string, string> = {
                                'embedding': 'Embedding', 'ocr': 'OCR', 'judge': 'Sędzia', 'drafter': 'Pisma', 
                                'fast': 'Szybki', 'long_context': 'Długi Kontekst', 'query_planner': 'Planner', 'retrieval': 'Wyszukiwanie'
                              };
                              return labels[rId] || rId;
                            };

                            return (
                              <option
                                key={m.id}
                                value={m.id}
                                className={cn(
                                  "bg-white py-1 font-bold text-black",
                                  isRec && "bg-amber-50 font-black text-black"
                                )}
                                disabled={isAssignedToOther}
                              >
                                {isRec ? '★ ' : ''}{m.name} [{vendor}] {isAssignedToOther ? `(przypisany: ${getRoleLabel(assignedRole)})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Suggestions Pills */}
                    {recommendedModels.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/10">
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-black/40 mr-1">
                          Sugerowane:
                        </span>
                        {recommendedModels.slice(0, 4).map((m) => {
                          const isSelected = selectedModelId === m.id;
                          const vendor = normalizeVendor(m.name, m.id);
                          const brand = getBrand(vendor);
                          const BrandIcon = brand.icon;
                          const cleanName = m.name.includes(':') ? m.name.split(':')[1].trim() : m.name;

                          const assignedRole = Object.entries(assignedModels || {}).find(([rId, mId]) => mId === m.id && rId !== role.id)?.[0];
                          const isAssignedToOther = !!assignedRole;

                          return (
                            <button
                              key={m.id}
                              onClick={() => setAssignedModel(role.id, m.id)}
                              disabled={isAssignedToOther}
                              className={cn(
                                "px-2.5 py-1 rounded-xl text-[7.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                                isSelected
                                  ? "btn-convex-prestige active text-black shadow-sm"
                                  : isAssignedToOther
                                    ? "bg-black/5 border border-black/10 text-black/30 cursor-not-allowed"
                                    : "btn-convex-prestige text-black/70 hover:text-black"
                              )}
                              title={isAssignedToOther ? `Przypisany już do roli: ${assignedRole}` : undefined}
                            >
                              <BrandIcon size={10} className={isSelected ? "text-amber-800" : (isAssignedToOther ? "text-black/20" : "text-amber-600")} />
                              <span>{cleanName}</span>
                              {isSelected && <Check size={8} strokeWidth={3} className="text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-4 border-t border-black/10 bg-black/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[7px] text-black/60 font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span>Konfiguracja aktywna</span>
            </div>
            <button
              onClick={onClose}
              className="prestige-panel-action px-8 py-2.5 rounded-xl text-black text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-md"
            >
              Aktywuj Modele
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
