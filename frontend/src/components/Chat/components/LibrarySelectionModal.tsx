import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  X, 
  Trash2, 
  Database, 
  Layers, 
  Clock as ClockIcon,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  GripHorizontal,
  Eye,
  FileSearch,
  Maximize2,
  SortAsc
} from 'lucide-react';
import { useKnowledgeBase, useUserDocuments, useAIDrafts } from '../../../hooks';
import { cn } from '../../../utils/cn';

interface LibrarySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (docs: { id: string; name: string; chunks: number; created_at: string }[]) => void;
  mode?: 'all' | 'documents' | 'images';
}

interface DocWithContent {
  id: string;
  name: string;
  chunks: number;
  created_at: string;
  type: string;
  content?: string;
  isRAG?: boolean;
}

export function LibrarySelectionModal({ isOpen, onClose, onSelect, mode = 'all' }: LibrarySelectionModalProps) {
  const rag = useKnowledgeBase();
  const user = useUserDocuments();
  const aidrafts = useAIDrafts();
  
  const documents = useMemo(() => {
    if (mode === 'all') return rag.documents.map(d => ({ ...d, isRAG: true }));
    
    // Combine user docs (scans/uploads) and AI drafts
    const combined = user.documents.map(d => ({ ...d, isRAG: false }));
    
    aidrafts.drafts.forEach(d => {
       combined.push({
          id: d.id,
          name: d.title,
          chunks: 1,
          status: 'ready',
          created_at: d.created_at,
          type: 'document',
          content: d.content,
          isRAG: false
       });
    });
    
    return combined;
  }, [mode, rag.documents, user.documents, aidrafts.drafts]);

  const refresh = () => {
    if (mode === 'all') rag.refresh();
    else {
      user.refresh();
      aidrafts.refresh();
    }
  };
  
  const removeFile = async (name: string) => {
    if (mode === 'all') {
      await rag.removeFile(name);
    } else {
      const doc = user.documents.find(d => d.name === name);
      if (doc) await user.removeDocument(doc.id);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');
  const [selectedDocsMap, setSelectedDocsMap] = useState<Record<string, DocWithContent>>({});
  const [previewDoc, setPreviewDoc] = useState<DocWithContent | null>(null);

  const toggleSelection = (doc: DocWithContent) => {
    setSelectedDocsMap(prev => {
      const next = { ...prev };
      if (next[doc.id]) delete next[doc.id];
      else next[doc.id] = doc;
      return next;
    });
  };

  const handleApply = () => {
    const selectedList = Object.values(selectedDocsMap).map(d => ({
       id: d.id,
       name: d.name,
       chunks: d.chunks,
       created_at: d.created_at
    }));
    if (selectedList.length > 0) {
       onSelect(selectedList);
       onClose();
    }
  };

  const filteredDocs = useMemo(() => {
    return documents
      .filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = mode === 'all' || mode === 'images' || mode === 'documents'; 
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'date-asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'title-asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [documents, searchQuery, mode, sortBy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            id="draggable-modal"
            style={{ opacity: 1, backdropFilter: 'none' }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[850px] md:h-[650px] z-[1011] flex flex-col rounded-[2.5rem] glass-prestige-gold overflow-hidden"
          >
            {/* Header / Drag Handle */}
            <div 
              style={{ cursor: 'move' }}
              className="p-6 pb-4 flex items-center justify-between border-b border-white/10 bg-white/5 select-none shrink-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gold-primary/10 flex items-center justify-center border border-gold-primary/20">
                  <GripHorizontal className="w-5 h-5 text-gold-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">
                    {mode === 'all' ? 'Biblioteka Akt' : 'Dokumenty'}
                  </h2>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">
                    {mode === 'images' ? 'Repozytorium Dokumentów i Skanów' : 'Wszystkie Zapisane Dokumenty'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 flex flex-col md:flex-row gap-4 items-center bg-white/[0.03] border-b border-white/10">
              <div className="relative flex-1 group w-full">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-white transition-colors" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SZUKAJ W AKTACH SPRAWY..."
                  className="w-full h-11 bg-black/20 border border-white/20 rounded-xl pl-12 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/60 outline-none transition-all focus:border-gold-primary/50"
                />
              </div>
              
              
              <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                 {[
                   { id: 'date-desc', icon: <ClockIcon size={12} />, label: 'Najnowsze' },
                   { id: 'title-asc',  icon: <SortAsc size={12} />, label: 'A-Z' },
                 ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        sortBy === opt.id 
                          ? "bg-gold-primary text-black" 
                          : "text-white/40 hover:text-white"
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                 ))}
              </div>

              <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-white/10 text-gold-primary" : "text-white/40 hover:text-white"
                  )}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === 'list' ? "bg-white/10 text-gold-primary" : "text-white/40 hover:text-white"
                  )}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>

            {/* List/Grid Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/10">
              {filteredDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-4">
                  <Database size={40} />
                  <span className="text-[10px] font-black uppercase tracking-[0.5em]">Brak dokumentów</span>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocs.map((doc) => (
                    <motion.div
                      key={doc.id}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        "group relative h-40 rounded-3xl border p-5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden shadow-xl",
                        selectedDocsMap[doc.id] 
                          ? "glass-prestige-gold border-gold-primary bg-gold-primary/10 shadow-[0_0_30px_rgba(212,175,55,0.15)]" 
                          : "bg-white/5 border-white/10 hover:border-gold-primary/50"
                      )}
                      onClick={() => toggleSelection(doc as DocWithContent)}
                    >
                      <div className="absolute top-0 right-0 p-3 flex flex-col gap-2 z-20">
                         <div
                            className={cn(
                               "w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all",
                               selectedDocsMap[doc.id] ? "bg-gold-primary text-black scale-110" : "bg-white/10 text-white/40 opacity-0 group-hover:opacity-100"
                            )}
                         >
                            {selectedDocsMap[doc.id] ? <Plus className="rotate-45" size={14} /> : <Plus size={14} />}
                         </div>
                         <button
                            onClick={(e) => {
                               e.stopPropagation();
                               setPreviewDoc(doc as DocWithContent);
                            }}
                            className="w-8 h-8 rounded-full bg-black/40 border border-white/10 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Eye size={14} />
                         </button>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                         <div className={cn(
                           "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                           selectedDocsMap[doc.id] ? "bg-white/20 text-gold-primary" : "bg-white/10 text-white/60 group-hover:text-gold-primary"
                         )}>
                            {doc.type === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                         </div>
                         <div className="space-y-1">
                            <h3 className="text-[11px] font-black text-white uppercase tracking-wider truncate leading-none">{doc.name}</h3>
                            <div className="flex items-center gap-2">
                               {doc.chunks > 0 && (
                                 <>
                                   <Layers size={10} className="text-gold-primary" />
                                   <span className="text-[8px] font-black text-white uppercase tracking-widest">{doc.chunks} SEGMENTÓW</span>
                                 </>
                               )}
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-md border border-white/10 shrink-0">
                          <ClockIcon size={10} className="text-gold-primary" />
                          <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">
                            {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Usunąć plik z biblioteki?')) removeFile(doc.name);
                          }}
                          className="text-white/60 hover:text-red-500 transition-colors p-1.5 bg-white/5 hover:bg-white/10 rounded-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => toggleSelection(doc as DocWithContent)}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer shadow-lg",
                        selectedDocsMap[doc.id]
                          ? "glass-prestige-gold border-gold-primary bg-gold-primary/10"
                          : "bg-white/5 border-white/10 hover:border-gold-primary/40"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selectedDocsMap[doc.id] ? "bg-gold-primary text-black" : "bg-white/10 text-white/40 group-hover:text-gold-primary"
                      )}>
                        {selectedDocsMap[doc.id] ? <Plus className="rotate-45" size={16} /> : <FileText size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="text-xs font-black text-white uppercase tracking-wide truncate">{doc.name}</h3>
                         <div className="flex items-center gap-3 mt-1">
                             {doc.chunks > 0 && (
                               <span className="text-[8px] font-black text-white uppercase tracking-widest border border-gold-primary/30 bg-gold-primary/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Layers size={10} className="text-gold-primary" /> {doc.chunks} SEGMENTÓW
                               </span>
                             )}
                            <span className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded-md border border-white/10">
                               <ClockIcon size={10} className="text-gold-primary" /> {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                            </span>
                         </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDoc(doc as DocWithContent);
                             }}
                             className="w-8 h-8 rounded-xl hover:bg-white/20 text-white/40 hover:text-white transition-all flex items-center justify-center"
                          >
                             <Eye size={14} />
                          </button>
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Usunąć plik z biblioteki?')) removeFile(doc.name);
                             }}
                             className="w-8 h-8 rounded-xl hover:bg-red-500/20 text-white/80 hover:text-red-500 transition-all flex items-center justify-center"
                          >
                             <Trash2 size={14} />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with summary */}
            <div className="p-6 bg-black/40 border-t border-white/10 flex items-center justify-between shrink-0 opacity-100">
               <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                     <span className="text-[7px] font-black uppercase text-white/40 tracking-[0.3em]">Status Systemu</span>
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest">Aktywne Połączenie</span>
                     </div>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Centralna Biblioteka Akt</h3>
                    <p className="text-[8px] font-black text-gold-primary uppercase tracking-widest mt-1 opacity-90">Workspace Dokumentów</p>
                  </div>
               </div>
               
                
                <button 
                 onClick={handleApply}
                 disabled={Object.keys(selectedDocsMap).length === 0}
                 className={cn(
                    "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                    Object.keys(selectedDocsMap).length > 0
                      ? "bg-gold-primary text-black border-gold-primary shadow-lg shadow-gold-500/30 hover:bg-gold-400"
                      : "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                 )}
                >
                  Załącz wybrane ({Object.keys(selectedDocsMap).length})
                </button>
                
                <button 
                 onClick={refresh}
                 className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white hover:text-gold-primary transition-all border border-white/10"
                >
                  Odśwież
                </button>
             </div>

            {/* Preview Sidebar - ARCHITECTURAL OVERLAY */}
            <AnimatePresence>
               {previewDoc && (
                 <motion.div
                   initial={{ x: '100%', opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ x: '100%', opacity: 0 }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="absolute top-0 right-0 w-80 h-full border-l border-gold-primary/40 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.9)] z-[200]"
                   style={{ background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(30px)' }}
                 >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gold-primary/20 flex items-center justify-center">
                             <FileSearch className="text-gold-primary" size={14} />
                          </div>
                          <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Podgląd Treści</h3>
                            <p className="text-[7px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Analiza Dokumentu</p>
                          </div>
                       </div>
                       <button onClick={() => setPreviewDoc(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                          <X size={14} />
                       </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
                       <h4 className="text-[11px] font-black uppercase tracking-wider text-gold-primary mb-4 leading-tight">{previewDoc.name}</h4>
                       
                       <div className="prose prose-invert prose-xs max-w-none text-[11px] text-white/70 leading-relaxed font-outfit">
                          {previewDoc.content ? (
                             <div className="whitespace-pre-wrap">{previewDoc.content}</div>
                          ) : previewDoc.isRAG ? (
                             <div className="italic opacity-50 bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                               Treść dostępna po zaindeksowaniu w systemie RAG. Wybierz dokument, aby użyć go w kontekście.
                             </div>
                          ) : (
                             <div className="italic opacity-50 bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                               Podgląd treści niedostępny dla tego typu pliku (skan / obraz). System OCR przetworzy go po wysłaniu.
                             </div>
                          )}
                       </div>
                    </div>
                    
                    <div className="p-6 bg-white/5 border-t border-white/10 backdrop-blur-md">
                       <button
                          onClick={() => {
                             toggleSelection(previewDoc as DocWithContent);
                             setPreviewDoc(null);
                          }}
                          className={cn(
                            "w-full py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2",
                            selectedDocsMap[previewDoc.id]
                              ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                              : "bg-gold-primary text-black hover:bg-gold-secondary"
                          )}
                       >
                          {selectedDocsMap[previewDoc.id] ? <X size={12} /> : <Plus size={12} />}
                          {selectedDocsMap[previewDoc.id] ? "Usuń Wybór" : "Dodaj do wyboru"}
                       </button>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
