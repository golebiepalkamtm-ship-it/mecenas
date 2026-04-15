import { useState } from "react";
import { motion } from "framer-motion";
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

export function DocumentCard({ doc, onDelete, index }: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCodeks = doc.name.toLowerCase().includes("kodeks");
  const displayName = doc.name.replace(/\.[^/.]+$/, "");
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const fileExtension = doc.name.includes(".") ? doc.name.split(".").pop()?.toUpperCase() : "PLIK";

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
        "relative flex w-full h-[72px] items-center rounded-2xl transition-all duration-500 overflow-hidden border px-4",
        isHovered
          ? "glass-liquid-convex -translate-y-1 shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
          : "bg-black/5 border-black/5 hover:bg-black/10"
      )}>
        {/* Left Section: Icon */}
        <div className={cn(
          "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-500 border mr-4",
          isHovered ? "glass-prestige-button-primary border-white/40" : "bg-black/5 text-black/40 border-black/10"
        )}>
          {isCodeks ? <BookOpen size={18} /> : <FileText size={18} />}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex items-center justify-between mr-4">
          <div className="truncate">
            <h4 className="text-[12px] font-black text-black/80 tracking-tight leading-tight uppercase font-outfit truncate">
              {capitalizedName}
            </h4>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.2em] font-outfit flex items-center gap-1.5",
                doc.chunks ? "text-black/60" : "text-black/30"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", doc.chunks ? "bg-emerald-500 animate-pulse" : "bg-black/10")} />
                {doc.chunks ? "Zaindeksowano" : "W kolejce"}
              </span>
              <span className="text-[8px] text-black/20 group-hover:text-black/40 uppercase font-outfit">
                {fileExtension} • ID: {String(doc.id).substring(0, 8)}
              </span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-3 shrink-0 ml-4">
            {doc.chunks && (
              <span className="px-2 py-0.5 rounded-md glass-prestige text-[8px] font-black text-black/50 uppercase tracking-widest font-outfit">
                {doc.chunks} FRAGMENTÓW
              </span>
            )}
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest flex items-center gap-1 font-outfit",
              isCodeks ? "text-black/55" : "text-black/55"
            )}>
              <FileSearch size={10} /> {doc.chunks ? "Dostępne w RAG" : "Indeksowanie..."}
            </span>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className={cn(
          "flex items-center gap-1 transition-opacity ml-auto",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
           <button
               onClick={(e) => {
                 e.stopPropagation();
                  onDelete(doc.name);
                }}
                className="p-2 rounded-xl text-black/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                title="Usuń"
            >
                <Trash2 size={16} />
            </button>
         </div>
      </div>
    </motion.div>
  );
}
