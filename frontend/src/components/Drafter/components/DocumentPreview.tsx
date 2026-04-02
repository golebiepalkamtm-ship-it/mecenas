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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-black/20">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative group">
            <div className="w-24 h-24 rounded-[2.5rem] glass-prestige-gold flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-110">
              <BookOpen size={40} className="text-gold-primary/30" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-2xl glass-prestige-gold flex items-center justify-center shadow-lg">
              <Sparkles size={14} className="text-gold-primary" />
            </div>
          </div>

          <div className="space-y-4 max-w-[320px]">
            <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white/40 font-outfit">
              Podgląd Dokumentu
            </p>
            <p className="text-[11px] font-medium text-white/10 leading-relaxed uppercase tracking-[0.2em] font-outfit">
              Skonfiguruj parametry po lewej stronie, aby zainicjować proces generowania prestiżowego dokumentu prawnego.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden glass-prestige-embossed border-l border-white/5">
      {/* Controls Header */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/5 glass-prestige shadow-xl z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gold-primary/5 border border-gold-primary/20">
             <span className="w-2 h-2 rounded-full bg-gold-primary shadow-[0_0_12px_rgba(212,175,55,0.8)] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gold-primary font-outfit">
                Pismo Gotowe
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
            label={saveSuccess ? "ZAPISANO" : "ZAPISZ W BAZIE"} 
          />
          <ControlButton onClick={onDownload} icon={<Download size={14} />} label="POBIERZ .MD" />
        </div>
      </div>

      {/* Rendered View */}
      <div
        ref={documentRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-16 bg-black/40 selection:bg-gold-primary/30"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative bg-[#0f0f10] rounded-[3rem] p-12 lg:p-24 overflow-hidden glass-prestige shadow-[0_60px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10"
          >
            {/* Elegant Header Accent */}
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-gold-primary/40 to-transparent" />
            
            <div
              className="prose dark:prose-invert max-w-none font-outfit
              prose-p:text-white/90 prose-p:leading-[2] prose-p:mb-8 prose-p:text-[16px] prose-p:font-medium
              prose-headings:text-gold-primary prose-headings:font-black prose-headings:tracking-tight prose-headings:font-outfit
              prose-h1:text-[26px] prose-h1:mb-16 prose-h1:text-center prose-h1:uppercase prose-h1:italic prose-h1:tracking-[0.1em]
              prose-h2:text-[19px] prose-h2:mb-8 prose-h2:mt-16 prose-h2:border-b prose-h2:border-gold-primary/10 prose-h2:pb-3 prose-h2:uppercase
              prose-h3:text-[17px] prose-h3:mb-6 prose-h3:mt-12 prose-h3:text-white/90
              prose-strong:text-gold-primary prose-strong:font-black
              prose-ul:list-disc prose-li:marker:text-gold-primary prose-li:text-white/90 prose-li:text-[16px]
              prose-hr:border-white/5 prose-hr:my-16
              prose-blockquote:border-l-2 prose-blockquote:border-l-gold-primary/50 prose-blockquote:text-white/60 prose-blockquote:italic prose-blockquote:bg-gold-primary/5 prose-blockquote:p-8 prose-blockquote:rounded-2xl"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {generatedDocument}
              </ReactMarkdown>
            </div>
            
            <div className="mt-32 flex flex-col items-center gap-4 text-[10px] font-black uppercase tracking-[0.6em] text-white/5 select-none font-outfit">
              <div className="w-12 h-px bg-white/10" />
              LEXMIND PRESTIGE LEGAL DRAFTER
              <div className="w-12 h-px bg-white/10" />
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
        "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300",
        active 
          ? "glass-prestige-gold text-gold-primary shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
          : "glass-prestige text-white/40 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
