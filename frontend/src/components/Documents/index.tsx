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
  Loader2
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

interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  session_id?: string;
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
        {/* Sidebar: Document List */}
        <div className={cn(
          "flex flex-col gap-3 overflow-y-auto custom-scrollbar transition-all duration-300",
          selectedDoc ? "w-1/3 hidden lg:flex" : "w-full"
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
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={cn(
                  "p-4 rounded-2xl cursor-pointer transition-all group relative overflow-hidden",
                  selectedDoc?.id === doc.id
                    ? "glass-prestige-gold shadow-lg"
                    : "glass-prestige opacity-70 hover:opacity-100"
                )}
              >
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20",
                      selectedDoc?.id === doc.id ? "glass-prestige-gold text-amber-400" : "glass-ultra-morphism text-amber-400/50"
                    )}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-black leading-tight mb-1 truncate max-w-[180px]">
                        {doc.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gold-primary/60">
                          {doc.type}
                        </span>
                        <span className="text-[8px] text-slate-500 flex items-center gap-1">
                          <Clock size={8} />
                          {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                </div>
              </motion.div>
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
