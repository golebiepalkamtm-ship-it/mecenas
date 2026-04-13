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
  X
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
  const displayName = doc.title.replace(/\.[^/.]+$/, "");
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const typeLabel = isDraft ? "Pismo AI" : "Dokument";

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
          ? "bg-white/5 border-white/20 shadow-[0_10px_30px_rgba(255,255,255,0.05)] -translate-y-0.5" 
          : "bg-white/2 border-white/5 hover:bg-white/4"
      )}>
        {/* Left Section: Icon */}
        <div className={cn(
          "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-500 border mr-4",
          isDraft 
            ? "bg-white/10 text-white border-white/20" 
            : "bg-white/5 text-white/60 border-white/10"
        )}>
          {isDraft ? <Sparkles size={18} /> : <FileText size={18} />}
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
                doc.chunks ? "text-white" : "text-white/40"
              )}>
                <div className={cn("w-1 h-1 rounded-full", doc.chunks ? "bg-white animate-pulse" : "bg-white/10")} />
                {doc.chunks ? "Zaindeksowano" : "W kolejce"}
              </span>
              <span className="text-[8px] text-white/20 group-hover:text-white/40 uppercase font-outfit">
                {typeLabel} • {new Date(doc.created_at).toLocaleDateString('pl-PL')}
              </span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-3 shrink-0 ml-4">
            {doc.chunks && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-black text-white/30 uppercase tracking-widest font-outfit">
                {doc.chunks} FRAGMENTÓW
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
           <button
               onClick={(e) => {
                 e.stopPropagation();
                 onPreview(doc);
               }}
               className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/20"
               title="Pełny Ekran"
           >
               <Maximize2 size={16} />
           </button>
           <button
               onClick={(e) => {
                 e.stopPropagation();
                 onDelete(doc.id, doc.title);
               }}
               className="p-2 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
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
            className="absolute left-full top-0 w-80 bg-black/95 rounded-3xl border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.9)] z-50 p-6 pointer-events-none hidden lg:block backdrop-blur-md"
          >
             <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                      <FileSearch className="text-white/60" size={14} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Szybki Podgląd</span>
                      <span className="text-[7px] text-white/20 font-bold uppercase tracking-widest">Wgląd w treść obiektu</span>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <h5 className="text-[12px] font-black text-white leading-tight uppercase tracking-tight line-clamp-2">{capitalizedName}</h5>
                   <div className="text-[10.5px] text-white/60 line-clamp-6 leading-[1.6] font-inter italic border-l-2 border-white/20 pl-4 py-1">
                     {doc.content ? doc.content.substring(0, 400) + "..." : "Brak dostępnego podglądu treści."}
                   </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                   <div className="flex flex-col">
                      <span className="text-[7px] text-white/20 uppercase font-black">Segmenty</span>
                      <span className="text-[10px] text-white font-black">{doc.chunks || 0}</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-[7px] text-white/20 uppercase font-black">Typ</span>
                      <span className={cn("text-[10px] font-black uppercase", isDraft ? "text-white" : "text-white/40")}>{typeLabel}</span>
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
    <div className="h-full flex flex-col p-6 lg:p-10 lg:pt-28 space-y-6 overflow-x-hidden bg-black relative">
      <div className="flex flex-col md:flex-row gap-4 items-center mb-4 shrink-0">
        <div className="relative flex-1 group w-full">
           <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" />
           <input 
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="SZUKAJ W DOKUMENTACH OSOBISTYCH..."
             className="w-full h-11 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/30"
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
                <FileSearch size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white">Brak dokumentów pasujących do frazy</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full Preview Modal Overlay */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-500 flex items-center justify-center p-4 md:p-10 pointer-events-none">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl pointer-events-auto"
               onClick={() => setPreviewDoc(null)}
             />
             
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="w-full max-w-5xl h-full max-h-[90vh] bg-black rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden pointer-events-auto"
             >
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                         {previewDoc.type === 'draft' ? <Sparkles className="text-white/80" size={24} /> : <FileText className="text-white/80" size={24} />}
                      </div>
                      <div>
                         <h3 className="text-lg font-black uppercase tracking-tight text-white leading-none mb-1">{previewDoc.title}</h3>
                         <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Podgląd Pełnoekranowy Systemu LexMind</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleExport(previewDoc)}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/10"
                      >
                         {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                         EKSPORTUJ
                      </button>
                      <button 
                         onClick={() => setPreviewDoc(null)}
                         className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/10"
                      >
                         <X size={20} />
                      </button>
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-black">
                  <div className="max-w-3xl mx-auto prose prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewDoc.content}
                    </ReactMarkdown>
                  </div>
                </div>
                
                <div className="p-8 border-t border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Data Utworzenia</span>
                         <span className="text-[11px] font-bold text-white uppercase">{new Date(previewDoc.created_at).toLocaleString('pl-PL')}</span>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Typ Obiektu</span>
                         <span className="text-[11px] font-bold text-white/80 uppercase">{previewDoc.type}</span>
                      </div>
                   </div>
                   
                   <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">LexMind Mercury v2.7</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
