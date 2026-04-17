import { motion, AnimatePresence } from "framer-motion";
import { Square, Send, X, Image as ImageIcon, FileText, AlertTriangle, CheckCircle2, Loader2, RefreshCcw, Mic, Database, Paperclip, Plus } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useLayoutEffect, useCallback, useEffect, useRef } from "react";
import type { QueuedAttachment } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── File Preview Chip ─── */
function FilePreview({ attachment, onRemove, onPreview }: { attachment: QueuedAttachment; onRemove: () => void; onPreview: () => void }) {
  const { file, status, progress } = attachment;
  const [imageUrl, setImageUrl] = useState<string>('');
  const isImage = file.type.startsWith('image/');
  const extension = file.name.split('.').pop()?.toLowerCase();

  useLayoutEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      Promise.resolve().then(() => setImageUrl(url));
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (extension === 'pdf')  return <FileText className="w-5 h-5 text-rose-400" />;
    if (extension === 'docx' || extension === 'doc') return <FileText className="w-5 h-5 text-gold-primary" />;
    if (extension === 'txt')  return <FileText className="w-5 h-5 text-slate-400" />;
    return <ImageIcon className="w-5 h-5 text-gold-primary" />;
  };

  const statusColors: Record<string, string> = {
    waiting:    'text-white/30',
    uploading:  'text-gold-primary',
    processing: 'text-amber-400',
    ready:       'text-gold-primary',
    error:      'text-red-400',
  };

  const borderColors: Record<string, string> = {
    waiting:    'rgba(255,255,255,0.05)',
    uploading:  'rgba(212,175,55,0.20)',
    processing: 'rgba(251,191,36,0.20)',
    ready:      'rgba(212,175,55,0.25)',
    error:      'rgba(248,113,113,0.25)',
  };

  return (
    <div className="relative group/wrapper">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -4 }}
        onClick={onPreview}
        className="relative flex items-center gap-2.5 rounded-xl overflow-hidden max-w-[200px] group/chip cursor-pointer hover:scale-[1.02] transition-transform"
        style={{
          background: "rgba(3, 3, 5, 0.90)",
          border: `1px solid ${borderColors[status] || "rgba(255,255,255,0.10)"}`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.50)",
        }}
      >
        {/* Thumbnail / Icon */}
        {isImage && imageUrl ? (
          <div className="relative w-10 h-10 shrink-0">
            <img 
              src={imageUrl} alt={file.name}
              className={cn("w-full h-full object-cover", status !== 'ready' && "opacity-40 grayscale")}
            />
            <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
            <div className="absolute right-0 inset-y-0 w-px bg-white/10" />
          </div>
        ) : (
          <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white/4">
            {getFileIcon()}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 py-2 pr-1">
          <div className="text-[10px] font-semibold text-white/75 truncate flex items-center gap-1">
            {file.name}
            {status === 'ready' && <CheckCircle2 className="w-3 h-3 text-gold-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] text-white/25">{formatFileSize(file.size)}</span>
            <span className={cn("text-[7px] uppercase tracking-wide font-bold", statusColors[status])}>
              {status === 'waiting' && <span className="flex items-center gap-0.5">Kolejka</span>}
              {status === 'uploading' && <span className="flex items-center gap-0.5"><Loader2 className="w-2 h-2 animate-spin inline" /> Upload</span>}
              {status === 'processing' && <span className="flex items-center gap-0.5"><RefreshCcw className="w-2 h-2 animate-spin inline" /> OCR</span>}
              {status === 'ready' && "Gotowy"}
              {status === 'error' && "Błąd"}
            </span>
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="w-5 h-5 mr-2 rounded-full flex items-center justify-center text-white/25 hover:text-white hover:bg-red-500/30 transition-all shrink-0 z-10"
        >
          <X size={10} />
        </button>

        {/* Progress Bar */}
        {(status === 'uploading' || status === 'processing' || status === 'waiting') && (
          <div
            className="absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-700"
            style={{
              width: `${status === 'waiting' ? 5 : progress}%`,
              background: status === 'waiting' ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg, rgba(212,175,55,0.8), rgba(240,204,90,0.8))",
            }}
          />
        )}
      </motion.div>

      {/* Tooltip for Extracted Text (Hover Preview) */}
      {status === 'ready' && attachment.extractedText && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[260px] p-3 rounded-2xl glass-prestige text-left opacity-0 translate-y-2 group-hover/wrapper:opacity-100 group-hover/wrapper:translate-y-0 pointer-events-none transition-all duration-300 z-50 shadow-2xl border border-white/10" style={{ background: "rgba(10, 12, 16, 0.95)" }}>
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
            <FileText className="w-3.5 h-3.5 text-gold-primary" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Podgląd Oraz OCR</span>
          </div>
          <div className="text-[11px] text-white/80 leading-relaxed font-sans line-clamp-6 whitespace-pre-wrap break-all">
            {attachment.extractedText}
          </div>
        </div>
      )}
    </div>
  );
}

