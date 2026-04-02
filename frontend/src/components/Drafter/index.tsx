import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  Wand2,
  UserCircle,
  Scale,
  Calendar,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
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

      const { error: saveError } = await supabase.from("documents").insert({
        title: docTitle,
        content: generatedDocument,
        type: currentDocType?.label || "Inne",
        user_id: session.user.id,
      });
      if (saveError) throw saveError;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(`Błąd zapisu: ${err instanceof Error ? err.message : "Nieznany błąd"}`);
    } finally {
      setIsSaving(false);
    }
  }, [generatedDocument, selectedType]);

  return (
    <div className="flex flex-col h-full glass-prestige-embossed overflow-hidden border-t-2 border-t-white/90 font-outfit">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gold-primary/5 blur-[120px] pointer-events-none" />

      {/* ── TOP BAR ── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl glass-prestige-gold flex items-center justify-center text-gold-primary shadow-lg border-t border-white/20">
            <Wand2 size={18} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[13px] font-black uppercase tracking-[0.2em] text-white/90 italic font-outfit">
              Kreator Pism
            </h1>
            <p className="text-[8px] font-black text-gold-primary/40 uppercase tracking-[0.25em] mt-0.5 font-outfit">
                LexMind Prestige Drafter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentMessages.length > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full glass-prestige border border-emerald-500/20 shadow-emerald-500/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                Kontekst: {currentMessages.length}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN BODY ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Configuration */}
        <aside className={cn(
            "flex flex-col border-r border-white/10 overflow-y-auto custom-scrollbar shrink-0 transition-all duration-500",
            generatedDocument ? "w-full lg:w-[380px] xl:w-[440px]" : "w-full lg:max-w-lg mx-auto"
        )}>
           <div className="flex flex-col gap-3 p-3">
              <TypeSelector selectedType={selectedType} onSelect={setSelectedType} />
              <ExpertMode selectedPrompt={selectedPrompt} onSelect={setSelectedPrompt} />

              {/* Structured Toggle */}
              <section className="glass-prestige rounded-2xl p-3">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 pl-1 font-outfit">Dane Formalne</label>
                    <button
                        onClick={() => setIsStructured(!isStructured)}
                        className={cn(
                            "px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all",
                            isStructured ? "glass-prestige-gold text-gold-primary shadow-lg" : "glass-prestige text-white/30"
                        )}
                    >
                        {isStructured ? "AKTYWNE" : "OPCJONALNE"}
                    </button>
                </div>
                <AnimatePresence>
                    {isStructured && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden pt-1">
                          <StructuredField icon={<UserCircle size={12}/>} label="Nadawca (Twoje dane)" value={senderInfo} onChange={setSenderInfo} placeholder="Imię, Nazwisko, Adres, PESEL..." />
                          <StructuredField icon={<Scale size={12}/>} label="Adresat (Sąd/Urząd)" value={recipientInfo} onChange={setRecipientInfo} placeholder="Pełna nazwa organu, Wydział, Adres..." />
                          <StructuredField icon={<Calendar size={12}/>} label="Miejscowość i Data" value={placeDate} onChange={setPlaceDate} placeholder="Kraków, dnia 26.03.2025 r." isInput />
                       </motion.div>
                    )}
                </AnimatePresence>
              </section>

              {/* Instructions */}
              <section className="glass-prestige rounded-2xl p-3">
                <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 pl-1 font-outfit">Instrukcje Dokumentu</label>
                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Opisz czego dotyczy sprawa, wymień kluczowe fakty i żądania..."
                    rows={4}
                    className="w-full glass-prestige-input rounded-xl p-4 text-[13px] text-white font-medium leading-relaxed placeholder:text-white/20 focus:outline-none"
                    onKeyDown={(e) => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
                />
              </section>

              {error && (
                <div className="flex items-start gap-3 p-3 rounded-2xl glass-prestige border border-red-500/20 shadow-red-500/10">
                   <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={14} />
                   <p className="text-[11px] font-bold text-red-300 leading-relaxed uppercase tracking-wider">{error}</p>
                </div>
              )}
           </div>

           {/* Generate Action */}
           <div className="p-3 pt-0 mt-auto sticky bottom-0 bg-linear-to-t from-(--bg-deep) to-transparent">
               <motion.button
                onClick={handleGenerate}
                disabled={isGenerating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "w-full h-12 flex items-center justify-center gap-3 rounded-xl text-[11px] font-black uppercase tracking-[0.25em] transition-all relative overflow-hidden",
                    isGenerating ? "glass-prestige text-white/30" : "bg-gold-primary text-black shadow-gold-primary/30 shadow-[0_15px_40px_rgba(212,175,55,0.3)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.5)] border-t-2 border-white/60"
                )}
               >
                 {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                 {isGenerating ? "Generowanie..." : "WYGENERUJ DOKUMENT"}
                 <div className="absolute inset-x-0 h-1/2 bottom-0 bg-white/10 opacity-10 pointer-events-none" />
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
            <div className="flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">
                {icon}
                {label}
            </div>
            {isInput ? (
                <input
                    type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className="w-full glass-prestige-input rounded-xl px-4 py-3.5 text-[13px] text-white font-medium focus:outline-none"
                />
            ) : (
                <textarea
                    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2}
                    className="w-full glass-prestige-input rounded-xl px-4 py-3.5 text-[13px] text-white font-medium focus:outline-none resize-none"
                />
            )}
        </div>
    );
}
