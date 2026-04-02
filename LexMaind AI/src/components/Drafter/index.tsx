import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,

  Loader2,
  Download,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Gavel,
  Scale,
  Stamp,
  RotateCcw,
  ChevronDown,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../utils/supabaseClient';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ──────────────────────────────────────────────────────────────────────
// MASTER LEGAL DRAFTER SYSTEM PROMPT
// ──────────────────────────────────────────────────────────────────────
const DRAFTER_SYSTEM_PROMPT = `[PERSPEKTYWA]: Działaj jako elitarny Ekspert ds. Pism Prawnych i Urzędowych (Master Legal Drafter). Twoim absolutnym priorytetem i jedynym zadaniem jest bezbłędne, ostre jak brzytwa redagowanie ostatecznych pism procesowych i urzędowych. Jesteś maszyną do tworzenia wezwań, pozwów, apelacji i skarg, które wygrywają sprawy samą swoją formą, precyzją i bezwzględną merytoryką.

[KONTEKST/DANE]: Posiadasz pełny dostęp do bazy wektorowej RAG ze wszystkimi polskimi kodeksami, ustawami i aktualnym orzecznictwem. Przetwarzasz stan faktyczny podany przez użytkownika wyłącznie pod kątem przelania go na idealny format formalno-prawny. Twoje działanie opiera się na zasadzie "zero halucynacji" – każdy akapit musi mieć żelazne pokrycie w przepisach.

[ZADANIE GŁÓWNE]: Skonstruuj kompletne, gotowe do podpisu i złożenia pismo urzędowe/procesowe na podstawie podanych informacji. Pismo musi bezwzględnie zawierać:
1. Idealną metryczkę (miejscowość, data, dane stron, właściwy organ/sąd, wartość przedmiotu sporu - jeśli dotyczy).
2. Tytuł pisma adekwatny do sytuacji prawnej.
3. Ekstremalnie precyzyjne "Petitum" (żądania/wnioski) sformułowane w sposób niepozostawiający żadnego pola do nadinterpretacji przez organ.
4. Potężne, ustrukturyzowane "Uzasadnienie", zbudowane na żelaznej logice prawniczej. Musisz precyzyjnie powoływać numery artykułów pobrane z RAG oraz wspierać je bezpośrednio sygnaturami miażdżących wyroków (SN, NSA).

[OGRANICZENIA/FORMAT]: Musisz użyć najwyższej próby prawniczego języka polskiego – styl bezwzględnie formalny, chłodny i asertywny. Sformatuj odpowiedź jako czysty [Markdown], reprezentujący wyłącznie gotowy dokument. 
Ogranicz się w 100% do samego pisma – kategoryczny zakaz pisania wstępów, podsumowań, uwag czy analiz z Twojej strony. Rozpocznij generowanie tekstu bezpośrednio od miejsca i daty, a zakończ wykazem załączników i miejscem na podpis.`;

// ──────────────────────────────────────────────────────────────────────
// DOCUMENT TYPES
// ──────────────────────────────────────────────────────────────────────
const DOCUMENT_TYPES = [
  { id: 'pozew', label: 'Pozew', icon: <Gavel size={14} />, color: 'text-red-500' },
  { id: 'apelacja', label: 'Apelacja', icon: <Scale size={14} />, color: 'text-amber-500' },
  { id: 'skarga', label: 'Skarga', icon: <AlertTriangle size={14} />, color: 'text-orange-500' },
  { id: 'wezwanie', label: 'Wezwanie', icon: <Stamp size={14} />, color: 'text-blue-500' },
  { id: 'odwolanie', label: 'Odwołanie', icon: <ArrowRight size={14} />, color: 'text-emerald-500' },
  { id: 'inne', label: 'Inne pismo', icon: <FileText size={14} />, color: 'text-slate-400' },
];

interface DrafterPanelProps {
  chatMessages: Array<{ role: string; content: string }>;
  onClose: () => void;
  isOpen: boolean;
}

