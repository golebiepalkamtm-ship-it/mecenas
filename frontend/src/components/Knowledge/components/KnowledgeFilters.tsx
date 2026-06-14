import { Search } from 'lucide-react';
import { LexIcon, type LexIconName } from '../../Layout/LexIcon';
import { cn } from '../../../utils/cn';
import { LibrarySearch } from '../../Library/shared';

const CATEGORIES: { id: string; label: string; iconName: LexIconName }[] = [
  { id: 'wszystkie', label: 'Wszystkie', iconName: 'layers' },
  { id: 'kodeks', label: 'Kodeksy', iconName: 'book' },
  { id: 'prawo', label: 'Ustawy', iconName: 'gavel' },
  { id: 'inne', label: 'Inne', iconName: 'knowledge' },
];

interface KnowledgeFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
}

export function KnowledgeFilters({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
}: KnowledgeFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-0.5 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'inline-flex items-center gap-2 shrink-0 h-9 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all font-outfit',
              activeCategory === cat.id
                ? 'library-filter-active'
                : 'library-view-cell text-black/50 hover:text-black',
            )}
          >
            <LexIcon name={cat.iconName} size={14} />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="relative group max-w-xl">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25 group-focus-within:text-gold-primary transition-colors pointer-events-none"
        />
        <LibrarySearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Szukaj w bazie wiedzy…"
          className="pl-9"
        />
      </div>
    </div>
  );
}
