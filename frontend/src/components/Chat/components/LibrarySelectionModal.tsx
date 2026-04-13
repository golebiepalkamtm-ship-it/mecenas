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
  Plus,
  Image as ImageIcon,
  GripHorizontal,
  Eye,
  FileSearch,
  SortAsc
} from 'lucide-react';
import { useKnowledgeBase, useUserLibrary } from '../../../hooks';
import { cn } from '../../../utils/cn';
import type { Document, KnowledgeDocument } from '../../../types/library';

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
  const library = useUserLibrary();
  const API_BASE = "http://localhost:8003";
  
  const documents = useMemo(() => {
    if (mode === 'all') return (rag.documents as KnowledgeDocument[]).map(d => ({ 
      id: d.id,
      name: d.name,
      chunks: d.chunks,
      created_at: d.created_at,
      type: d.type || 'document',
      isRAG: true 
    }));
    
    return (library.documents as Document[]).map(d => ({ 
      id: d.id, 
      name: d.title, 
      chunks: d.chunks || 0, 
      created_at: d.created_at, 
      type: d.type === 'uploaded' ? 'Dokument' : (d.type === 'draft' ? 'Pismo AI' : (d.type || 'Pismo')), 
      content: d.content || '', 
      isRAG: false 
    }));
  }, [mode, rag.documents, library.documents]);

  const refresh = () => {
    if (mode === 'all') rag.refresh();
    else library.refresh();
  };
  
  const removeFile = async (id: string, name: string) => {
    if (mode === 'all') {
      await rag.removeFile(name);
    } else {
      await library.removeDocument(id, name);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');
  const [selectedDocsMap, setSelectedDocsMap] = useState<Record<string, DocWithContent>>({});
  const [previewDoc, setPreviewDoc] = useState<DocWithContent | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handlePreview = async (doc: DocWithContent) => {
    setPreviewDoc(doc);
    if (!doc.content) {
      setIsPreviewLoading(true);
      try {
        const res = await fetch(`${API_BASE}/documents/content/${encodeURIComponent(doc.name)}`);
        const data = await res.json();
        if (data.success) {
          doc.content = data.content;
        }
      } catch (err) {
        console.error("Preview fetch failed:", err);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

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
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'date-asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'title-asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [documents, searchQuery, sortBy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-100"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[850px] md:h-[650px] z-1011 flex flex-col rounded-[2.5rem] glass-mercury-platinum overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-white/10 bg-white/5 select-none shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <GripHorizontal className="w-5 h-5 text-white/40" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">
                    {mode === 'all' ? 'Biblioteka Akt' : 'Dokumenty'}
                  </h2>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">
                    {mode === 'all' ? 'Wszystkie Zapisane Dokumenty' : 'Repozytorium Dokumentów i Skanów'}
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
            <div className="px-6 py-4 flex flex-col md:flex-row gap-4 items-center bg-white/5 border-b border-white/10">
              <div className="relative flex-1 group w-full">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SZUKAJ W AKTACH SPRAWY..."
                  className="w-full h-11 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/30"
                />
              </div>
              
              <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                 {[
                   { id: 'date-desc', icon: <ClockIcon size={12} />, label: 'Najnowsze' },
                   { id: 'title-asc',  icon: <SortAsc size={12} />, label: 'A-Z' },
                 ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as 'date-desc' | 'date-asc' | 'title-asc')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        sortBy === opt.id 
                          ? "bg-white text-black" 
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
                    viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === 'list' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
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
                          ? "bg-white/10 border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]" 
                          : "bg-white/5 border-white/5 hover:border-white/20"
                      )}
                      onClick={() => toggleSelection(doc as DocWithContent)}
                    >
                      <div className="absolute top-0 right-0 p-3 flex flex-col gap-2 z-20">
                         <div
                            className={cn(
                               "w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all",
                               selectedDocsMap[doc.id] ? "bg-white text-black scale-110" : "bg-white/10 text-white/40 opacity-0 group-hover:opacity-100"
                            )}
                         >
                            {selectedDocsMap[doc.id] ? <Plus className="rotate-45" size={14} /> : <Plus size={14} />}
                         </div>
                         <button
                            onClick={(e) => {
                               e.stopPropagation();
                               handlePreview(doc as DocWithContent);
                            }}
                            className="w-8 h-8 rounded-full bg-black/40 border border-white/10 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Eye size={14} />
                         </button>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                         <div className={cn(
                           "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                           selectedDocsMap[doc.id] ? "bg-white/20 text-white" : "bg-white/10 text-white/40 group-hover:text-white"
                         )}>
                            {doc.type === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                         </div>
                         <div className="space-y-1">
                            <h3 className="text-[11px] font-black text-white uppercase tracking-wider truncate leading-none">{doc.name}</h3>
                            <div className="flex items-center gap-2">
                               {doc.chunks > 0 && (
                                 <>
                                    <Layers size={10} className="text-white/40" />
                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{doc.chunks} SEGMENTÓW</span>
                                    <div className="w-1 h-1 rounded-full bg-white animate-pulse ml-1" title="RAG Ready" />
                                 </>
                               )}
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-md border border-white/10 shrink-0">
                          <ClockIcon size={10} className="text-white/40" />
                          <span className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none">
                            {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Usunąć plik z biblioteki?')) removeFile(doc.id, doc.name);
                          }}
                          className="text-white/40 hover:text-red-500 transition-colors p-1.5 bg-white/5 hover:bg-white/10 rounded-lg"
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
                          ? "bg-white/10 border-white/40"
                          : "bg-white/5 border-white/5 hover:border-white/20"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selectedDocsMap[doc.id] ? "bg-white text-black" : "bg-white/10 text-white/40 group-hover:text-white"
                      )}>
                        {selectedDocsMap[doc.id] ? <Plus className="rotate-45" size={16} /> : <FileText size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="text-xs font-black text-white uppercase tracking-wide truncate">{doc.name}</h3>
                         <div className="flex items-center gap-3 mt-1">
                             {doc.chunks > 0 && (
                               <span className="text-[8px] font-black text-white/40 uppercase tracking-widest border border-white/10 bg-white/5 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Layers size={10} className="text-white/40" /> {doc.chunks} SEGMENTÓW
                                  <div className="w-1 h-1 rounded-full bg-white animate-pulse ml-1" title="RAG Ready" />
                               </span>
                             )}
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded-md border border-white/10">
                               <ClockIcon size={10} className="text-white/30" /> {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                            </span>
                         </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(doc as DocWithContent);
                             }}
                             className="w-8 h-8 rounded-xl hover:bg-white/20 text-white/40 hover:text-white transition-all flex items-center justify-center"
                          >
                             <Eye size={14} />
                          </button>
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Usunąć plik z biblioteki?')) removeFile(doc.id, doc.name);
                             }}
                             className="w-8 h-8 rounded-xl hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all flex items-center justify-center"
                          >
                             <Trash2 size={14} />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/60 border-t border-white/10 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                     <span className="text-[7px] font-black uppercase text-white/20 tracking-[0.3em]">Status Systemu</span>
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Aktywne Połączenie</span>
                     </div>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Biblioteka Akt</h3>
                     <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Workspace Dokumentów</p>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                 <button 
                  onClick={refresh}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all border border-white/10"
                 >
                   Odśwież
                 </button>
                 <button 
                  onClick={handleApply}
                  disabled={Object.keys(selectedDocsMap).length === 0}
                  className={cn(
                     "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                     Object.keys(selectedDocsMap).length > 0
                        ? "bg-white text-black border-white shadow-lg shadow-white/10 hover:bg-white/90"
                        : "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                  )}
                 >
                   Załącz wybrane ({Object.keys(selectedDocsMap).length})
                 </button>
               </div>
             </div>

            {/* Preview Sidebar */}
            <AnimatePresence>
               {previewDoc && (
                 <motion.div
                   initial={{ x: '100%', opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ x: '100%', opacity: 0 }}
                   className="absolute top-0 right-0 w-80 h-full border-l border-white/10 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.9)] z-200"
                   style={{ background: 'rgba(10, 10, 10, 0.99)', backdropFilter: 'blur(20px)' }}
                 >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                             <FileSearch className="text-white/60" size={14} />
                          </div>
                          <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Podgląd Treści</h3>
                            <p className="text-[7px] text-white/20 font-bold uppercase tracking-widest mt-0.5">Analiza Dokumentu</p>
                          </div>
                       </div>
                       <button onClick={() => setPreviewDoc(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                          <X size={14} />
                       </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/40">
                       <h4 className="text-[11px] font-black uppercase tracking-wider text-white mb-4 leading-tight">{previewDoc.name}</h4>
                       
                       <div className="prose prose-invert prose-xs max-w-none text-[10px] text-white/60 leading-relaxed font-inter">
                          {previewDoc.content ? (
                             <div className="whitespace-pre-wrap">{previewDoc.content}</div>
                          ) : isPreviewLoading ? (
                             <div className="h-40 flex flex-col items-center justify-center space-y-3 opacity-30">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span className="text-[8px] font-black uppercase tracking-[0.2em]">Pobieranie...</span>
                             </div>
                          ) : (
                             <div className="italic opacity-50 bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                Treść dostępna po zaindeksowaniu w systemie RAG.
                             </div>
                          )}
                       </div>
                    </div>
                    
                    <div className="p-6 bg-white/5 border-t border-white/10">
                       <button
                          onClick={() => {
                             toggleSelection(previewDoc as DocWithContent);
                             setPreviewDoc(null);
                          }}
                          className={cn(
                            "w-full py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2",
                            selectedDocsMap[previewDoc.id]
                              ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                              : "bg-white text-black hover:bg-white/90"
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
