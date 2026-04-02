import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  BookOpen, 
  Layers, 
  Trash2, 
  FileSearch
} from "lucide-react";
import type { KnowledgeDocument } from "../types";

interface DocumentCardProps {
  doc: KnowledgeDocument;
  onDelete: (name: string) => void;
  index: number;
}

export function DocumentCard({ doc, onDelete, index }: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCodeks = doc.name.toLowerCase().includes("kodeks");
  const displayName = doc.name.replace(/\.[^/.]+$/, "");
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      <div className={`relative flex items-center gap-5 p-3.5 rounded-2xl transition-all duration-300 ${
        isHovered 
          ? "glass-prestige-gold bg-gold-primary/3 translate-x-1" 
          : "glass-prestige hover:bg-white/2"
      }`}>
        {/* Compact Document Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
          isCodeks 
            ? "bg-gold-primary/10 text-gold-primary border border-gold-primary/20" 
            : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
        } group-hover:shadow-[0_0_15px_rgba(212,175,55,0.15)]`}>
          {isCodeks ? <BookOpen size={16} /> : <FileText size={16} />}
        </div>

        {/* Identity & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="text-[13px] font-bold text-white/90 tracking-tight truncate group-hover:text-white transition-colors font-outfit">
              {capitalizedName}
            </h4>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[7px] font-bold text-white/20 uppercase tracking-widest text-nowrap font-outfit">
              ID: {doc.id.substring(0, 6)}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mt-0.5">
            {doc.chunks && (
              <div className="flex items-center gap-1 text-[8px] font-bold text-white/40 uppercase tracking-[0.2em] font-outfit">
                <Layers size={9} className="opacity-60" />
                {doc.chunks} segmentów
              </div>
            )}
            <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-500/40 uppercase tracking-[0.2em] font-outfit">
              <FileSearch size={9} className="opacity-50" />
              Skanowanie RAG
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-6 shrink-0 pr-2">
            <div className="hidden md:block">
                <span className={`px-2.5 py-1 rounded-lg text-[7px] font-bold tracking-[0.3em] uppercase transition-all duration-500 font-outfit ${
                    isHovered ? "bg-gold-primary text-black" : "bg-white/5 text-white/20"
                }`}>
                    Zweryfikowano
                </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc.name);
                    }}
                    className="p-2 rounded-lg text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="Usuń"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>

        {/* Left Indicator Strip */}
        <div className={`absolute left-0 inset-y-3 w-[2px] rounded-r-full transition-all duration-500 ${
            isHovered 
                ? (isCodeks ? "bg-gold-primary shadow-[0_0_10px_#FFD780]" : "bg-teal-400 shadow-[0_0_10px_#2DD4BF]")
                : "bg-white/5"
        }`} />
      </div>

      {/* Subtle Separator */}
      <div className="absolute left-14 right-0 -bottom-px h-px bg-white/3 group-last:hidden" />
    </motion.div>
  );
}
