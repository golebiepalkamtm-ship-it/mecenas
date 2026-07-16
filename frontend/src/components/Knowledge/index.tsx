import { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Loader2, Plus, X, Search, ChevronUp, ChevronDown, Download, BookOpen } from 'lucide-react';
import { useKnowledgeBase } from '../../hooks';
import { DocumentCard } from './components/DocumentCard';
import { KnowledgeFilters } from './components/KnowledgeFilters';
import type { KnowledgeDocument, KnowledgeViewProps } from './types';
import { formatDocumentTitle } from '../../utils/documentTitle';
import { API_BASE } from '../../config';
import { downloadAsMarkdown } from '../../utils/exportUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/cn';
import {
  KNOWLEDGE_SHELL,
  LibraryHero,
  LibraryStatPill,
  LibraryToolbar,
  LibraryEmptyState,
  LibraryListBody,
} from '../Library/shared';

export function KnowledgeView() {
  const { documents, uploadPDF, removeFile, isUploading } = useKnowledgeBase() as KnowledgeViewProps;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('wszystkie');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview & Search States
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSearchQuery, setPreviewSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await uploadPDF(file);
    event.target.value = '';
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: KnowledgeDocument) => {
      const rawName = doc.name.toLowerCase();
      const prettyName = formatDocumentTitle(doc.name).toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = rawName.includes(query) || prettyName.includes(query);
      const matchesCategory =
        activeCategory === 'wszystkie' ||
        (activeCategory === 'kodeks' && (rawName.includes('kodeks') || prettyName.includes('kodeks'))) ||
        (activeCategory === 'prawo' &&
          (rawName.includes('prawo') ||
            rawName.includes('ustawa') ||
            prettyName.includes('prawo') ||
            prettyName.includes('ustawa'))) ||
        (activeCategory === 'inne' &&
          !(rawName.includes('kodeks') || prettyName.includes('kodeks')) &&
          !(rawName.includes('prawo') || prettyName.includes('prawo')) &&
          !(rawName.includes('ustawa') || prettyName.includes('ustawa')));
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, activeCategory]);

  const indexedCount = documents.filter((d) => d.chunks && d.chunks > 0).length;

  const fetchDocumentContent = async (filename: string): Promise<string> => {
    const res = await fetch(`${API_BASE}/documents/content/${encodeURIComponent(filename)}`);
    const data = (await res.json()) as { success?: boolean; content?: string; error?: string };
    if (data.success && data.content) return data.content;
    throw new Error(data.error || 'Nie udało się wczytać treści dokumentu.');
  };

  const handlePreview = async (doc: KnowledgeDocument) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewSearchQuery('');
    setPreviewContent('');
    setActiveIndex(0);
    try {
      const content = await fetchDocumentContent(doc.name);
      setPreviewContent(content);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Wystąpił błąd');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    if (!previewDoc || !previewContent) return;
    try {
      await downloadAsMarkdown(previewContent, previewDoc.name);
    } catch (err) {
      console.error('Failed to export markdown:', err);
    }
  };

  // Text highlighting and counts
  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const countMatches = (text: string, search: string) => {
    if (!search) return 0;
    const matches = text.match(new RegExp(escapeRegExp(search), 'gi'));
    return matches ? matches.length : 0;
  };

  const totalMatches = useMemo(() => {
    return countMatches(previewContent, previewSearchQuery);
  }, [previewContent, previewSearchQuery]);

  function highlightNode(
    node: React.ReactNode,
    search: string,
    counter: { val: number },
    activeIndex: number
  ): React.ReactNode {
    if (!search) return node;
    if (typeof node === 'string') {
      const escaped = escapeRegExp(search);
      const parts = node.split(new RegExp(`(${escaped})`, 'gi'));
      return parts.map((part, index) => {
        if (part.toLowerCase() === search.toLowerCase()) {
          const currentIdx = counter.val;
          counter.val++;
          const isActive = currentIdx === activeIndex;
          return (
            <mark
              key={index}
              data-match-index={currentIdx}
              className={cn(
                "px-0.5 rounded transition-all duration-200",
                isActive
                  ? "bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.6)] font-bold scale-105 border border-amber-500 inline-block"
                  : "bg-gold-primary/30 text-gold-deep border-b border-gold-primary/50 font-bold"
              )}
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    }
    if (Array.isArray(node)) {
      return node.map((child, index) => <span key={index}>{highlightNode(child, search, counter, activeIndex)}</span>);
    }
    if (node && typeof node === 'object' && 'props' in node) {
      const element = node as React.ReactElement<{ children?: React.ReactNode }>;
      if (element.props && element.props.children) {
        return {
          ...element,
          props: {
            ...element.props,
            children: highlightNode(element.props.children, search, counter, activeIndex),
          },
        };
      }
    }
    return node;
  }

  const markdownComponents = useMemo(() => {
    const highlight = (children: React.ReactNode) => {
      return highlightNode(children, previewSearchQuery, { val: 0 }, activeIndex);
    };
    return {
      p: ({ children }: any) => <p>{highlight(children)}</p>,
      h1: ({ children }: any) => <h1>{highlight(children)}</h1>,
      h2: ({ children }: any) => <h2>{highlight(children)}</h2>,
      h3: ({ children }: any) => <h3>{highlight(children)}</h3>,
      h4: ({ children }: any) => <h4>{highlight(children)}</h4>,
      h5: ({ children }: any) => <h5>{highlight(children)}</h5>,
      h6: ({ children }: any) => <h6>{highlight(children)}</h6>,
      li: ({ children }: any) => <li>{highlight(children)}</li>,
      span: ({ children }: any) => <span>{highlight(children)}</span>,
      td: ({ children }: any) => <td>{highlight(children)}</td>,
      th: ({ children }: any) => <th>{highlight(children)}</th>,
      code: ({ children }: any) => <code>{highlight(children)}</code>,
    };
  }, [previewSearchQuery, activeIndex]);

  // Effects for navigation & scrolling
  useEffect(() => {
    if (previewSearchQuery && totalMatches > 0) {
      const activeEl = document.querySelector(`[data-match-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, previewSearchQuery, totalMatches]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewDoc) return;
      if (e.key === 'Escape') {
        setPreviewDoc(null);
      } else if (e.key === 'Enter') {
        if (totalMatches > 0) {
          e.preventDefault();
          if (e.shiftKey) {
            setActiveIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
          } else {
            setActiveIndex((prev) => (prev + 1) % totalMatches);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, totalMatches]);

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-3 sm:pb-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => void handleFileUpload(e)}
        accept=".pdf,.doc,.docx,.txt,.odt,.rtf"
        className="hidden"
      />

      <div className={KNOWLEDGE_SHELL}>
        <LibraryHero
          variant="knowledge"
          title="Baza Wiedzy"
          subtitle="Zarządzaj swoimi dokumentami."
        >
          <LibraryStatPill label="Dokumenty" value={documents.length} />
          <LibraryStatPill label="Zindeksowane" value={indexedCount} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-gold-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-secondary transition-colors"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            <span>Dodaj plik</span>
          </button>
        </LibraryHero>

        <LibraryToolbar>
          <KnowledgeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        </LibraryToolbar>

        <section className="flex-1 min-h-0 relative z-10 flex flex-col">
          {filteredDocuments.length === 0 ? (
            <LibraryEmptyState
              icon={<FileText className="text-black/20" size={48} />}
              title="Brak dokumentów"
              description="Brak dokumentów pasujących do kryteriów wyszukiwania."
              actions={
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gold-primary/10 text-gold-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-primary/20 transition-colors"
                >
                  <Plus size={14} />
                  <span>Wgraj pierwszy dokument</span>
                </button>
              }
            />
          ) : (
            <LibraryListBody>
              <AnimatePresence mode="popLayout">
                {filteredDocuments.map((doc: KnowledgeDocument, idx: number) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    index={idx}
                    onPreview={handlePreview}
                    onDelete={(name) => {
                      if (confirm(`Czy na pewno usunąć ${name}?`)) void removeFile(name);
                    }}
                  />
                ))}
              </AnimatePresence>
            </LibraryListBody>
          )}
        </section>
      </div>

      {/* Preview Dialog */}
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
              className="relative w-full max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-black/10"
            >
              <div className="px-5 sm:px-7 py-4 border-b border-black/8 flex items-center justify-between shrink-0 bg-white/40 backdrop-blur-md">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gold-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="text-gold-primary" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-black/80 font-outfit truncate">
                      {formatDocumentTitle(previewDoc.name)}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {/* Wyszukiwarka wewnątrz dokumentu */}
                  <div className="relative group max-w-[180px] sm:max-w-[240px] shrink-0">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25 group-focus-within:text-gold-primary transition-colors pointer-events-none"
                    />
                    <input
                      type="text"
                      value={previewSearchQuery}
                      onChange={(e) => {
                        setPreviewSearchQuery(e.target.value);
                        setActiveIndex(0);
                      }}
                      placeholder="Szukaj w treści..."
                      className="w-full h-8 pl-8 pr-16 bg-black/5 hover:bg-black/8 focus:bg-white border border-black/8 focus:border-gold-primary/50 rounded-lg text-[10px] font-outfit font-semibold text-black placeholder:text-black/30 outline-none transition-all"
                    />
                    {totalMatches > 0 && (
                      <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[9px] font-admin-mono font-bold text-black/45">
                        {activeIndex + 1}/{totalMatches}
                      </span>
                    )}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setActiveIndex((prev) => (prev - 1 + totalMatches) % totalMatches)}
                        disabled={totalMatches === 0}
                        className="p-1 rounded hover:bg-black/5 text-black/40 hover:text-black transition-colors disabled:opacity-30"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveIndex((prev) => (prev + 1) % totalMatches)}
                        disabled={totalMatches === 0}
                        className="p-1 rounded hover:bg-black/5 text-black/40 hover:text-black transition-colors disabled:opacity-30"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={previewLoading || !!previewError}
                    className="p-2 rounded-lg hover:bg-black/5 text-black/40 hover:text-black transition-colors disabled:opacity-50"
                    title="Pobierz jako Markdown"
                  >
                    <Download size={16} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 rounded-lg hover:bg-black/5 text-black/40 hover:text-black transition-colors"
                    title="Zamknij"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 md:p-12 bg-white/50">
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {previewContent}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="px-5 sm:px-7 py-3.5 border-t border-black/8 flex flex-wrap items-center gap-4 shrink-0 bg-white/40 text-[9px] font-outfit">
                <div>
                  <span className="text-black/35 font-bold uppercase tracking-wider block">Nazwa pliku</span>
                  <span className="font-admin-mono text-black/75">
                    {previewDoc.name}
                  </span>
                </div>
                {previewDoc.chunks ? (
                  <div>
                    <span className="text-black/35 font-bold uppercase tracking-wider block">Indeks</span>
                    <span className="font-black text-black/60">{previewDoc.chunks} fragmentów RAG</span>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

