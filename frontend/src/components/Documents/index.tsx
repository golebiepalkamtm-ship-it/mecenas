import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Trash2,
  Download,
  Loader2,
  Maximize2,
  X,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from 'lucide-react';
import { LexIcon } from '../Layout/LexIcon';
import { cn } from '../../utils/cn';
import { useUserLibrary } from '../../hooks';

import { downloadAsMarkdown } from '../../utils/exportUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Document } from '../../types/library';
import { API_BASE } from '../../config';
import { formatDocumentTitle } from '../../utils/documentTitle';
import {
  DOCUMENTS_SHELL,
  LibraryHero,
  LibraryStatPill,
  LibraryToolbar,
  LibrarySearch,
  LibraryEmptyState,
  LibraryListBody,
  libraryRowClasses,
} from '../Library/shared';

function DocumentListItem({
  doc,
  onDelete,
  onPreview,
  selected,
  onToggleSelect,
  selectionActive,
}: {
  doc: Document;
  onDelete: (id: string, title: string) => void;
  onPreview: (doc: Document) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  selectionActive: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const isDraft = doc.type === 'draft' || doc.type === 'Pismo AI';
  const isImage = doc.type === 'image';
  const displayName = formatDocumentTitle(doc.title);

  const indexed = true; // placeholder since there is no doc.indexed ?
  const typeLabel = doc.type || 'Dokument';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex w-full min-w-0"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onPreview(doc)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview(doc);
          }
        }}
        className={cn(libraryRowClasses(isHovered, selected), 'cursor-pointer')}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(doc.id);
          }}
          className={cn(
            'shrink-0 mr-2 p-1 rounded-lg transition-all',
            selectionActive || selected || isHovered
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto',
            selected ? 'text-black' : 'text-black/30 hover:text-black/60',
          )}
          title={selected ? 'Odznacz' : 'Zaznacz'}
        >
          {selected ? <CheckSquare size={17} /> : <Square size={17} />}
        </button>

        <div
          className={cn(
            'w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border mr-3 transition-colors',
            isHovered ? 'border-gold-primary/35 bg-gold-primary/12' : 'bg-white/50 text-black/35 border-black/8',
          )}
        >
          {isDraft ? <LexIcon name="drafter" size={18} /> : isImage ? <ImageIcon size={18} /> : <LexIcon name="documents" size={18} />}
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
                {typeLabel} · {new Date(doc.created_at).toLocaleDateString('pl-PL')}
              </span>
            </div>
          </div>

          {doc.chunks ? (
            <span className="hidden md:inline px-2 py-0.5 rounded-md library-view-cell text-[8px] font-admin-mono text-black/50 shrink-0">
              {doc.chunks} frag.
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            'flex items-center gap-0.5 shrink-0 ml-1',
            isHovered ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => onPreview(doc)}
              onMouseEnter={() => setHoveredButton('preview')}
              onMouseLeave={() => setHoveredButton(null)}
              className="p-2 rounded-lg text-black/40 hover:text-black hover:bg-white/60 transition-all"
            >
              <Maximize2 size={16} />
            </button>
            <AnimatePresence>
              {hoveredButton === 'preview' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute bottom-full right-0 mb-2 w-32 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                >
                  <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                    Otwórz podgląd
                  </p>
                  <div className="absolute top-full right-4 -mt-px w-2 h-2 bg-white border-l border-b border-black/10 -rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => onDelete(doc.id, doc.title)}
              onMouseEnter={() => setHoveredButton('delete')}
              onMouseLeave={() => setHoveredButton(null)}
              className="p-2 rounded-lg text-black/40 hover:text-red-600 hover:bg-red-50 transition-all"
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
      </div>
    </motion.div>
  );
}

async function fetchDocumentContent(filename: string): Promise<string> {
  const res = await fetch(`${API_BASE}/documents/content/${encodeURIComponent(filename)}`);
  const data = (await res.json()) as { success?: boolean; content?: string; error?: string };
  if (data.success && data.content) return data.content;
  throw new Error(data.error || 'Nie udało się wczytać treści dokumentu.');
}

