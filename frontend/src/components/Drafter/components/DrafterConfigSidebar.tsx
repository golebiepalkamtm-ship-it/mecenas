import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { LexIcon } from "../../Layout/LexIcon";
import { cn } from "../utils";
import { TypeSelector } from "./TypeSelector";
import { ExpertMode } from "./ExpertMode";
import type { ExpertModeKey } from "../types";
import {
  PLACE_CITY_OPTIONS,
  RECIPIENT_ORGAN_OPTIONS,
  type FormalPresetOption,
} from "../formalPresets";
import { buildPlaceDateLine } from "../utils";

interface StructuredFieldProps {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  isInput?: boolean;
}

function StructuredField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  isInput = false,
}: StructuredFieldProps) {
  return (
    <motion.div className="space-y-2">
      <div className="flex items-center gap-2 text-[9px] font-black text-black/40 uppercase tracking-widest leading-none pl-1">
        {icon}
        {label}
      </div>
      {isInput ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full library-view-cell px-4 py-3 text-[13px] text-black font-medium focus:outline-none focus:border-gold-primary/40 transition-all"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full library-view-cell px-4 py-3 text-[13px] text-black font-medium focus:outline-none focus:border-gold-primary/40 resize-none transition-all"
        />
      )}
    </motion.div>
  );
}

interface StructuredPresetSelectProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  options: FormalPresetOption[];
  presetId: string;
  onPresetChange: (id: string) => void;
  customValue?: string;
  onCustomValueChange?: (val: string) => void;
  customPlaceholder?: string;
}

