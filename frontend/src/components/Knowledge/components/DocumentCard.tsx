import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  BookOpen, 
  Trash2, 
  FileSearch
} from "lucide-react";
import type { KnowledgeDocument } from "../types";
import { cn } from "../../../utils/cn";

interface DocumentCardProps {
  doc: KnowledgeDocument;
  onDelete: (name: string) => void;
  index: number;
}

function SmallThumbnail({ isCodeks, filename }: { isCodeks: boolean, filename: string }) {
  const extension = filename.split('.').pop()?.toUpperCase() || 'DOC';
  
  return (
    <div className={cn(
      "relative w-full h-24 bg-black/40 rounded-xl border border-white/5 overflow-hidden flex flex-col gap-1.5 p-3 group-hover:border-gold-primary/20 transition-colors",
      isCodeks ? "bg-gold-primary/2 shadow-inner" : "bg-teal-500/2"
    )}>
       <div className="w-full h-1 bg-white/10 rounded-full" />
       <div className="w-[85%] h-1 bg-white/5 rounded-full" />
       <div className="w-full h-1 bg-white/5 rounded-full" />
       
       <div className="mt-auto flex items-end justify-between">
          <div className="space-y-1">
             <div className="w-12 h-1 bg-gold-primary/10 rounded-full" />
             <div className="w-8 h-1 bg-gold-primary/10 rounded-full" />
          </div>
          <span className="text-[7px] font-black text-white/20 tracking-widest border border-white/10 px-1.5 py-0.5 rounded-sm">
             {extension}
          </span>
       </div>

       <div className="absolute bottom-2 right-2 opacity-5 pointer-events-none">
          <FileText size={40} className="text-white" />
       </div>
    </div>
  );
}

export function DocumentCard({ doc, onDelete, index }: DocumentCardProps) {
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
      className="group relative flex flex-col h-[280px]"
    >
      <div className={cn(
        "relative flex flex-col h-full rounded-[2.5rem] transition-all duration-500 overflow-hidden border",
        isHovered 
          ? "glass-prestige-gold border-gold-primary/30 shadow-[0_20px_50px_rgba(212,175,55,0.2)] -translate-y-2" 
          : "glass-prestige border-white/5 hover:bg-white/2"
      )}>
        {/* Miniature View */}
        <div className="p-4 pb-0">
           <SmallThumbnail isCodeks={isCodeks} filename={doc.name} />
        </div>

        {/* Top Section: Icon & Actions */}
        <div className="p-4 flex items-start justify-between">
           <div className={cn(
             "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border",
             isCodeks 
               ? "bg-gold-primary/10 text-gold-primary border-gold-primary/20" 
               : "bg-teal-500/10 text-teal-400 border-teal-500/20"
           )}>
             {isCodeks ? <BookOpen size={18} /> : <FileText size={18} />}
           </div>

           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.name);
                  }}
                  className="p-2 rounded-xl text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  title="Usuń"
              >
                  <Trash2 size={14} />
              </button>
           </div>
        </div>

        {/* Content Section */}
        <div className="px-6 flex-1 min-w-0">
          <h4 className="text-[14px] font-black text-white/90 tracking-tight line-clamp-2 leading-tight uppercase font-outfit mb-2">
            {capitalizedName}
          </h4>
          
          <div className="flex flex-wrap items-center gap-3">
            {doc.chunks && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[7px] font-black text-white/30 uppercase tracking-widest font-outfit">
                {doc.chunks} CHUNKS
              </span>
            )}
            <span className={cn(
              "text-[7px] font-black uppercase tracking-widest flex items-center gap-1 font-outfit",
              isCodeks ? "text-gold-primary/60" : "text-teal-400/60"
            )}>
              <FileSearch size={9} /> SCAN READY
            </span>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-auto p-4 bg-white/2 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", isHovered ? "bg-gold-primary animate-pulse" : "bg-white/20")} />
              <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] font-outfit">Status: Verified</span>
           </div>
           <div className="text-[8px] font-black text-white/10 group-hover:text-gold-primary/40 uppercase tracking-widest font-outfit">
             ID: {doc.id.substring(0, 6)}
           </div>
        </div>
      </div>

      {/* Hover Preview Panel */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            className="absolute left-[105%] top-0 w-64 glass-prestige-gold rounded-3xl border border-gold-primary/40 shadow-[0_30px_70px_rgba(0,0,0,0.8)] z-50 p-6 pointer-events-none hidden xl:block"
          >
             <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gold-primary/20 pb-3">
                   <FileSearch className="text-gold-primary" size={16} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-primary">Szybki Podgląd</span>
                </div>
                
                <div className="space-y-2">
                   <h5 className="text-[12px] font-black text-white leading-tight uppercase tracking-tight">{capitalizedName}</h5>
                   <p className="text-[9px] text-white/40 leading-relaxed italic">System MOA zweryfikował strukturę dokumentu. Gotowy do analizy RAG.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                   <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                      <span className="block text-[7px] text-white/20 uppercase font-black">Segmenty</span>
                      <span className="text-[10px] text-gold-primary font-black">{doc.chunks || 0}</span>
                   </div>
                   <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                      <span className="block text-[7px] text-white/20 uppercase font-black">Weryfikacja</span>
                      <span className="text-[10px] text-emerald-400 font-black">100%</span>
                   </div>
                </div>
             </div>

             {/* Animated Scan Line */}
             <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none opacity-20">
                <div className="w-full h-1 bg-gold-primary blur-md animate-[scanline-scroll_4s_linear_infinite]" />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
