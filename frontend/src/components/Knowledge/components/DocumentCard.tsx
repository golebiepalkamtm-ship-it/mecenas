import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  BookOpen, 
  Trash2, 
  FileSearch,
  Eye
} from "lucide-react";
import type { KnowledgeDocument } from "../types";
import { cn } from "../../../utils/cn";

interface DocumentCardProps {
  doc: KnowledgeDocument;
  onDelete: (name: string) => void;
  onPreview: () => void;
  index: number;
}

export function DocumentCard({ doc, onDelete, onPreview, index }: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCodeks = doc.name.toLowerCase().includes("kodeks");
  const displayName = doc.name.replace(/\.[^/.]+$/, "");
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex w-full"
    >
      <div className={cn(
        "relative flex w-full h-[72px] items-center rounded-2xl transition-all duration-500 overflow-hidden border px-3",
        isHovered 
          ? "glass-prestige-gold border-gold-primary/30 shadow-[0_10px_30px_rgba(212,175,55,0.15)] -translate-y-0.5" 
          : "glass-prestige border-white/5 hover:bg-white/2"
      )}>
        {/* Left Section: Icon */}
        <div className={cn(
          "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-500 border mr-4",
          isCodeks 
            ? "bg-gold-primary/10 text-gold-primary border-gold-primary/20" 
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
          {isCodeks ? <BookOpen size={18} /> : <FileText size={18} />}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex items-center justify-between mr-4">
          <div className="truncate">
            <h4 className="text-[12px] font-black text-white/90 tracking-tight leading-tight uppercase font-outfit truncate">
              {capitalizedName}
            </h4>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.2em] font-outfit flex items-center gap-1.5",
                doc.chunks ? "text-emerald-400" : "text-gold-primary/60"
              )}>
                <div className={cn("w-1 h-1 rounded-full", doc.chunks ? "bg-emerald-400 animate-pulse" : "bg-gold-primary/40")} />
                {doc.chunks ? "Operacyjny / RAG" : "Oczekiwanie"}
              </span>
              <span className="text-[8px] text-white/10 group-hover:text-gold-primary/40 uppercase font-outfit hidden sm:inline">
                ID: {String(doc.id).substring(0, 8)}
              </span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-3 shrink-0 ml-4">
            {doc.chunks && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-black text-white/30 uppercase tracking-widest font-outfit">
                {doc.chunks} FRAGMENTÓW
              </span>
            )}
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest flex items-center gap-1 font-outfit",
              isCodeks ? "text-gold-primary/60" : "text-emerald-400/60"
            )}>
              <FileSearch size={10} /> {doc.chunks ? "Dostępne w RAG" : "Indeksowanie..."}
            </span>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
           <button
               onClick={(e) => {
                 e.stopPropagation();
                 onPreview();
               }}
               className="p-2 rounded-xl text-white/40 hover:text-gold-primary hover:bg-gold-primary/10 transition-all border border-transparent hover:border-gold-primary/20"
               title="Podgląd"
           >
               <Eye size={16} />
           </button>
           <button
               onClick={(e) => {
                 e.stopPropagation();
                 onDelete(doc.name);
               }}
               className="p-2 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
               title="Usuń"
           >
               <Trash2 size={16} />
           </button>
        </div>
      </div>

      {/* Hover Preview Panel - Enhanced with follow-ish motion */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 15 }}
            animate={{ opacity: 1, scale: 1, x: 25 }}
            exit={{ opacity: 0, scale: 0.95, x: 10 }}
            className="absolute left-full top-0 w-80 glass-unified-frame rounded-3xl border border-gold-primary/30 shadow-[0_40px_100px_rgba(0,0,0,0.9)] z-50 p-6 pointer-events-none hidden lg:block"
          >
             <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <div className="w-8 h-8 rounded-lg bg-gold-primary/20 flex items-center justify-center border border-gold-primary/30">
                      <FileSearch className="text-gold-primary" size={14} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-primary">Szybki Podgląd</span>
                      <span className="text-[7px] text-white/20 font-bold uppercase tracking-widest">Wgląd w strukturę wiedzy</span>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <h5 className="text-[12px] font-black text-white leading-tight uppercase tracking-tight line-clamp-2">{capitalizedName}</h5>
                   <p className="text-[10.5px] text-white/60 leading-[1.6] font-inter italic border-l-2 border-gold-primary/20 pl-4 py-1">
                      System LexMind zmapował ten dokument na {doc.chunks || 0} fragmentów wektorowych. Obiekt jest gotowy do wykorzystania przez mechanizm MOA w procesach analizy RAG jako źródło prawnicze.
                   </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                   <div className="flex flex-col">
                      <span className="text-[7px] text-white/20 uppercase font-black">Segmenty</span>
                      <span className="text-[10px] text-gold-primary font-black">{doc.chunks || 0}</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-[7px] text-white/20 uppercase font-black">Weryfikacja</span>
                      <span className="text-[10px] text-emerald-400 font-black">100% / RAG</span>
                   </div>
                </div>
             </div>

             {/* Specular scanning effect */}
             <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none opacity-10">
                <div className="w-full h-px bg-gold-primary shadow-[0_0_15px_rgba(212,175,55,1)] animate-[scanline-scroll_3.5s_linear_infinite]" />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
