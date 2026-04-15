import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { 
  Check, 
  Copy, 
  Save, 
  Download, 
  Loader2, 
  BookOpen, 
  Sparkles 
} from "lucide-react";
import { cn } from "../utils"; // I'll create this or use a local one

interface DocumentPreviewProps {
  generatedDocument: string;
  copied: boolean;
  onCopy: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  onSave: () => void;
  onDownload: () => void;
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
  documentRef,
  isGenerating = false,
}: DocumentPreviewProps) {
  if (!generatedDocument) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-black/5 panel-scrollbar-gold">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative group">
            <div className="w-24 h-24 rounded-[2.5rem] glass-liquid-convex flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-110">
              <BookOpen size={40} className="text-black/60" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-2xl glass-prestige flex items-center justify-center shadow-lg">
              <Sparkles size={14} className="text-emerald-600" />
            </div>
          </div>

          <div className="space-y-4 max-w-[320px]">
            <p className="text-[12px] font-black uppercase tracking-[0.4em] text-black/40 font-outfit">
              Podgląd Dokumentu
            </p>
            <p className="text-[11px] font-medium text-black/20 leading-relaxed uppercase tracking-[0.2em] font-outfit">
              Skonfiguruj parametry po lewej stronie, aby zainicjować proces generowania prestiżowego dokumentu prawnego w standardzie Mercury Platinum.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black/5 border-l border-black/5">
      {/* Controls Header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-black/5 bg-transparent z-20 panel-scrollbar-gold">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full glass-prestige">
             <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60 font-outfit">
                Pismo Synchroniczne
             </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ControlButton onClick={onCopy} active={copied} icon={copied ? <Check size={14} /> : <Copy size={14} />} label={copied ? "SKOPIOWANO" : "KOPIUJ"} />
          <ControlButton 
            onClick={onSave} 
            active={saveSuccess} 
            disabled={isSaving}
            icon={isGenerating ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />} 
            label={saveSuccess ? "ZAPISANO" : "ZAPISZ"} 
          />
          <ControlButton onClick={onDownload} icon={<Download size={14} />} label="POBIERZ .MD" />
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
            className="relative rounded-[1rem] p-12 lg:p-20 overflow-hidden glass-liquid-convex shadow-[0_40px_80px_rgba(0,0,0,0.1)]"
          >
            {/* Elegant Header Accent */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-black/10 to-transparent" />
            
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
    </div>
  );
}

function ControlButton({ 
  onClick, 
  active = false, 
  disabled = false, 
  icon, 
  label 
}: { 
  onClick: () => void; 
  active?: boolean; 
  disabled?: boolean;
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 glass-liquid-convex",
        active 
          ? "scale-105 z-10 shadow-xl text-black" 
          : "opacity-60 hover:opacity-100 text-black/40 hover:text-black"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
