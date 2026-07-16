import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  Copy, 
  Save, 
  Download, 
  Loader2, 
} from "lucide-react";
import { LexIcon } from "../../Layout/LexIcon";
import { DrafterIcon } from "../../Layout/RealisticIcons";
import { cn } from "../utils"; // I'll create this or use a local one

interface DocumentPreviewProps {
  generatedDocument: string;
  copied: boolean;
  onCopy: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  onSave: () => void;
  onDownload: () => void;
  onDownloadDocx: () => void;
  isDownloadingDocx?: boolean;
  documentRef: React.RefObject<HTMLDivElement | null>;
  isGenerating?: boolean;
}

export function DocumentPreview({
  generatedDocument,
  copied,
  onCopy,
  isSaving,
  saveSuccess,
  onSave,
  onDownload,
  onDownloadDocx,
  isDownloadingDocx = false,
  documentRef,
  isGenerating = false,
}: DocumentPreviewProps) {
  if (!generatedDocument) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none panel-scrollbar-gold">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl library-view-accent-box flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
              <DrafterIcon className="w-14 h-14 opacity-80" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl library-view-cell flex items-center justify-center">
              <LexIcon name="drafter" size={14} />
            </div>
          </div>

          <div className="space-y-3 max-w-[340px]">
            <p className="font-profile-display text-2xl font-semibold italic text-black leading-tight">
              Podgląd pisma
            </p>
            <p className="text-[12px] font-medium text-black/45 leading-relaxed font-outfit">
              Skonfiguruj typ pisma i dane formalne w panelu po lewej, następnie wygeneruj dokument.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Controls Header */}
      <div className="shrink-0 flex items-center justify-between px-5 sm:px-8 py-3 border-b border-black/[0.06] bg-white/25 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg library-view-cell">
             <span className="w-2 h-2 rounded-full bg-gold-primary shadow-[0_0_8px_rgba(212,175,55,0.5)] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60 font-outfit">
                Pismo Synchroniczne
             </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ControlButton 
            onClick={onCopy} 
            active={copied} 
            icon={copied ? <Check size={14} /> : <Copy size={14} />} 
            label={copied ? "SKOPIOWANO" : "KOPIUJ"} 
            tooltipTitle="Skopiuj pismo"
            tooltipDesc="Kopiuje całą wygenerowaną treść dokumentu do schowka."
          />
          <ControlButton 
            onClick={onSave} 
            active={saveSuccess} 
            disabled={isSaving}
            icon={isGenerating ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />} 
            label={saveSuccess ? "ZAPISANO" : "ZAPISZ"} 
            tooltipTitle="Zapisz roboczą"
            tooltipDesc="Zapisuje pismo do Twojej biblioteki spraw."
          />
          <ControlButton 
            onClick={onDownload} 
            icon={<Download size={14} />} 
            label="POBIERZ .MD" 
            tooltipTitle="Pobierz Markdown"
            tooltipDesc="Zapisuje plik w formacie .md na Twoim dysku."
          />
          <ControlButton
            onClick={onDownloadDocx}
            disabled={isDownloadingDocx}
            icon={isDownloadingDocx ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            label={isDownloadingDocx ? "DOCX..." : "POBIERZ DOCX"}
            tooltipTitle="Pobierz Word"
            tooltipDesc="Konwertuje i pobiera dokument jako gotowy plik .docx."
          />
        </div>
      </div>

      {/* Rendered View */}
      <div
        ref={documentRef}
        className="flex-1 overflow-y-auto custom-scrollbar panel-scrollbar-gold p-6 lg:p-12 selection:bg-black/10"
      >
        <div className="max-w-4xl mx-auto panel-scrollbar-gold">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative rounded-xl p-12 lg:p-20 overflow-hidden library-view-panel shadow-[0_24px_48px_rgba(0,0,0,0.08)]"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />
            
            <div
              className="prose prose-neutral max-w-none font-outfit
              prose-p:text-black/80 prose-p:leading-[1.8] prose-p:mb-6 prose-p:text-[15px] prose-p:font-medium
              prose-headings:text-black prose-headings:font-black prose-headings:tracking-tight prose-headings:font-outfit
              prose-h1:text-[24px] prose-h1:mb-12 prose-h1:text-center prose-h1:uppercase prose-h1:tracking-[0.1em]
              prose-h2:text-[18px] prose-h2:mb-6 prose-h2:mt-12 prose-h2:border-b prose-h2:border-black/10 prose-h2:pb-2 prose-h2:uppercase
              prose-h3:text-[16px] prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-black/90
              prose-strong:text-black prose-strong:font-black
              prose-ul:list-disc prose-li:marker:text-black/20 prose-li:text-black/80 prose-li:text-[15px]
              prose-hr:border-black/5 prose-hr:my-12
              prose-blockquote:border-l-4 prose-blockquote:border-l-black/20 prose-blockquote:text-black/60 prose-blockquote:italic prose-blockquote:bg-black/5 prose-blockquote:p-6 prose-blockquote:rounded-xl"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {generatedDocument}
              </ReactMarkdown>
            </div>
            
            <div className="mt-24 flex flex-col items-center gap-4 text-[9px] font-black uppercase tracking-[0.5em] text-black/10 select-none font-outfit">
              <div className="w-10 h-px bg-black/5" />
              LEXMIND MERCURY v2.7 PRO
              <div className="w-10 h-px bg-black/5" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function ControlButton({ 
  onClick, 
  active = false, 
  disabled = false, 
  icon, 
  label,
  tooltipTitle,
  tooltipDesc
}: { 
  onClick: () => void; 
  active?: boolean; 
  disabled?: boolean;
  icon: React.ReactNode; 
  label: string;
  tooltipTitle: string;
  tooltipDesc: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "flex items-center gap-2 h-9 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 font-outfit",
          active
            ? "library-filter-active"
            : "library-view-cell text-black/50 hover:text-black",
        )}
      >
        {icon}
        <span>{label}</span>
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute top-full right-0 mt-2 w-48 p-2.5 bg-white border border-black/10 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.12)] text-left z-9999 pointer-events-none text-black"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
              {tooltipTitle}
            </p>
            <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider">
              {tooltipDesc}
            </p>
            <div className="absolute bottom-full right-4 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
