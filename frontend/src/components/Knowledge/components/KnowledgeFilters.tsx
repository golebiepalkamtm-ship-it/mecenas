import { Search, Layers, BookOpen, Gavel, Archive, Plus, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface KnowledgeFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  isUploading: boolean;
  onUploadClick: () => void;
}

const CATEGORIES = [
  { id: "wszystkie", label: "Wszystkie", icon: <Layers size={14} className="text-blue-400" /> },
  { id: "kodeks", label: "Kodeksy", icon: <BookOpen size={14} className="text-amber-400" /> },
  { id: "prawo", label: "Ustawy", icon: <Gavel size={14} className="text-red-400" /> },
  { id: "inne", label: "Inne", icon: <Archive size={14} className="text-emerald-400" /> },
];

export function KnowledgeFilters({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  isUploading,
  onUploadClick,
}: KnowledgeFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-5 items-start justify-between relative z-10">
      <div className="flex flex-col md:flex-row gap-5 items-start w-full md:w-auto">
        {/* Upload Action */}
        <div className="shrink-0">
          <button
            onClick={onUploadClick}
            disabled={isUploading}
            className="h-full px-8 py-4.5 rounded-2xl glass-liquid-convex text-black font-black uppercase tracking-[0.15em] text-[10px] hover:scale-[1.03] transition-all shadow-xl disabled:opacity-40 disabled:pointer-events-none group/btn-upload"
          >
            {isUploading ? (
              <Loader2 className="animate-spin mr-3" size={16} />
            ) : (
              <Plus className="mr-3 group-hover/btn-upload:rotate-90 transition-transform" size={16} />
            )}
            <span className="font-outfit">
              {isUploading ? "Przesyłanie..." : "Importuj Plik PDF"}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 md:w-[350px] lg:w-[450px] group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
            <Search
              size={16}
              className="text-white/20 group-focus-within:text-gold-primary transition-colors"
            />
          </div>
          <input
            type="text"
            placeholder="Szukaj w bazie wiedzy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-prestige-input focus:border-gold-primary/40 focus:bg-white/4 rounded-3xl py-4 pl-12 pr-6 text-[11px] text-black font-medium tracking-tight placeholder:text-slate-600 focus:outline-hidden transition-all shadow-2xl font-outfit"
          />
          
          {/* Animated focus indicator */}
          <div className="absolute bottom-4 right-6 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
            <span className="text-[8px] font-bold text-gold-primary/40 uppercase tracking-[0.3em] font-outfit">Inteligentne Wyszukiwanie</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 glass-prestige backdrop-blur-3xl rounded-3xl w-full md:w-auto shadow-2xl relative">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 relative overflow-hidden group/tab font-outfit",
              activeCategory === cat.id
                ? "glass-liquid-convex text-black shadow-xl scale-105 z-10"
                : "text-black/60 hover:text-black/80 hover:bg-black/5",
            )}
          >
            <span className={cn(
               "transition-transform group-hover/tab:scale-110",
               activeCategory === cat.id && "scale-110 brightness-110"
            )}>
              {cat.icon}
            </span>
            {cat.label}
            
            {/* Active reflection sweep */}
            {activeCategory === cat.id && (
               <div className="absolute -inset-2 border border-gold-primary/20 rounded-3xl animate-ping opacity-20" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
