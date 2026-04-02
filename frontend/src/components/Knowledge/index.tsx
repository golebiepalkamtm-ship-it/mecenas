import React, { useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Search
} from "lucide-react";
import { useKnowledgeBase } from "../../hooks";
import { NeonButton } from "../UI";

// Sub-components
import { DocumentCard } from "./components/DocumentCard";
import { KnowledgeStats } from "./components/KnowledgeStats";
import { KnowledgeFilters } from "./components/KnowledgeFilters";
import type { KnowledgeDocument, KnowledgeViewProps } from "./types";

export function KnowledgeView() {
  const { documents, uploadPDF, removeFile, isUploading } = useKnowledgeBase() as KnowledgeViewProps;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("wszystkie");
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
    <div className="h-full flex flex-col p-6 lg:p-10 lg:pt-8 space-y-6 overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf"
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

        <AnimatePresence mode="popLayout">
          {filteredDocuments.map((doc: KnowledgeDocument, idx: number) => (
            <DocumentCard 
               key={doc.id} 
               doc={doc} 
               index={idx} 
               onDelete={(name) => {
                 if (confirm(`Czy na pewno usunąć ${name}?`)) removeFile(name);
               }}
            />
          ))}
        </AnimatePresence>

        {filteredDocuments.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col items-center justify-center text-center space-y-6 glass-prestige rounded-[3rem] shadow-2xl relative overflow-hidden group py-16"
          >
            <div className="w-24 h-24 rounded-3xl glass-prestige-gold flex items-center justify-center text-gold-primary relative z-10 animate-nodeFloat mb-2 border border-white/10 shrink-0">
              <Search size={24} />
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
    </div>
  );
}