function StructuredPresetSelect({
  icon,
  label,
  hint,
  options,
  presetId,
  onPresetChange,
  customValue,
  onCustomValueChange,
  customPlaceholder,
}: StructuredPresetSelectProps) {
  const isCustom = presetId.endsWith("custom");
  const categories = [...new Set(options.map((o) => o.category || "Inne"))];

  return (
    <motion.div className="space-y-2">
      <div className="flex items-center justify-between gap-2 pl-1">
        <div className="flex items-center gap-2 text-[9px] font-black text-black/40 uppercase tracking-widest leading-none">
          {icon}
          {label}
        </div>
        {hint && (
          <span className="text-[7px] font-bold text-black/25 uppercase tracking-widest">
            {hint}
          </span>
        )}
      </div>
      <select
        value={presetId}
        onChange={(e) => onPresetChange(e.target.value)}
        className="w-full library-view-cell px-4 py-3 text-[13px] text-black font-medium focus:outline-none focus:border-gold-primary/40 transition-all cursor-pointer"
      >
        <option value="">— wybierz z listy —</option>
        {categories.map((category) => (
          <optgroup key={category} label={category}>
            {options
              .filter((o) => (o.category || "Inne") === category)
              .map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {isCustom && onCustomValueChange && (
        <input
          type="text"
          value={customValue ?? ""}
          onChange={(e) => onCustomValueChange(e.target.value)}
          placeholder={customPlaceholder}
          className="w-full library-view-cell px-4 py-3 text-[13px] text-black font-medium focus:outline-none focus:border-gold-primary/40 transition-all"
        />
      )}
    </motion.div>
  );
}

export interface DrafterConfigSidebarProps {
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  contextMessageCount: number;
  selectedType: string;
  onSelectType: (id: string) => void;
  selectedPrompt: ExpertModeKey;
  onSelectPrompt: (key: ExpertModeKey) => void;
  isStructured: boolean;
  setIsStructured: (v: boolean) => void;
  senderInfo: string;
  setSenderInfo: (v: string) => void;
  recipientInfo: string;
  setRecipientInfo: (v: string) => void;
  recipientPresetId: string;
  onRecipientPresetChange: (id: string) => void;
  placeCity: string;
  setPlaceCity: (v: string) => void;
  placeCityPresetId: string;
  onPlaceCityPresetChange: (id: string) => void;
  documentDateIso: string;
  setDocumentDateIso: (v: string) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  error: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function DrafterConfigSidebar({
  showConfig,
  setShowConfig,
  contextMessageCount,
  selectedType,
  onSelectType,
  selectedPrompt,
  onSelectPrompt,
  isStructured,
  setIsStructured,
  senderInfo,
  setSenderInfo,
  recipientInfo,
  setRecipientInfo,
  recipientPresetId,
  onRecipientPresetChange,
  placeCity,
  setPlaceCity,
  placeCityPresetId,
  onPlaceCityPresetChange,
  documentDateIso,
  setDocumentDateIso,
  instructions,
  setInstructions,
  error,
  isGenerating,
  onGenerate,
}: DrafterConfigSidebarProps) {
  return (
    <>
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfig(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfig && (
          <motion.aside
            initial={{ marginLeft: -480, opacity: 0 }}
            animate={{ marginLeft: 0, opacity: 1 }}
            exit={{ marginLeft: -480, opacity: 0 }}
            transition={{
              type: "tween",
              duration: 0.35,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="fixed lg:relative left-0 top-(--app-mobile-header-offset) lg:top-0 bottom-0 lg:h-full w-full max-w-[100vw] lg:w-72 lg:max-w-72 2xl:w-120 2xl:max-w-120 z-10000 pointer-events-auto flex flex-col overflow-hidden shrink-0 border-r border-black/6 bg-white/25"
          >
            <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-black/6 bg-white/30 flex items-center justify-between gap-2">
              <span className="library-view-label not-italic">Konfiguracja</span>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="w-9 h-9 rounded-lg library-view-cell flex items-center justify-center text-black/45 hover:text-red-600 hover:border-red-500/25 transition-all"
                aria-label="Ukryj panel konfiguracji"
              >
                <X size={16} />
              </button>
            </div>

            {contextMessageCount > 0 && (
              <div className="shrink-0 mx-4 mt-3 flex items-center justify-between px-3 py-2 rounded-lg library-view-accent-box">
                <span className="text-[9px] font-black uppercase tracking-widest text-gold-deep font-outfit">
                  Kontekst z czatu
                </span>
                <span className="text-[9px] font-black text-gold-deep tabular-nums">
                  {contextMessageCount} wiad.
                </span>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 space-y-4 py-3 custom-scrollbar pb-4">
              <TypeSelector
                selectedType={selectedType}
                onSelect={onSelectType}
              />

              <ExpertMode
                selectedPrompt={selectedPrompt}
                onSelect={onSelectPrompt}
              />

              <section className="library-view-panel p-4">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex flex-col min-w-0">
                    <label className="library-view-label not-italic pl-0">Dane formalne</label>
                    <span className="text-[7px] text-black/35 font-bold uppercase tracking-widest mt-0.5 font-outfit">
                      Automatyczny nagłówek
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStructured(!isStructured)}
                    className={cn(
                      "h-9 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all font-outfit shrink-0",
                      isStructured
                        ? "library-filter-active"
                        : "library-view-cell text-black/45",
                    )}
                  >
                    {isStructured ? "Włączone" : "Wyłączone"}
                  </button>
                </div>
                <AnimatePresence>
                  {isStructured && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden pt-1"
                    >
                      <StructuredField
                        icon={<LexIcon name="profil" size={14} />}
                        label="Nadawca (Twoje dane)"
                        value={senderInfo}
                        onChange={setSenderInfo}
                        placeholder="Imię, Nazwisko, Adres, PESEL..."
                      />
                      <StructuredPresetSelect
                        icon={<LexIcon name="judgments" size={14} />}
                        label="Adresat (Sąd/Urząd)"
                        options={RECIPIENT_ORGAN_OPTIONS}
                        presetId={recipientPresetId}
                        onPresetChange={onRecipientPresetChange}
                      />
                      <StructuredField
                        icon={<LexIcon name="judgments" size={14} />}
                        label="Dane adresata (edycja)"
                        value={recipientInfo}
                        onChange={setRecipientInfo}
                        placeholder="Pełna nazwa organu, wydział, adres..."
                      />
                      <StructuredPresetSelect
                        icon={<LexIcon name="documents" size={14} />}
                        label="Miejscowość"
                        options={PLACE_CITY_OPTIONS}
                        presetId={placeCityPresetId}
                        onPresetChange={onPlaceCityPresetChange}
                        customValue={placeCity}
                        onCustomValueChange={setPlaceCity}
                        customPlaceholder="Wpisz miejscowość..."
                      />
                      <motion.div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 pl-1">
                          <div className="flex items-center gap-2 text-[9px] font-black text-black/40 uppercase tracking-widest leading-none">
                            <LexIcon name="documents" size={14} />
                            Data pisma
                          </div>
                          <span className="text-[7px] font-bold text-gold-deep/70 uppercase tracking-widest">
                            Auto
                          </span>
                        </div>
                        <input
                          type="date"
                          value={documentDateIso}
                          onChange={(e) => setDocumentDateIso(e.target.value)}
                          className="w-full library-view-cell px-4 py-3 text-[13px] text-black font-medium focus:outline-none focus:border-gold-primary/40 transition-all"
                        />
                        <p className="text-[10px] font-medium text-black/35 pl-1 leading-snug">
                          Podgląd:{" "}
                          <span className="text-black/55">
                            {buildPlaceDateLine(placeCity, documentDateIso)}
                          </span>
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <section className="library-view-panel p-4">
                <motion.div className="flex flex-col mb-4">
                  <label className="library-view-label not-italic pl-0">
                    Wytyczne merytoryczne
                  </label>
                  <span className="text-[7px] text-black/30 font-bold uppercase tracking-widest pl-1 mt-0.5">
                    Opisz kluczowe aspekty sprawy
                  </span>
                </motion.div>
                <div className="mb-3 flex items-center justify-between rounded-lg library-view-cell px-3 py-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-black/35 font-outfit">
                    Skrót
                  </span>
                  <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-black/60">
                    <kbd className="keycap-neon-gold">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="keycap-neon-gold">Enter</kbd>
                  </span>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Wpisz tutaj stan faktyczny lub wklej kluczowe informacje..."
                  rows={6}
                  className="w-full library-view-cell rounded-xl p-4 text-[13px] text-black font-medium leading-relaxed placeholder:text-black/10 focus:outline-none focus:border-gold-primary/40 transition-all min-h-[88px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                      onGenerate();
                  }}
                />
              </section>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl library-view-panel border-red-500/15 bg-red-500/5">
                  <AlertTriangle
                    className="text-red-600 mt-0.5 shrink-0"
                    size={16}
                  />
                  <p className="text-[11px] font-bold text-red-600/80 leading-relaxed uppercase tracking-wider">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 p-4 sm:p-5 pt-2 border-t border-black/6 bg-white/20">
              <motion.button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full h-12 flex items-center justify-center gap-3 rounded-xl text-[10px] font-black uppercase tracking-[0.22em] transition-all lex-btn-primary font-outfit disabled:opacity-45",
                  isGenerating && "cursor-not-allowed",
                )}
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <LexIcon name="drafter" size={18} />
                )}
                {isGenerating ? "Syntetyzowanie..." : "WYGENERUJ PISMO"}
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
