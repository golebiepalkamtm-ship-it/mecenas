import React, { useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  FileText
} from "lucide-react";
import { useKnowledgeBase } from "../../hooks";
import { NeonButton } from "../UI";
import { X, FileSearch, Maximize2 } from "lucide-react";

// Sub-components
import { DocumentCard } from "./components/DocumentCard";
import { KnowledgeStats } from "./components/KnowledgeStats";
import { KnowledgeFilters } from "./components/KnowledgeFilters";
import type { KnowledgeDocument, KnowledgeViewProps } from "./types";

export function KnowledgeView() {
  const { documents, uploadPDF, removeFile, isUploading } = useKnowledgeBase() as KnowledgeViewProps;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("wszystkie");
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadPDF(file);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: KnowledgeDocument) => {
      const name = doc.name.toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query);
      
      const matchesCategory =
        activeCategory === "wszystkie" ||
        (activeCategory === "kodeks" && name.includes("kodeks")) ||
        (activeCategory === "prawo" && (name.includes("prawo") || name.includes("ustawa"))) ||
        (activeCategory === "inne" && !name.includes("kodeks") && !name.includes("prawo") && !name.includes("ustawa"));

      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, activeCategory]);

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 lg:pt-8 space-y-6 overflow-hidden bg-prestige-view">
      <div className="mb-2">
        <h2 className="text-2xl font-black uppercase tracking-tight italic text-gold-gradient mb-1 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] font-outfit">
          Baza Wiedzy
        </h2>
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] font-outfit">
          Repozytorium Aktów Prawnych i Orzecznictwa
        </p>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt,.odt,.rtf"
        className="hidden"
      />

      {/* Documents List - Scrollable within viewport */}
      <section className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-2 pb-4 relative z-20">
        <div className="space-y-10 pb-6">
          <KnowledgeStats documentCount={documents.length} />
          <KnowledgeFilters 
             searchQuery={searchQuery}
             setSearchQuery={setSearchQuery}
             activeCategory={activeCategory}
             setActiveCategory={setActiveCategory}
             isUploading={isUploading}
             onUploadClick={() => fileInputRef.current?.click()}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredDocuments.map((doc: KnowledgeDocument, idx: number) => (
              <DocumentCard 
                 key={doc.id} 
                 doc={doc} 
                 index={idx} 
                 onDelete={(name) => {
                   if (confirm(`Czy na pewno usunąć ${name}?`)) removeFile(name);
                 }}
                 onPreview={() => setPreviewDoc(doc)}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredDocuments.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col items-center justify-center text-center space-y-6 glass-prestige rounded-[3rem] shadow-2xl relative overflow-hidden group py-16"
          >
            <div className="w-24 h-24 rounded-3xl glass-prestige-gold flex items-center justify-center text-gold-primary relative z-10 animate-nodeFloat mb-2 border border-white/10 shrink-0">
              <FileText size={32} />
              <div className="absolute -inset-2 border border-gold-primary/20 rounded-4xl animate-ping opacity-20" />
            </div>

            <div className="space-y-2 relative z-10 max-w-lg px-6">
              <h3 className="text-2xl font-black text-white italic tracking-tight uppercase text-gold-gradient leading-tight font-outfit">
                Pusta Baza Wiedzy
              </h3>
              <p className="text-[11px] text-white/40 max-w-xs mx-auto tracking-wide font-bold leading-relaxed font-outfit">
                Dodaj nowe pliki PDF, aby zasilić system RAG.
              </p>
            </div>

            <div className="flex items-center gap-3 relative z-10 pt-4">
               <NeonButton
                variant="secondary"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("wszystkie");
                }}
                className="h-10 px-6 border border-white/10 font-outfit"
                size="sm"
              >
                Resetuj filtry
              </NeonButton>
              <NeonButton
                onClick={() => fileInputRef.current?.click()}
                className="h-10 px-6 font-outfit"
                size="sm"
              >
                Prześlij pliki
              </NeonButton>
            </div>
          </motion.div>
        )}
      </section>

      {/* Quick Preview Overlay */}
      <AnimatePresence>
        {previewDoc && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-[400px] h-full glass-liquid-shell border-l border-white/10 z-101 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
            >
               <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-2xl bg-gold-primary/10 flex items-center justify-center border border-gold-primary/20 text-gold-primary">
                        <FileSearch size={20} />
                     </div>
                     <div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Podgląd Wiedzy</h3>
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Inspekcja Zasobów RAG</p>
                     </div>
                  </div>
                  <button onClick={() => setPreviewDoc(null)} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                     <X size={18} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <h4 className="text-[14px] font-black uppercase tracking-wider text-gold-primary mb-6 leading-tight">{previewDoc.name}</h4>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/2 rounded-2xl p-4 border border-white/5">
                          <span className="block text-[8px] text-white/20 uppercase font-black mb-1">Status Indeksowania</span>
                          <span className="text-[11px] text-emerald-400 font-black uppercase">Zakończono</span>
                       </div>
                       <div className="bg-white/2 rounded-2xl p-4 border border-white/5">
                          <span className="block text-[8px] text-white/20 uppercase font-black mb-1">Liczba Chunków</span>
                          <span className="text-[11px] text-gold-primary font-black">{previewDoc.chunks || 0}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <span className="block text-[9px] text-white/20 uppercase font-black tracking-widest">Informacje Techniczne</span>
                       <div className="prose prose-invert prose-xs max-w-none text-[11px] text-white/60 leading-relaxed font-outfit bg-black/40 p-6 rounded-3xl border border-white/5">
                          <p>Dokument został w pełni zaindeksowany i przemapowany na wektory przestrzenne o wysokiej gęstości.</p>
                          <p className="mt-4">Plik jest dostępny dla wszystkich modeli w systemie MOA jako źródło prawne (Source of Truth).</p>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                       <p className="text-[9px] text-white/30 italic">Pełna treść dokumentu jest chroniona i dostępna dla silnika RAG podczas generowania odpowiedzi. Podgląd wyświetla metadane oraz status gotowości operacyjnej.</p>
                    </div>
                  </div>
               </div>
               
               <div className="p-8 bg-white/2 border-t border-white/5">
                  <button
                     onClick={() => setPreviewDoc(null)}
                     className="w-full py-4 bg-gold-primary text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-gold-secondary transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold-primary/10"
                  >
                     <Maximize2 size={14} />
                     Zamknij Podgląd
                  </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
