import { useState, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FileText, Loader2, Plus } from 'lucide-react';
import { useKnowledgeBase } from '../../hooks';
import { DocumentCard } from './components/DocumentCard';
import { KnowledgeFilters } from './components/KnowledgeFilters';
import type { KnowledgeDocument, KnowledgeViewProps } from './types';
import { formatDocumentTitle } from '../../utils/documentTitle';
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
    </div>
  );
}
