import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  UserCircle,
  Building2,
  Calendar,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { LiquidMetalIcon } from "../UI";
import { cn } from "./utils";
import { DRAFTING_PROMPTS, DOCUMENT_TYPES } from "./constants";
import { useChatSettingsStore } from "../../store/useChatSettingsStore";
import type { ExpertModeKey } from "./types";

// Context & Hooks
import { useSharedChat } from "../../context/useSharedChat";

// Sub-components
import { TypeSelector } from "./components/TypeSelector";
import { ExpertMode } from "./components/ExpertMode";
import { DocumentPreview } from "./components/DocumentPreview";

export function DrafterView() {
  const { messages: globalMessages } = useSharedChat();
  const { drafterModel } = useChatSettingsStore();

  const currentMessages = globalMessages.map(m => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  const [instructions, setInstructions] = useState("");
  const [selectedType, setSelectedType] = useState("pozew");
  const [generatedDocument, setGeneratedDocument] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isStructured, setIsStructured] = useState(false);

  // Structured data
  const [senderInfo, setSenderInfo] = useState("");
  const [recipientInfo, setRecipientInfo] = useState("");
  const [placeDate, setPlaceDate] = useState("");

  const [selectedPrompt, setSelectedPrompt] = useState<ExpertModeKey>("drafter");

  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (documentRef.current && generatedDocument) {
      documentRef.current.scrollTop = documentRef.current.scrollHeight;
    }
  }, [generatedDocument]);

  const handleGenerate = useCallback(async () => {
    if (!instructions.trim() && currentMessages.length === 0) {
      setError("Podaj instrukcje lub przeprowadź najpierw rozmowę w czacie.");
      return;
    }
    setIsGenerating(true);
    setError("");
    setGeneratedDocument("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Musisz być zalogowany.");
        setIsGenerating(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "draft-document",
        {
          body: {
            system_prompt: DRAFTING_PROMPTS[selectedPrompt].prompt,
            user_instructions: instructions,
            structured_data: isStructured
              ? { sender: senderInfo, recipient: recipientInfo, placeDate }
              : null,
            model: drafterModel,
            history: currentMessages.slice(-10),
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      if (fnError) throw fnError;
      if (data?.content) setGeneratedDocument(data.content);
      else if (data?.error) setError(data.error);
    } catch (err: unknown) {
      setError(`Błąd generowania: ${err instanceof Error ? err.message : "Nieznany błąd"}`);
    } finally {
      setIsGenerating(false);
    }
  }, [instructions, currentMessages, selectedPrompt, isStructured, senderInfo, recipientInfo, placeDate, drafterModel]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(generatedDocument);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedDocument]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedDocument], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const docType = DOCUMENT_TYPES.find((d) => d.id === selectedType);
    a.download = `${docType?.label || "pismo"}_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedDocument, selectedType]);

  const handleSave = useCallback(async () => {
    if (!generatedDocument) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Musisz być zalogowany.");

      const firstLine = generatedDocument.split("\n")[0].replace(/[#*]/g, "").trim();
      const currentDocType = DOCUMENT_TYPES.find((d) => d.id === selectedType);
      const docTitle = firstLine || `${currentDocType?.label || "Pismo"} - ${new Date().toLocaleDateString("pl-PL")}`;

      const res = await fetch("http://localhost:8003/documents/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          document_text: generatedDocument,
          question: docTitle, // used as filename/title in backend
          model: drafterModel
        })
      });

      if (!res.ok) throw new Error("Failed to save draft on server");
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(`Błąd zapisu: ${err instanceof Error ? err.message : "Nieznany błąd"}`);
    } finally {
      setIsSaving(false);
    }
  }, [generatedDocument, selectedType, drafterModel]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden font-outfit relative pt-2">
      <div className="absolute inset-0 noise-overlay opacity-5 pointer-events-none" />

      {/* ── MAIN BODY ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Configuration */}
        <aside className={cn(
            "flex flex-col border-r border-black/5 overflow-y-auto custom-scrollbar panel-scrollbar-gold shrink-0 transition-all duration-500 relative",
            generatedDocument ? "w-full lg:w-[380px] xl:w-[440px]" : "w-full lg:max-w-xl mx-auto"
        )}>
           <div className="flex flex-col gap-4 p-4 relative z-10">
              {currentMessages.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl glass-liquid-convex border-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                      Zasoby Kontekstowe
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600/60 bg-emerald-500/5 px-2 py-0.5 rounded">
                    {currentMessages.length} PKT.
                  </span>
                </div>
              )}
              
              <div className="glass-liquid-convex rounded-2xl p-1">
                 <TypeSelector selectedType={selectedType} onSelect={setSelectedType} />
              </div>
              
              <div className="glass-liquid-convex rounded-2xl p-1">
                 <ExpertMode selectedPrompt={selectedPrompt} onSelect={setSelectedPrompt} />
              </div>

              {/* Structured Toggle */}
              <section className="glass-liquid-convex rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black pl-1 font-outfit">Dane Formalne</label>
                        <span className="text-[7px] text-black/30 font-bold uppercase tracking-widest pl-1 mt-0.5">Automatyczne uzupełnianie nagłówka</span>
                    </div>
                    <button
                        onClick={() => setIsStructured(!isStructured)}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all glass-liquid-convex",
                            isStructured ? "text-black scale-105 shadow-xl" : "text-black/30"
                        )}
                        style={
                          isStructured
                            ? {
                                backgroundColor: "#22d3ee",
                                backgroundImage:
                                  "linear-gradient(145deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 52%, rgba(0,0,0,0.12) 100%)",
                                boxShadow:
                                  "0 0 26px #22d3eecc, 0 12px 40px -10px #22d3ee99, inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15)",
                              }
                            : undefined
                        }
                    >
                        {isStructured ? "Włączone" : "Wyłączone"}
                    </button>
                </div>
                <AnimatePresence>
                    {isStructured && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden pt-1">
                          <StructuredField icon={<UserCircle size={14}/>} label="Nadawca (Twoje dane)" value={senderInfo} onChange={setSenderInfo} placeholder="Imię, Nazwisko, Adres, PESEL..." />
                          <StructuredField icon={<Building2 size={14}/>} label="Adresat (Sąd/Urząd)" value={recipientInfo} onChange={setRecipientInfo} placeholder="Pełna nazwa organu, Wydział, Adres..." />
                          <StructuredField icon={<Calendar size={14}/>} label="Miejscowość i Data" value={placeDate} onChange={setPlaceDate} placeholder="Kraków, dnia 26.03.2025 r." isInput />
                       </motion.div>
                    )}
                </AnimatePresence>
              </section>

              {/* Instructions */}
              <section className="glass-liquid-convex rounded-2xl p-4">
                <div className="flex flex-col mb-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black pl-1 font-outfit">Wytyczne Merytoryczne</label>
                    <span className="text-[7px] text-black/30 font-bold uppercase tracking-widest pl-1 mt-0.5">Opisz kluczowe aspekty sprawy</span>
                </div>
                <div className="mb-3 flex items-center justify-between rounded-xl glass-prestige-input px-3 py-2">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-black/35">Skrót klawiaturowy</span>
                    <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-black/60">
                        <kbd className="keycap-neon-cyan">Ctrl</kbd>
                        <span>+</span>
                        <kbd className="keycap-neon-gold">Enter</kbd>
                        <span className="text-black/30 hidden sm:inline">(Mac:</span>
                        <kbd className="keycap-neon-violet hidden sm:inline-flex">Cmd</kbd>
                        <span className="text-black/30 hidden sm:inline">+ Enter)</span>
                    </span>
                </div>
                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Wpisz tutaj stan faktyczny lub wklej kluczowe informacje..."
                    rows={6}
                    className="w-full glass-prestige-input rounded-xl p-4 text-[13px] text-black font-medium leading-relaxed placeholder:text-black/10 focus:outline-none transition-all"
                    onKeyDown={(e) => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
                />
              </section>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl glass-liquid-convex border-red-500/10">
                   <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={16} />
                   <p className="text-[11px] font-bold text-red-600/80 leading-relaxed uppercase tracking-wider">{error}</p>
                </div>
              )}
           </div>

           {/* Generate Action */}
            <div className="p-4 pt-0 mt-auto sticky bottom-0 bg-gradient-to-t from-[#c7c7cc] to-transparent">
                <motion.button
                 onClick={handleGenerate}
                 disabled={isGenerating}
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 className={cn(
                    "w-full h-14 flex items-center justify-center gap-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all relative glass-liquid-convex text-black shadow-2xl z-20",
                    isGenerating && "opacity-60 cursor-not-allowed"
                 )}
                style={{
                  backgroundColor: "#f59e0b",
                  backgroundImage:
                    "linear-gradient(145deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.18) 48%, rgba(0,0,0,0.14) 100%)",
                  boxShadow:
                    "0 0 36px #f59e0be6, 0 0 68px #f59e0b88, 0 18px 52px -12px #f59e0b99, inset 0 2px 5px rgba(255,255,255,0.92), inset 0 -2px 5px rgba(0,0,0,0.18)",
                }}
               >
                 {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                 {isGenerating ? "Syntetyzowanie Dokumentu..." : "WYGENERUJ PISMO PRAWNE"}
               </motion.button>
           </div>
        </aside>

        {/* RIGHT PANEL: Preview */}
        <DocumentPreview
            generatedDocument={generatedDocument}
            copied={copied}
            onCopy={handleCopy}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            onSave={handleSave}
            onDownload={handleDownload}
            documentRef={documentRef}
        />
      </div>
    </div>
  );
}

function StructuredField({ icon, label, value, onChange, placeholder, isInput = false }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    isInput?: boolean;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[9px] font-black text-black/40 uppercase tracking-widest leading-none pl-1">
                {icon}
                {label}
            </div>
            {isInput ? (
                <input
                    type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className="w-full glass-prestige-input rounded-xl px-4 py-3 text-[13px] text-black font-medium focus:outline-none transition-all"
                />
            ) : (
                <textarea
                    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2}
                    className="w-full glass-prestige-input rounded-xl px-4 py-3 text-[13px] text-black font-medium focus:outline-none resize-none transition-all"
                />
            )}
        </div>
    );
}
