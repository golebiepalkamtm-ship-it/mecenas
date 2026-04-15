import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Trash2, 
  Download, 
  Loader2,
  FileSearch,
  Sparkles,
  Maximize2,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useUserLibrary } from '../../hooks';
import { downloadAsMarkdown } from '../../utils/exportUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Document } from '../../types/library';

// ---------------------------------------------------------------------------
// DocumentListItem - Redesigned for Mercury Platinum aesthetic
// ---------------------------------------------------------------------------
function DocumentListItem({ 
  doc, 
  index, 
  onDelete, 
  onPreview 
}: { 
  doc: Document; 
  index: number; 
  onDelete: (id: string, title: string) => void;
  onPreview: (doc: Document) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
   const isDraft = doc.type === 'draft' || doc.type === 'Pismo AI';
  const isImage = doc.type === 'image';
  const displayName = doc.title.replace(/\.[^/.]+$/, "");
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const typeLabel = isDraft ? "Pismo AI" : (isImage ? "Zdjęcie" : "Dokument");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
          {isDraft ? <Sparkles size={18} /> : isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
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
                {typeLabel} • {new Date(doc.created_at).toLocaleDateString('pl-PL')}
              </span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-3 shrink-0 ml-4">
            {doc.chunks && (
              <span className="px-2 py-0.5 rounded-md glass-prestige text-[8px] font-black text-black/50 uppercase tracking-widest font-outfit">
                {doc.chunks} FRAGMENTÓW
              </span>
            )}
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
                 onPreview(doc);
               }}
               className="p-2 rounded-xl text-black/40 hover:text-black hover:glass-prestige transition-all"
               title="Pełny Ekran"
           >
               <Maximize2 size={16} />
           </button>
           <button
               onClick={(e) => {
                 e.stopPropagation();
                 onDelete(doc.id, doc.title);
               }}
               className="p-2 rounded-xl text-black/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
               title="Usuń"
           >
               <Trash2 size={16} />
           </button>
        </div>
      </div>

      {/* Hover Preview Panel */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 15 }}
            animate={{ opacity: 1, scale: 1, x: 25 }}
            exit={{ opacity: 0, scale: 0.95, x: 10 }}
            className="absolute left-full top-0 w-80 glass-liquid-convex rounded-3xl z-50 p-6 pointer-events-none hidden lg:block"
          >
             <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-black/5 pb-4">
                   <div className="w-8 h-8 rounded-lg glass-prestige flex items-center justify-center">
                      <FileSearch className="text-black/60" size={14} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Szybki Podgląd</span>
                      <span className="text-[7px] text-black/30 font-bold uppercase tracking-widest">Wgląd w treść obiektu</span>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <h5 className="text-[12px] font-black text-black leading-tight uppercase tracking-tight line-clamp-2">{capitalizedName}</h5>
                   <div className="text-[10.5px] text-black/70 line-clamp-6 leading-[1.6] font-inter italic border-l-2 border-black/10 pl-4 py-1">
                     {doc.content ? doc.content.substring(0, 400) + "..." : "Brak dostępnego podglądu treści."}
                   </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                   <div className="flex flex-col">
                      <span className="text-[7px] text-black/30 uppercase font-black">Segmenty</span>
                      <span className="text-[10px] text-black font-black">{doc.chunks || 0}</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-[7px] text-black/30 uppercase font-black">Typ</span>
                      <span className="text-[10px] font-black uppercase text-black/60">{typeLabel}</span>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DocumentsView() {
  const library = useUserLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filteredDocs = useMemo(() => {
    return (library.documents as Document[] || []).filter((doc: Document) => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [library.documents, searchQuery]);

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Czy na pewno usunąć "${title}"?`)) {
      await library.removeDocument(id, title);
    }
  };

  const handleExport = async (doc: Document) => {
    setIsExporting(true);
    try {
      await downloadAsMarkdown(doc.title, doc.content);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 space-y-6 overflow-x-hidden bg-transparent relative pt-[80px] lg:pt-[100px]">
      <div className="flex flex-col md:flex-row gap-4 items-center mb-4 shrink-0">
        <div className="relative flex-1 group w-full">
           <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors" />
           <input 
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="SZUKAJ W DOKUMENTACH OSOBISTYCH..."
             className="w-full h-11 glass-prestige-input rounded-xl pl-12 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-black placeholder:text-black/20 outline-none transition-all"
           />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 min-h-0">
        <div className="flex flex-col gap-3 pb-24">
          <AnimatePresence mode="popLayout">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc: Document, idx: number) => (
                <DocumentListItem 
                  key={doc.id} 
                  doc={doc} 
                  index={idx}
                  onDelete={handleDelete}
                  onPreview={setPreviewDoc}
                />
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 flex flex-col items-center justify-center opacity-40 text-center"
              >
                <div className="w-20 h-20 rounded-full glass-liquid-convex flex items-center justify-center mb-4">
                    <FileSearch size={32} className="text-black/40" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Brak dokumentów pasujących do frazy</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full Preview Modal Overlay */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 pointer-events-none">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/10 backdrop-blur-xl pointer-events-auto"
               onClick={() => setPreviewDoc(null)}
             />
             
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="w-full max-w-5xl h-full max-h-[90vh] glass-liquid-convex rounded-[2rem] flex flex-col overflow-hidden pointer-events-auto shadow-[0_60px_120px_rgba(0,0,0,0.2)]"
             >
                <div className="p-8 border-b border-black/10 flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl glass-prestige flex items-center justify-center">
                         {previewDoc.type === 'draft' ? <Sparkles className="text-black/60" size={24} /> : <FileText className="text-black/60" size={24} />}
                      </div>
                      <div>
                         <h3 className="text-lg font-black uppercase tracking-tight text-black leading-none mb-1">{previewDoc.title}</h3>
                         <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Podgląd Pełnoekranowy Systemu LexMind</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleExport(previewDoc)}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl glass-prestige-button-primary text-[10px] font-black uppercase tracking-widest text-black/80 transition-all"
                      >
                         {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                         EKSPORTUJ
                      </button>
                      <button 
                         onClick={() => setPreviewDoc(null)}
                         className="w-11 h-11 rounded-full glass-prestige flex items-center justify-center text-black/40 hover:text-black transition-all"
                      >
                         <X size={20} />
                      </button>
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-black/5">
                  <div className="max-w-3xl mx-auto prose prose-neutral">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewDoc.content}
                    </ReactMarkdown>
                  </div>
                </div>
                
                <div className="p-8 border-t border-black/10 flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black uppercase text-black/20 tracking-widest">Data Utworzenia</span>
                         <span className="text-[11px] font-bold text-black/60 uppercase">{new Date(previewDoc.created_at).toLocaleString('pl-PL')}</span>
                      </div>
                      <div className="w-px h-8 bg-black/10" />
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black uppercase text-black/20 tracking-widest">Typ Obiektu</span>
                         <span className="text-[11px] font-bold text-black/50 uppercase">{previewDoc.type}</span>
                      </div>
                   </div>
                   
                   <p className="text-[9px] font-black text-black/10 uppercase tracking-[0.5em]">LexMind Mercury v2.7</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
