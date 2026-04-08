import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Trash2, 
  Download, 
  Printer, 
  Clock,
  ChevronRight,
  Loader2,
  FileSearch
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { downloadAsMarkdown } from '../../utils/exportUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function SmallDocThumbnail({ title }: { title: string }) {
  const extension = title.split('.').pop()?.toUpperCase() || 'DOC';
  
  return (
    <div className="relative w-full h-20 bg-black/40 rounded-xl border border-white/5 overflow-hidden flex flex-col gap-1 p-2.5">
       <div className="w-full h-1 bg-white/10 rounded-full" />
       <div className="w-[85%] h-1 bg-white/5 rounded-full" />
       <div className="w-full h-1 bg-white/5 rounded-full" />
       
       <div className="mt-auto flex items-end justify-between">
          <div className="space-y-0.5">
             <div className="w-10 h-0.5 bg-gold-primary/10 rounded-full" />
             <div className="w-6 h-0.5 bg-gold-primary/10 rounded-full" />
          </div>
          <span className="text-[6px] font-black text-white/20 tracking-widest border border-white/10 px-1 py-0.5 rounded-sm">
             {extension}
          </span>
       </div>

       <div className="absolute bottom-1 right-1 opacity-5">
          <FileText size={32} className="text-white" />
       </div>
    </div>
  );
}

interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  session_id?: string;
}