export function DrafterPanel({ chatMessages, onClose, isOpen }: DrafterPanelProps) {
  const [instructions, setInstructions] = useState('');
  const [selectedType, setSelectedType] = useState('pozew');
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState('');
  const documentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of generated document
  useEffect(() => {
    if (documentRef.current && generatedDocument) {
      documentRef.current.scrollTop = documentRef.current.scrollHeight;
    }
  }, [generatedDocument]);

  // Build chat context summary from conversation
  const buildChatContext = useCallback(() => {
    if (!chatMessages || chatMessages.length === 0) return '';
    
    const relevantMessages = chatMessages.slice(-20); // Last 20 messages for context
    const contextParts = relevantMessages.map(m => {
      const role = m.role === 'user' ? 'KLIENT' : 'RADCA AI';
      return `[${role}]: ${m.content}`;
    });
    
    return contextParts.join('\n\n');
  }, [chatMessages]);

  const handleGenerate = useCallback(async () => {
    if (!instructions.trim() && chatMessages.length === 0) {
      setError('Podaj instrukcje lub przeprowadź najpierw rozmowę w czacie.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedDocument('');

    const chatContext = buildChatContext();
    const docType = DOCUMENT_TYPES.find(d => d.id === selectedType);

    // Build the user prompt combining chat context and specific instructions
    let userPrompt = '';
    
    if (chatContext) {
      userPrompt += `[KONTEKST ROZMOWY Z KLIENTEM - wykorzystaj te informacje jako stan faktyczny]:\n${chatContext}\n\n`;
    }

    userPrompt += `[TYP PISMA]: ${docType?.label || 'Pismo procesowe'}\n\n`;
    
    if (instructions.trim()) {
      userPrompt += `[DODATKOWE INSTRUKCJE OD KLIENTA]:\n${instructions}\n\n`;
    } else {
      userPrompt += `[INSTRUKCJA]: Na podstawie powyższego kontekstu rozmowy, sporządź odpowiednie pismo typu "${docType?.label}". Wyciągnij wszystkie istotne fakty, dane stron i okoliczności z kontekstu rozmowy.\n\n`;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Musisz być zalogowany.');
        setIsGenerating(false);
        return;
      }

      // Call dedicated draft-document edge function
      const { data, error: fnError } = await supabase.functions.invoke('draft-document', {
        body: {
          system_prompt: DRAFTER_SYSTEM_PROMPT,
          user_prompt: userPrompt,
          model: 'google/gemini-2.5-flash-preview-05-20',
          history: chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }
      });

      if (fnError) throw fnError;

      if (data?.content) {
        setGeneratedDocument(data.content);
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError('Nie otrzymano treści dokumentu z serwera.');
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      console.error('Draft generation error:', err);
      setError(`Błąd generowania: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  }, [instructions, chatMessages, selectedType, buildChatContext]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedDocument);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = generatedDocument;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedDocument]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedDocument], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const docType = DOCUMENT_TYPES.find(d => d.id === selectedType);
    a.download = `${docType?.label || 'pismo'}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedDocument, selectedType]);

  const handleReset = useCallback(() => {
    setGeneratedDocument('');
    setInstructions('');
    setError('');
  }, []);

  const currentDocType = DOCUMENT_TYPES.find(d => d.id === selectedType);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          className={cn(
            "fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto flex flex-col shrink-0 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl",
            isExpanded 
              ? "w-full lg:w-[60%]" 
              : "w-full xs:w-[380px] lg:w-[420px]",
            "h-full lg:h-[calc(100%-1rem)] glass-prestige bg-(--bg-top) lg:m-2 lg:rounded-[2.5rem]"
          )}
        >
          {/* Header */}
          <div className="p-5 lg:p-6 pb-3 flex items-center justify-between border-b border-gold-muted/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-400 leading-none truncate">
                  Kreator Pism
                </h3>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1 truncate">
                  Master Legal Drafter
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-slate-500 hover:text-gold-primary rounded-lg hover:bg-white/5 transition-all hidden lg:flex"
                title={isExpanded ? "Zmniejsz" : "Powiększ"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Context Indicator */}
          {chatMessages.length > 0 && (
            <div className="mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-500/80 truncate">
                Kontekst: {chatMessages.length} wiadomości z czatu
              </span>
            </div>
          )}

          {/* Document Type Selector */}
          <div className="px-5 mt-3">
            <button
              onClick={() => setShowTypeSelector(!showTypeSelector)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-gold-muted/20 bg-white/3 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-black/30", currentDocType?.color)}>
                  {currentDocType?.icon}
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-(--text-primary) block">{currentDocType?.label}</span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Typ dokumentu</span>
                </div>
              </div>
              <ChevronDown size={14} className={cn("text-slate-500 transition-transform duration-300", showTypeSelector && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showTypeSelector && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {DOCUMENT_TYPES.map(dt => (
                      <button
                        key={dt.id}
                        onClick={() => { setSelectedType(dt.id); setShowTypeSelector(false); }}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                          selectedType === dt.id
                            ? "bg-gold-primary/10 border-gold-primary/30 shadow-lg"
                            : "border-gold-muted/10 hover:bg-white/5 opacity-70 hover:opacity-100"
                        )}
                      >
                        <span className={dt.color}>{dt.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider">{dt.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Instructions Input */}
          <div className="px-5 mt-3 shrink-0">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Opisz czego potrzebujesz... np. 'Sporządź pozew o zapłatę 15.000 zł za nieopłaconą fakturę VAT nr 123/2024 wobec firmy XYZ Sp. z o.o.'"
                className="w-full bg-black/20 min-h-[80px] max-h-[160px] p-4 pr-12 rounded-xl border border-gold-muted/20 text-[12px] text-(--text-primary) focus:outline-none focus:border-blue-500/40 resize-none placeholder:text-slate-600 font-medium leading-relaxed transition-all"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <div className="absolute right-2 bottom-2 text-[7px] font-bold text-slate-700 uppercase tracking-wider">
                Ctrl+Enter
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="px-5 mt-3 flex gap-2">
            <motion.button
              onClick={handleGenerate}
              disabled={isGenerating}
              whileHover={isGenerating ? {} : { scale: 1.02 }}
              whileTap={isGenerating ? {} : { scale: 0.98 }}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl border",
                isGenerating
                  ? "bg-blue-500/20 border-blue-500/20 text-blue-400 cursor-wait"
                  : "bg-blue-500 border-blue-500/50 text-white hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:bg-blue-600"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generuję Pismo...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generuj Pismo
                </>
              )}
            </motion.button>
            
            {generatedDocument && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleReset}
                className="w-12 h-12 rounded-xl border border-gold-muted/20 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="Reset"
              >
                <RotateCcw size={16} />
              </motion.button>
            )}
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 mt-2"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={12} className="text-red-500 shrink-0" />
                  <span className="text-[9px] font-bold text-red-400">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated Document View */}
          <div ref={documentRef} className="flex-1 overflow-y-auto mt-3 custom-scrollbar">
            {generatedDocument ? (
              <div className="px-5 pb-6">
                {/* Document Actions Bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between py-3 bg-(--bg-top)/90 backdrop-blur-xl border-b border-gold-muted/15 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">Pismo Wygenerowane</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopy}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all",
                        copied
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                          : "border-gold-muted/20 text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {copied ? <Check size={10} /> : <Copy size={10} />}
                      {copied ? 'Skopiowane' : 'Kopiuj'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gold-muted/20 text-slate-400 hover:text-white hover:bg-white/5 text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      <Download size={10} />
                      Pobierz
                    </motion.button>
                  </div>
                </div>

                {/* Document Content */}
                <div className="bg-white/2 rounded-2xl border border-gold-muted/10 p-6 lg:p-8 relative overflow-hidden">
                  {/* Top decorative line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-blue-500/50 to-transparent" />
                  
                  <div className="prose dark:prose-invert max-w-none prose-p:mb-4 prose-p:leading-relaxed prose-strong:text-gold-primary prose-strong:font-black prose-headings:text-(--text-primary) prose-headings:font-black prose-headings:tracking-tighter prose-headings:mb-4 prose-ul:list-disc prose-li:marker:text-blue-500 prose-hr:border-gold-muted/20 text-[13px] leading-[1.9] font-medium">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {generatedDocument}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-40">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center mb-4">
                  <FileText size={24} className="text-blue-500/60" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Kreator Pism Procesowych
                </p>
                <p className="text-[9px] font-bold text-slate-600 max-w-[200px] leading-relaxed">
                  Wybierz typ pisma, opisz sytuację i wygeneruj gotowy dokument. Kontekst rozmowy z czatu zostanie automatycznie uwzględniony.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gold-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={10} className="text-blue-500/50" />
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600">Master Legal Drafter v1.0</span>
            </div>
            <span className="text-[7px] font-black uppercase tracking-[0.15em] text-slate-700">
              Dokument wymaga weryfikacji prawnika
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