export function DocumentsView() {
  const library = useUserLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const docs = useMemo(() => (library.documents as Document[]) || [], [library.documents]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return docs.filter((doc) => {
      const raw = doc.title.toLowerCase();
      const pretty = formatDocumentTitle(doc.title).toLowerCase();
      return raw.includes(q) || pretty.includes(q);
    });
  }, [docs, searchQuery]);

  const handlePreview = useCallback(async (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const content = await fetchDocumentContent(doc.filename || doc.title);
      setPreviewContent(content);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Wystąpił błąd');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleExport = async () => {
    if (!previewDoc || !previewContent) return;
    setIsExporting(true);
    try {
      await downloadAsMarkdown(previewContent, previewDoc.title);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-3 sm:pb-4">
      <div className={DOCUMENTS_SHELL}>
        <LibraryHero
          variant="documents"
          title="Dokumentacja"
          subtitle="Zarządzaj wygenerowanymi pismami i dokumentami."
        >
          <LibraryStatPill label="Wszystkie" value={docs.length} />
        </LibraryHero>

        <LibraryToolbar>
          <div className="flex flex-wrap items-center gap-2">
            <LibrarySearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Szukaj w dokumentach..."
            />
          </div>
        </LibraryToolbar>

        <section className="flex-1 min-h-0 relative z-10 flex flex-col">
          {filteredDocs.length === 0 ? (
            <LibraryEmptyState
              icon={<Search className="text-black/20" size={48} />}
              title="Brak wyników"
              description="Nie znaleziono dokumentów spełniających podane kryteria."
            />
          ) : (
            <LibraryListBody>
              <AnimatePresence mode="popLayout">
                {filteredDocs.map((doc) => (
                  <DocumentListItem
                    key={doc.id}
                    doc={doc}
                    onPreview={handlePreview}
                    onDelete={(_id, _title) => {}}
                    selected={selectedIds.has(doc.id)}
                    onToggleSelect={toggleSelect}
                    selectionActive={selectedIds.size > 0}
                  />
                ))}
              </AnimatePresence>
            </LibraryListBody>
          )}
        </section>
      </div>

      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setPreviewDoc(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl max-h-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-5 sm:px-7 py-5 border-b border-black/8 flex items-center justify-between shrink-0 bg-white/40 backdrop-blur-md">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gold-primary/10 flex items-center justify-center shrink-0">
                    <LexIcon name="documents" className="text-gold-primary" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-black/80 font-outfit truncate">
                      {formatDocumentTitle(previewDoc.title)}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={isExporting || previewLoading || !!previewError}
                    className="p-2.5 rounded-xl hover:bg-black/5 transition-colors disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-2.5 rounded-xl hover:bg-black/5 transition-colors text-black/40 hover:text-black"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-12 bg-white/50">
                {previewLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-black/40 text-[10px] font-black uppercase tracking-widest gap-4">
                    <Loader2 size={20} className="animate-spin text-gold-primary" />
                    Wczytywanie treści…
                  </div>
                ) : previewError && !previewContent.trim() ? (
                  <div className="max-w-3xl mx-auto rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-8 text-center">
                    <p className="text-[12px] font-outfit text-red-700">{previewError}</p>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto prose prose-neutral prose-sm scheme-light">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="px-5 sm:px-7 py-4 border-t border-black/8 flex flex-wrap items-center gap-4 shrink-0 bg-white/40 text-[10px] font-outfit">
                <div>
                  <span className="library-view-label block not-italic">Utworzono</span>
                  <span className="font-admin-mono text-black/70">
                    {new Date(previewDoc.created_at).toLocaleString('pl-PL')}
                  </span>
                </div>
                <div>
                  <span className="library-view-label block not-italic">Typ</span>
                  <span className="font-black uppercase text-black/60">{previewDoc.type}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