function DocumentListItem({ 
  doc, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  doc: Document; 
  isSelected: boolean; 
  onSelect: (doc: Document) => void;
  onDelete: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(doc)}
      className={cn(
        "cursor-pointer transition-all group relative flex flex-col h-[280px]",
        isSelected
          ? "glass-prestige-gold rounded-4xl border-gold-primary/30 shadow-[0_0_60px_rgba(212,175,55,0.25)] -translate-y-1"
          : "glass-prestige rounded-4xl border-white/5 hover:border-gold-primary/20 hover:bg-white/2"
      )}
    >
      {/* Miniature Section */}
      <div className="p-4 pb-0">
         <SmallDocThumbnail title={doc.title} />
      </div>

      {/* Visual Accent */}
      <div className={cn(
        "h-1 w-full",
        isSelected ? "bg-gold-primary" : "bg-white/5"
      )} />

      <div className="p-6 flex flex-col justify-between h-full relative z-10">
         <div className="space-y-4">
            <div className="flex items-center justify-between">
               <div className={cn(
                 "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                 isSelected 
                   ? "bg-gold-primary/20 border-gold-primary/40 text-gold-primary shadow-[0_0_20px_rgba(212,175,55,0.2)]" 
                   : "glass-ultra-morphism border-white/10 text-slate-400 group-hover:text-gold-primary group-hover:border-gold-primary/20"
               )}>
                 <FileText size={20} />
               </div>
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
               </div>
            </div>

            <div>
               <h4 className="text-[14px] font-black leading-tight mb-2 line-clamp-2 uppercase tracking-tight font-outfit">
                 {doc.title}
               </h4>
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                 <span className="text-[8px] font-extrabold uppercase tracking-widest text-gold-primary/60 bg-gold-primary/5 px-2 py-0.5 rounded-md border border-gold-primary/10">
                   {doc.type}
                 </span>
               </div>
            </div>
         </div>

         <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
               <Clock size={10} className="text-gold-primary/30" />
               {new Date(doc.created_at).toLocaleDateString('pl-PL')}
            </div>
            <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
               <span className="text-[7px] font-black uppercase tracking-widest text-gold-primary opacity-0 group-hover:opacity-100 transition-opacity">Otwórz</span>
               <ChevronRight size={14} className="text-gold-primary/40 group-hover:text-gold-primary" />
            </div>
         </div>
      </div>

      {/* Background Pattern Glow */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gold-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-gold-primary/10 transition-colors" />

      {/* Hover Preview Panel */}
      <AnimatePresence>
        {isHovered && !isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 p-6 flex flex-col justify-end glass-prestige-gold rounded-4xl border border-gold-primary/40 shadow-[0_30px_70px_rgba(0,0,0,0.8)] pointer-events-none"
          >
             <div className="space-y-3">
                <div className="flex items-center gap-2 text-gold-primary">
                   <FileSearch size={14} />
                   <span className="text-[9px] font-black uppercase tracking-widest">Podgląd Architektoniczny</span>
                </div>
                <h5 className="text-[12px] font-black leading-tight line-clamp-2 uppercase">{doc.title}</h5>
                <div className="flex items-center gap-2">
                   <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gold-primary animate-pulse" />
                   </div>
                   <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Gotowy</span>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DocumentsView() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: unknown) {
      console.error('Error fetching documents:', err);
      // setError('Nie udało się pobrać dokumentów.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten dokument?')) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
    } catch {
      alert('Błąd podczas usuwania dokumentu.');
    }
  };

  const handlePrint = (doc: Document) => {
    // Create print container
    let printDiv = document.getElementById('print-document-container');
    if (!printDiv) {
      printDiv = document.createElement('div');
      printDiv.id = 'print-document-container';
      document.body.appendChild(printDiv);
    }
    
    // We'll use a hidden div that we fill with content for printing
    // The index.css takes care of showing only this div during printing
    printDiv.innerHTML = `
      <div class="legal-document-print">
        ${doc.content.split('\n').map(line => {
          if (line.startsWith('# ')) return `<h1>${line.replace('# ', '')}</h1>`;
          if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
          if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
          if (line.trim() === '') return '';
          return `<p>${line}</p>`;
        }).join('')}
      </div>
    `;
    
    window.print();
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {/* Header Area */}
      <div className="p-6 lg:p-10 pb-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight italic text-gold-primary mb-1 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              Biblioteka Pism
            </h2>
            <p className="text-[9px] font-black text-gold-primary/40 uppercase tracking-[0.3em]">
              Archiwum Dokumentów Procesowych
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text"
                placeholder="Szukaj dokumentów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-prestige rounded-xl py-2 pl-9 pr-4 text-[11px] text-white focus:outline-none focus:border-gold-primary/40 w-[200px] lg:w-[300px] transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden px-6 lg:px-10 pb-8 gap-6">
        {/* Sidebar/Main: Document List */}
        <div className={cn(
          "overflow-y-auto custom-scrollbar transition-all duration-500 pr-2",
          selectedDoc 
            ? "w-1/3 hidden lg:flex flex-col gap-3" 
            : "w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start"
        )}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Loader2 size={32} className="animate-spin text-gold-primary mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Wczytywanie dokumentów...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center border-2 border-dashed border-gold-muted/10 rounded-4xl">
              <FileText size={48} className="text-slate-600 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brak dokumentów</p>
              <p className="text-[8px] font-bold text-slate-600 mt-2 max-w-[200px]">Wygeneruj pismo w Kreatorze Pism, aby pojawiło się tutaj.</p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <DocumentListItem 
                key={doc.id}
                doc={doc}
                isSelected={selectedDoc?.id === doc.id}
                onSelect={setSelectedDoc}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Preview: Selected Document Content */}
        <AnimatePresence>
          {selectedDoc && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col glass-prestige rounded-4xl overflow-hidden"
            >
              {/* Preview Actions */}
              <div className="p-6 border-b border-gold-muted/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                   <button 
                     onClick={() => setSelectedDoc(null)}
                     className="lg:hidden p-2 text-slate-400 hover:text-white"
                   >
                     <ChevronRight className="rotate-180" size={20} />
                   </button>
                   <div>
                     <h3 className="text-[13px] font-black uppercase tracking-tight">{selectedDoc.title}</h3>
                     <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                       {selectedDoc.type} • {new Date(selectedDoc.created_at).toLocaleString('pl-PL')}
                     </p>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePrint(selectedDoc)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-primary text-black text-[9px] font-black uppercase tracking-wider hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20"
                  >
                    <Printer size={12} fill="currentColor" />
                    Drukuj PDF
                  </button>
                  <button 
                    onClick={() => downloadAsMarkdown(selectedDoc.title, selectedDoc.content)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl glass-prestige-teal text-blue-400 text-[9px] font-black uppercase tracking-wider hover:bg-blue-500/10 transition-all border border-blue-400/20"
                  >
                    <Download size={12} />
                    Markdown
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                <div className="prose dark:prose-invert max-w-none prose-headings:text-gold-primary prose-headings:font-black prose-p:text-slate-300 prose-p:leading-relaxed text-[14px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedDoc.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