interface ChatInputProps {
  isLoading: boolean;
  attachments: QueuedAttachment[];
  addAttachment?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (idx: number) => void;
  onSend: (message: string) => void;
  stopGeneration: () => void;
  newChat: () => void;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  attachmentWarning?: string | null;
  useRag: boolean;
  setUseRag: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenLibrary: (mode: 'all' | 'documents' | 'images') => void;
  onPreviewDoc: (att: QueuedAttachment) => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function ChatInput({
  isLoading,
  attachments,
  removeAttachment,
  onSend,
  stopGeneration,
  imageInputRef,
  attachmentWarning,
  onOpenLibrary,
  useRag,
  setUseRag,
  newChat,
  onPreviewDoc,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
      const SpeechRecognitionConstructor = (win.SpeechRecognition || win.webkitSpeechRecognition) as { new(): SpeechRecognition } | undefined;
      if (SpeechRecognitionConstructor && !recognitionRef.current) {
        const reco = new SpeechRecognitionConstructor();
        reco.continuous = true;
        reco.interimResults = true;
        reco.lang = 'pl-PL';

        reco.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
             setValue((prev: string) => (prev ? prev + ' ' : '') + finalTranscript);
          }
        };

        reco.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        reco.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = reco;
      }
    }
  }, []);

  const toggleListen = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleInternalSend = useCallback(() => {
    if (!value.trim() && attachments.length === 0) return;
    onSend(value);
    setValue("");
  }, [value, attachments.length, onSend]);

  const handleNewChat = useCallback(() => {
    setValue("");
    newChat();
  }, [newChat]);

  return (
    <div className="w-full flex flex-col gap-3 px-2">

      {/* ── Attachments & Warnings ── */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-2 px-2 overflow-hidden"
          >
            {attachments.map((att, idx) => (
              <FilePreview
                key={att.id ? String(att.id) : `attachment-${idx}`}
                attachment={att}
                onRemove={() => removeAttachment(idx)}
                onPreview={() => onPreviewDoc(att)}
              />
            ))}
            <span className="text-[9px] text-white/25 font-bold uppercase tracking-wider self-center ml-1">
              Plików: {attachments.length}
            </span>

          </motion.div>
        )}

        {attachmentWarning && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl mx-2 border text-[11px] font-medium"
            style={{
              background: "rgba(245,158,11,0.08)",
              borderColor: "rgba(245,158,11,0.20)",
              color: "rgba(252,211,77,0.9)",
            }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            {attachmentWarning}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Input Shell ── */}
      <div className="relative w-full rounded-[2.5rem] border flex items-end p-2 transition-all group/input glass-liquid-convex shadow-2xl">
         
         {/* Left Icons inside input - ARCHITECTURAL SEPARATION */}
         <div className="flex items-center gap-1 pb-1 pl-1 shrink-0 text-white/40">
            {/* 0. NOWA KONSULTACJA (Plus) */}
            <button
              title="Nowa Konsultacja"
              onClick={handleNewChat}
              className="p-2 hover:bg-cyan-500/10 rounded-xl transition-all -mt-1 group/btn-new"
            >
               <Plus size={18} className="group-hover/btn-new:scale-110 transition-transform text-black group-hover/btn-new:text-cyan-400" style={{ filter: "var(--neon-cyan)" }} />
            </button>

            {/* 1. ZAŁĄCZ PLIK (Attachments) */}
            <button
              title="Załącz Plik"
              onClick={() => imageInputRef.current?.click()}
              className="p-2 hover:bg-fuchsia-500/10 rounded-xl transition-all -mt-1 group/btn-attach"
            >
               <Paperclip size={18} className="group-hover/btn-attach:scale-110 transition-transform text-black group-hover/btn-attach:text-fuchsia-400" style={{ filter: "var(--neon-fuchsia)" }} />
            </button>

            {/* 2. DOKUMENTY (Existing Docs/Photos) */}
            <button
              title="Dokumenty"
              onClick={() => onOpenLibrary('documents')}
              className="p-2 hover:bg-green-500/10 rounded-xl transition-all -mt-1 group/btn-doc"
            >
               <FileText size={18} className="group-hover/btn-doc:scale-110 transition-transform text-black group-hover/btn-doc:text-green-400" style={{ filter: "var(--neon-green)" }} />
            </button>

            {/* 3. BIBLIOTEKA AKT (RAG / Central Knowledge Base) */}
            <button
              title="Biblioteka Akt (RAG)"
              onClick={(e) => {
                e.stopPropagation();
                setUseRag(!useRag);
                if (!useRag) onOpenLibrary('all');
              }}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center justify-center -mt-1 relative group/btn-rag",
                useRag ? "text-gold-primary bg-gold-primary/5 border border-gold-primary/10 shadow-lg" : "text-white/15 hover:bg-white/5"
              )}
            >
               <Database size={18} className={cn("transition-transform group-hover/btn-rag:scale-110 text-black group-hover/btn-rag:text-gold-primary", useRag ? "text-gold-primary animate-pulse" : "")} style={{ filter: useRag ? "drop-shadow(0 0 8px rgba(212, 175, 55, 0.8))" : "none" }} />
               <div className={cn("absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black z-20", useRag ? "bg-gold-primary" : "bg-white/10")} />
            </button>

            <button
              title="Dyktuj"
              onClick={toggleListen}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center justify-center relative shadow-xs -mt-1 group/btn-mic",
                isListening ? "text-red-500 bg-red-500/10 border border-red-500/20" : "hover:bg-red-500/10"
              )}
            >
               {isListening && (
                 <motion.div
                   layoutId="mic-pulse"
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: [1, 1.6, 1], opacity: [0, 0.4, 0] }}
                   transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute inset-0 bg-red-500 rounded-xl"
                 />
               )}
               <Mic size={18} className={cn("relative z-10 text-black group-hover/btn-mic:text-red-400", isListening && "text-red-400")} style={{ filter: isListening ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))" : "none" }} />
            </button>
         </div>

         {/* Center Auto-resizing Textarea */}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleInternalSend();
              }
            }}
            placeholder={isListening ? "Słucham..." : "Opisz swój problem prawny..."}
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none px-3 pt-2.5 pb-3.5 text-sm text-white placeholder-white/40 min-h-[46px] max-h-[200px] overflow-y-auto"
            rows={1}
            style={{ caretColor: "#d4af37" }}
          />

         {/* Right Send Button inside input */}
         <div className="shrink-0 pb-1 pr-1 pl-1">
            <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               disabled={isLoading || (!value.trim() && attachments.length === 0)}
               onClick={isLoading ? stopGeneration : handleInternalSend}
               className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-2xl transition-all group/btn-send",
                  isLoading
                    ? "bg-gold-primary/10 text-gold-primary border border-gold-primary/20"
                    : (!value.trim() && attachments.length === 0)
                      ? "bg-black/10 text-black/30 cursor-not-allowed"
                      : "bg-black text-black hover:bg-gold-primary hover:text-white border border-black/20 hover:border-gold-primary/30"
               )}
               style={{ filter: isLoading ? "drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))" : "none" }}
            >
               {isLoading ? (
                  <Square size={16} fill="currentColor" />
               ) : (
                  <Send size={16} fill="currentColor" className="-mt-1 mr-0.5 group-hover/btn-send:text-white" />
               )}
            </motion.button>
         </div>
      </div>
    </div>
  );
}
