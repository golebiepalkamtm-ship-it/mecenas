import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Loader2, 
  Database, 
  ShieldCheck, 
  Clock, 
  ArrowLeft, 
  Search, 
  Layers,
  Archive,
  BookOpen,
  Gavel
} from 'lucide-react';
import { Title, GlassCard, NeonButton } from '../UI';
import { useKnowledgeBase } from '../../hooks';

export function KnowledgeView({ onBack }: { onBack?: () => void }) {
  const { documents } = useKnowledgeBase();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('wszystkie');

  const categories = [
    { id: 'wszystkie', label: 'Wszystkie', icon: <Layers size={14} /> },
    { id: 'kodeks', label: 'Kodeksy', icon: <BookOpen size={14} /> },
    { id: 'prawo', label: 'Ustawy', icon: <Gavel size={14} /> },
    { id: 'inne', label: 'Inne', icon: <Archive size={14} /> },
  ];

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'wszystkie' || 
        (activeCategory === 'kodeks' && doc.name.toLowerCase().includes('kodeks')) ||
        (activeCategory === 'prawo' && doc.name.toLowerCase().includes('prawo')) ||
        (activeCategory === 'inne' && !doc.name.toLowerCase().includes('kodeks') && !doc.name.toLowerCase().includes('prawo'));
      
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 xs:px-6 lg:px-12 pt-6 lg:pt-14 space-y-8 pb-32 overflow-y-auto no-scrollbar h-full scroll-smooth">
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 lg:gap-6 min-w-0">
                {onBack && (
                  <button 
                    onClick={onBack}
                    className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl glass-prestige bg-(--bg-top) flex items-center justify-center text-(--text-secondary) hover:text-(--gold-primary) hover:border-(--gold-primary) transition-all group shrink-0 shadow-2xl active:scale-90"
                    title="Wróć do czatu"
                  >
                    <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform" />
                  </button>
                )}
                <div className="min-w-0">
                    <Title subtitle="Oficjalna, certyfikowana biblioteka aktów prawnych Rzeczypospolitej Polskiej.">
                        Centralna Baza Wiedzy
                    </Title>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="px-5 py-3 rounded-2xl bg-gold-primary/5 border border-gold-primary/20 flex items-center gap-3 shadow-inner">
                   <ShieldCheck className="w-4 h-4 text-gold-primary animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-primary/80">BIBLIOTEKA ZWERYFIKOWANA</span>
                </div>
            </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-5">
            <StatCard 
              icon={<Database className="w-4 h-4" />} 
              label="Zasób Systemowy" 
              value="Kancelaria Core" 
              trend="+16 Aktów"
            />
            <StatCard 
              icon={<FileText className="w-4 h-4" />} 
              label="Liczba Dokumentów" 
              value={documents.length.toString()} 
              trend="Pełny Zakres"
            />
            <StatCard 
              icon={<ShieldCheck className="w-4 h-4" />} 
              label="Poziom Dostępu" 
              value="Adwokacki" 
              trend="AES-256"
            />
            <StatCard 
              icon={<Clock className="w-4 h-4" />} 
              label="Ostatnia Sync." 
              value="Dzisiaj" 
              trend="LIVE"
            />
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-500 group-focus-within:text-gold-primary transition-colors" />
                </div>
                <input 
                    type="text" 
                    placeholder="Wyszukaj w bazie aktów..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-gold-muted/20 hover:border-gold-muted/40 focus:border-gold-primary/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-(--text-primary) placeholder:text-slate-600 focus:outline-none transition-all shadow-xl backdrop-blur-md"
                />
            </div>

            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar w-full md:w-auto">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                            activeCategory === cat.id 
                                ? "bg-gold-primary text-black shadow-lg" 
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Documents Grid/List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
                {filteredDocuments.map((doc, idx) => (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        layout
                    >
                        <div className="group relative glass-prestige bg-(--bg-top)/30 hover:bg-(--bg-top)/50 border-gold-muted/10 hover:border-gold-primary/30 transition-all p-5 rounded-3xl cursor-default overflow-hidden">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center text-gold-primary group-hover:scale-110 transition-transform shadow-xl shrink-0">
                                    {doc.name.toLowerCase().includes('kodeks') ? <BookOpen size={20} /> : <FileText size={20} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-black text-(--text-primary) tracking-tight truncate leading-tight mb-1 uppercase italic">
                                        {doc.name.replace(/\.[^/.]+$/, "")}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {doc.chunks && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                <Layers size={10} className="text-blue-500" />
                                                {doc.chunks} segmentów
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                            <ShieldCheck size={10} className="text-emerald-500" />
                                            Aktywny RAG
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex flex-col items-end shrink-0">
                                    <span className="text-[8px] font-black text-gold-primary/40 uppercase tracking-[0.2em] mb-1">Status 4.1</span>
                                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 uppercase tracking-widest shadow-sm">
                                        Verified
                                    </div>
                                </div>
                            </div>
                            
                            {/* Hover Decorative Glow */}
                            <div className="absolute -inset-1 bg-conic-to-tr from-gold-primary/0 via-gold-primary/5 to-gold-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {filteredDocuments.length === 0 && (
                <div className="lg:col-span-2 py-32 flex flex-col items-center justify-center text-center space-y-8 glass-prestige bg-(--bg-top)/20 rounded-[4rem] border-gold-muted/20 border-dashed shadow-2xl">
                    <div className="w-24 h-24 rounded-full bg-(--bg-top)/30 flex items-center justify-center text-slate-600 relative">
                        <Loader2 size={40} className="animate-spin opacity-20" />
                        <Database size={24} className="absolute" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-(--text-primary) tracking-tighter italic">Brak pasujących zasobów</h3>
                        <p className="text-xs text-(--text-secondary) max-w-sm mx-auto tracking-widest font-bold uppercase opacity-60">Nie znaleziono dokumentów spełniających Twoje kryteria wyszukiwania.</p>
                    </div>
                    <NeonButton 
                      variant="secondary"
                      onClick={() => { setSearchQuery(''); setActiveCategory('wszystkie'); }}
                      className="text-[9px]"
                    >
                        Resetuj Filtry
                    </NeonButton>
                </div>
            )}
        </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend?: string }) {
    return (
        <GlassCard className="p-4 px-6 flex flex-col gap-4 group hover:border-gold-primary transition-all bg-(--bg-top)/40 border-gold-muted/10 rounded-4xl shadow-xl">
            <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center text-gold-primary group-hover:text-white transition-colors">
                    {icon}
                </div>
                {trend && (
                    <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full tracking-widest uppercase">
                        {trend}
                    </span>
                )}
            </div>
            <div className="flex flex-col">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">{label}</p>
                <p className="text-base font-black text-(--text-primary) tracking-tight italic uppercase">{value}</p>
            </div>
        </GlassCard>
    );
}

function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(' ');
}
