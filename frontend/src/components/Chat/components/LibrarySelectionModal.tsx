import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  X, 
  Trash2, 
  Database, 
  Layers, 
  Clock,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useKnowledgeBase } from '../../../hooks';
import { cn } from '../../../utils/cn';

interface LibrarySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (doc: { id: string; name: string; chunks: number; created_at: string }) => void;
}

export function LibrarySelectionModal({ isOpen, onClose, onSelect }: LibrarySelectionModalProps) {
  const { documents, removeFile, refresh } = useKnowledgeBase();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:h-[600px] z-[101] flex flex-col glass-prestige-gold rounded-[2.5rem] border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5 bg-white/2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gold-primary/10 flex items-center justify-center border border-gold-primary/20">
                  <Database className="w-5 h-5 text-gold-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Biblioteka Akt</h2>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">Repozytorium Przetworzonych Dokumentów</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 flex flex-col md:flex-row gap-4 items-center bg-white/2 border-b border-white/5">
              <div className="relative flex-1 group w-full">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-primary transition-colors" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SZUKAJ DOKUMENTU PRAWNEGO..."
                  className="w-full bg-black/40 border border-white/5 focus:border-gold-primary/30 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 placeholder:text-white/10 outline-none transition-all shadow-inner"
                />
              </div>
              
              <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-white/10 text-gold-primary" : "text-white/20 hover:text-white/40"
                  )}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === 'list' ? "bg-white/10 text-gold-primary" : "text-white/20 hover:text-white/40"
                  )}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>

            {/* List/Grid Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/10">
              {filteredDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                  <Database size={40} />
                  <span className="text-[10px] font-black uppercase tracking-[0.5em]">Biblioteka jest pusta</span>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocs.map((doc) => (
                    <motion.div
                      key={doc.id}
                      whileHover={{ scale: 1.02 }}
                      className="group relative h-40 rounded-3xl bg-white/2 border border-white/5 hover:border-gold-primary/30 p-5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden shadow-xl"
                      onClick={() => onSelect(doc)}
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-8 h-8 rounded-full bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center">
                            <Plus size={14} className="text-gold-primary" />
                         </div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-gold-primary transition-colors">
                            <FileText size={20} />
                         </div>
                         <div className="space-y-1">
                            <h3 className="text-[11px] font-black text-white/90 uppercase tracking-wider truncate leading-none">{doc.name}</h3>
                            <div className="flex items-center gap-2">
                               <Layers size={10} className="text-white/20" />
                               <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{doc.chunks} Segmentów</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-white/20" />
                          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                            {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Usunąć plik z biblioteki?')) removeFile(doc.name);
                          }}
                          className="text-white/10 hover:text-red-500 transition-colors p-1"
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
                      onClick={() => onSelect(doc)}
                      className="group flex items-center gap-4 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-gold-primary/20 transition-all cursor-pointer shadow-lg"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-gold-primary shrink-0 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="text-xs font-black text-white/80 uppercase tracking-wide truncate">{doc.name}</h3>
                         <div className="flex items-center gap-3 mt-1">
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1">
                               <Layers size={10} /> {doc.chunks} SEGMENTÓW
                            </span>
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1">
                               <Clock size={10} /> {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                            </span>
                         </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                         <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               if (window.confirm('Usunąć plik z biblioteki?')) removeFile(doc.name);
                            }}
                            className="w-8 h-8 rounded-xl hover:bg-red-500/10 text-white/5 hover:text-red-500 transition-all flex items-center justify-center"
                         >
                            <Trash2 size={14} />
                         </button>
                         <div className="w-8 h-8 rounded-xl bg-gold-primary/10 text-gold-primary flex items-center justify-center border border-gold-primary/20">
                            <ChevronRight size={14} />
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with summary */}
            <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                     <span className="text-[7px] font-black uppercase text-white/20 tracking-[0.3em]">Status Systemu</span>
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest">Aktywne Połączenie</span>
                     </div>
                  </div>
                  <div className="h-6 w-px bg-white/5" />
                  <div className="flex flex-col">
                     <span className="text-[7px] font-black uppercase text-white/20 tracking-[0.3em]">Pojemność</span>
                     <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{documents.length} Dokumenty / 1.5 GB</span>
                  </div>
               </div>
               
               <button 
                onClick={refresh}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all border border-white/5"
               >
                 Odśwież Listę
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
