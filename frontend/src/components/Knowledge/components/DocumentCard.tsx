import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, BookOpen, Trash2, FileSearch } from 'lucide-react';
import type { KnowledgeDocument } from '../types';
import { cn } from '../../../utils/cn';
import { formatDocumentTitle } from '../../../utils/documentTitle';
import { libraryRowClasses } from '../../Library/shared';

interface DocumentCardProps {
  doc: KnowledgeDocument;
  onDelete: (name: string) => void;
  index: number;
}

export function DocumentCard({ doc, onDelete, index }: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const isCodeks = doc.name.toLowerCase().includes('kodeks');
  const displayName = formatDocumentTitle(doc.name);
  const fileExtension = doc.name.includes('.') ? doc.name.split('.').pop()?.toUpperCase() : 'PLIK';
  const indexed = Boolean(doc.chunks && doc.chunks > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex w-full min-w-0"
    >
      <div className={libraryRowClasses(isHovered)}>
        <div
          className={cn(
            'w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border mr-3 transition-colors',
            isHovered ? 'border-gold-primary/35 bg-gold-primary/10 text-gold-deep' : 'bg-white/50 text-black/35 border-black/8',
          )}
        >
          {isCodeks ? <BookOpen size={18} /> : <FileText size={18} />}
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
          <div className="min-w-0 truncate">
            <h4 className="text-[12px] font-black text-black/85 tracking-tight font-outfit truncate">
              {displayName}
            </h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span
                className={cn(
                  'text-[8px] font-black uppercase tracking-[0.18em] font-outfit flex items-center gap-1.5',
                  indexed ? 'text-[#1a6b52]' : 'text-black/35',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', indexed ? 'bg-emerald-500' : 'bg-black/15')} />
                {indexed ? 'Zaindeksowano' : 'W kolejce'}
              </span>
              <span className="text-[8px] text-black/35 uppercase font-outfit">
                {fileExtension}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {doc.chunks ? (
              <span className="px-2 py-0.5 rounded-md library-view-cell text-[8px] font-admin-mono font-medium text-black/55">
                {doc.chunks} frag.
              </span>
            ) : null}
            <span className="text-[8px] font-black uppercase tracking-widest text-black/40 flex items-center gap-1 font-outfit">
              <FileSearch size={10} />
              {indexed ? 'RAG' : '…'}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc.name);
            }}
            onMouseEnter={() => setHoveredButton('delete')}
            onMouseLeave={() => setHoveredButton(null)}
            className={cn(
              'p-2 rounded-lg text-black/35 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200/60 transition-all ml-1 shrink-0',
              isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-100',
            )}
          >
            <Trash2 size={16} />
          </button>
          <AnimatePresence>
            {hoveredButton === 'delete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute bottom-full right-0 mb-2 w-32 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
              >
                <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                  Usuń dokument
                </p>
                <div className="absolute top-full right-4 -mt-px w-2 h-2 bg-white border-l border-b border-black/10 -rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
