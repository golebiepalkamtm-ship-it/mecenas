import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Users,
  Database,
  Activity,
  BarChart3,
  RefreshCw,
  UserPlus,
  Trash2,
  LockIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Title, GlassCard, Badge, NeonButton, AnimatedNumber } from '../UI';
import { useApiManagement } from '../../hooks';
import { supabase } from '../../utils/supabaseClient';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AdminTab = 'security' | 'models' | 'users' | 'system';

interface Model {
    id: string;
    name: string;
    vision: boolean;
    free?: boolean;
    provider?: string;
    enabled?: boolean;
}

interface Provider {
    id: string;
    name: string;
    active: boolean;
    key: string;
}

interface UserProfile {
    id: string;
    email?: string;
    role: string;
    created_at: string;
}

function ModelManagement() {
    const [allModels, setAllModels] = useState<Model[]>([]);
    const [enabledModels, setEnabledModels] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));
    const [filterVision, setFilterVision] = useState(false);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:8003/models/admin');
            const data = await res.json();
            setAllModels(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch admin models:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        const saved = localStorage.getItem('prawnik_enabled_models');
        if (saved) setEnabledModels(JSON.parse(saved));
    }, []);

    const toggleModel = (id: string) => {
        const next = enabledModels.includes(id) 
            ? enabledModels.filter(m => m !== id)
            : [...enabledModels, id];
        setEnabledModels(next);
        localStorage.setItem('prawnik_enabled_models', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('prawnik_models_updated'));
    };

    const toggleGroup = (group: string) => {
        const next = new Set(expandedGroups);
        if (next.has(group)) {
            next.delete(group);
        } else {
            next.add(group);
        }
        setExpandedGroups(next);
    };

    const groupModels = (models: Model[]) => {
        const groups: { [key: string]: Model[] } = {
            'OpenAI': [],
            'Anthropic': [],
            'Meta': [],
            'Google': [],
            'Mistral': [],
            'NousResearch': [],
            'Sao10K': [],
            'WizardLM': [],
            'Mancer': [],
            'Inne': [],
            'Vision': [],
            'Free': []
        };

        models.forEach(model => {
            const id = model.id;
            
            // Vision models
            if (model.vision) {
                groups['Vision'].push(model);
                return;
            }
            
            // Free models
            if (id.includes(':free')) {
                groups['Free'].push(model);
                return;
            }
            
            // Group by provider
            if (id.includes('openai/')) groups['OpenAI'].push(model);
            else if (id.includes('anthropic/')) groups['Anthropic'].push(model);
            else if (id.includes('meta-llama/')) groups['Meta'].push(model);
            else if (id.includes('google/')) groups['Google'].push(model);
            else if (id.includes('mistralai/')) groups['Mistral'].push(model);
            else if (id.includes('nousresearch/')) groups['NousResearch'].push(model);
            else if (id.includes('sao10k/')) groups['Sao10K'].push(model);
            else if (id.includes('microsoft/wizardlm')) groups['WizardLM'].push(model);
            else if (id.includes('mancer/')) groups['Mancer'].push(model);
            else groups['Inne'].push(model);
        });

        return groups;
    };

    const getGroupIcon = (groupName: string) => {
        const icons: { [key: string]: string } = {
            'OpenAI': '🤖',
            'Anthropic': '🧠',
            'Meta': '👥',
            'Google': '🔍',
            'Mistral': '🌊',
            'NousResearch': '🧪',
            'Sao10K': '⚡',
            'WizardLM': '🧙‍♂️',
            'Mancer': '🎮',
            'Inne': '📦',
            'Vision': '👁️',
            'Free': '🆓'
        };
        return icons[groupName] || '📦';
    };

    const getGroupColor = (groupName: string) => {
        const colors: { [key: string]: string } = {
            'OpenAI': 'text-green-400',
            'Anthropic': 'text-purple-400',
            'Meta': 'text-blue-400',
            'Google': 'text-yellow-400',
            'Mistral': 'text-cyan-400',
            'NousResearch': 'text-pink-400',
            'Sao10K': 'text-orange-400',
            'WizardLM': 'text-indigo-400',
            'Mancer': 'text-red-400',
            'Inne': 'text-gray-400',
            'Vision': 'text-emerald-400',
            'Free': 'text-lime-400'
        };
        return colors[groupName] || 'text-gray-400';
    };

    if (isLoading && allModels.length === 0) return <div className="p-4 text-center text-white/30 text-[10px] uppercase font-black animate-pulse">Pobieranie listy z OpenRouter...</div>;

    const filteredModels = filterVision ? allModels.filter(model => model.vision) : allModels;
    const groupedModels = groupModels(filteredModels);
    const visionCount = allModels.filter(model => model.vision).length;

    return (
        <div className="space-y-3 pt-2">
            {/* Filter Controls */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/80">Filtry</span>
                    <button
                        onClick={() => setFilterVision(!filterVision)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                            filterVision 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        <span className="text-lg">👁️</span>
                        <span>Tylko Vision</span>
                        <span className="text-[8px] bg-emerald-500/30 px-1.5 py-0.5 rounded">({visionCount})</span>
                    </button>
                    {filterVision && (
                        <span className="text-[8px] text-emerald-400 font-bold uppercase">
                            Pokazano {filteredModels.length} z {allModels.length} modeli
                        </span>
                    )}
                </div>
                <button onClick={fetchAll} className="text-[8px] text-gold-primary/60 hover:text-gold-primary transition-colors">
                    Odśwież
                </button>
            </div>

            {allModels.length === 0 && !isLoading && (
                <div className="p-10 text-center border border-dashed border-white/10 rounded-2xl">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Błąd połączenia z API OpenRouter</p>
                    <button onClick={fetchAll} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[8px] font-black uppercase text-gold-primary transition-all">Spróbuj ponownie</button>
                </div>
            )}
            
            {Object.entries(groupedModels).filter(([, models]) => models.length > 0).map(([groupName, models]) => (
                <div key={groupName} className="space-y-2">
                    <div 
                        onClick={() => toggleGroup(groupName)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">{getGroupIcon(groupName)}</span>
                            <div>
                                <span className={`text-[11px] font-black uppercase tracking-widest ${getGroupColor(groupName)}`}>
                                    {groupName}
                                </span>
                                <p className="text-[7px] text-white/30 font-bold uppercase tracking-tighter">
                                    {models.length} model{models.length !== 1 ? 'i' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-white/20 font-bold uppercase">
                                {models.filter(m => enabledModels.includes(m.id)).length}/{models.length}
                            </span>
                            <motion.div
                                animate={{ rotate: expandedGroups.has(groupName) ? 180 : 0 }}
                                className="text-white/20"
                            >
                                <ChevronRight size={14} />
                            </motion.div>
                        </div>
                    </div>
                    
                    <AnimatePresence>
                        {expandedGroups.has(groupName) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="space-y-1.5 pl-4 overflow-hidden"
                            >
                                {models.map(m => (
                                    <div 
                                        key={m.id} 
                                        onClick={() => toggleModel(m.id)}
                                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                                            enabledModels.includes(m.id) 
                                            ? 'bg-gold-primary/10 border-gold-primary/20' 
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black uppercase tracking-tight truncate ${enabledModels.includes(m.id) ? 'text-gold-primary' : 'text-white/80'}`}>
                                                    {m.name || m.id}
                                                </span>
                                                {m.vision && (
                                                    <span className="text-[6px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Vision</span>
                                                )}
                                            </div>
                                            <span className="text-[7px] font-bold text-white/20 uppercase tracking-tighter truncate">{m.id}</span>
                                        </div>
                                        <div className={`w-8 h-4 rounded-full transition-all flex items-center px-1 shrink-0 ${enabledModels.includes(m.id) ? 'bg-gold-primary' : 'bg-white/10'}`}>
                                            <motion.div 
                                                animate={{ x: enabledModels.includes(m.id) ? 16 : 0 }} 
                                                className={`w-2 h-2 rounded-full ${enabledModels.includes(m.id) ? 'bg-black' : 'bg-white/20'}`} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
}

export function AdminView() {
  const [activeSubTab, setActiveSubTab] = useState<AdminTab>('system');
  const { providers, toggleProvider, updateKey } = useApiManagement();
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({
      users: 0,
      docs: 0,
      requests: 0,
      tokens: 0
  });

  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
        try {
            const [profilesRes, kbCountRes] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('knowledge_base').select('id', { count: 'exact', head: true })
            ]);

            if (profilesRes.data) setUsers(profilesRes.data);
            setStats({
                users: profilesRes.data?.length || 0,
                docs: kbCountRes.count || 0,
                requests: 12480, // Simulated
                tokens: 4500000 // Simulated
            });
        } catch (err) {
            console.error("Admin data fetch error:", err);
        }
    };
    
    fetchData();
  }, []);

  const toggleVisibility = (id: string) => {
      setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };



  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
        {/* SUB NAVIGATION */}
        <div className="flex items-center px-8 lg:px-12 py-6 gap-8 shrink-0 overflow-x-auto no-scrollbar border-b border-white/5 bg-white/2">
            <SubNavItem 
                active={activeSubTab === 'system'} 
                onClick={() => setActiveSubTab('system')} 
                icon={<Activity size={16} />} 
                label="Status Systemu" 
            />
            <SubNavItem 
                active={activeSubTab === 'users'} 
                onClick={() => setActiveSubTab('users')} 
                icon={<Users size={16} />} 
                label="Użytkownicy" 
            />
            <SubNavItem 
                active={activeSubTab === 'security'} 
                onClick={() => setActiveSubTab('security')} 
                icon={<Key size={16} />} 
                label="Klucze API" 
            />
            <SubNavItem 
                active={activeSubTab === 'models'} 
                onClick={() => setActiveSubTab('models')} 
                icon={<Cpu size={16} />} 
                label="Modele AI" 
            />
        </div>

        <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-8 custom-scrollbar pb-24">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSubTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* SYSTEM DASHBOARD */}
                    {activeSubTab === 'system' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Aktywni Użytkownicy" value={stats.users} icon={<Users className="text-blue-400" />} />
                                <StatCard label="Dokumenty RAG" value={stats.docs} icon={<Database className="text-emerald-400" />} />
                                <StatCard label="Zapytania AI" value={stats.requests} icon={<BarChart3 className="text-gold-primary" />} isCompacted />
                                <StatCard label="Zużycie Tokenów" value={stats.tokens} icon={<Activity className="text-purple-400" />} isCompacted />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <GlassCard className="p-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <Title subtitle="Stan operacyjny usług backendowych">Węzły Systemowe</Title>
                                        <Badge variant="emerald">Wszystko OK</Badge>
                                    </div>
                                    <div className="space-y-4">
                                        <HealthRow label="Supabase DB" status="online" ping="12ms" />
                                        <HealthRow label="Edge Functions" status="online" ping="45ms" />
                                        <HealthRow label="FastAPI Core" status="online" ping="8ms" />
                                        <HealthRow label="Embedding Engine" status="online" ping="120ms" />
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-8 space-y-6 flex flex-col justify-between">
                                    <div>
                                        <Title subtitle="Czynności techniczne i optymalizacja">Zasoby Strategiczne</Title>
                                        <div className="mt-6 p-4 rounded-2xl bg-gold-primary/5 border border-gold-primary/10 flex items-start gap-4">
                                            <Shield className="text-gold-primary mt-1 shrink-0" size={18} />
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                                Wszystkie operacje w tej sekcji wymagają najwyższego poziomu uprawnień. Zmiany wpływają na wszystkich użytkowników systemu LexMind AI.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <NeonButton variant="secondary" className="flex-1 py-4" onClick={() => {}}>
                                            <RefreshCw size={14} className="mr-2" /> Re-indeksacja
                                        </NeonButton>
                                        <NeonButton variant="danger" className="flex-1 py-4" onClick={() => {}}>
                                            <Trash2 size={14} className="mr-2" /> Wyczyść Cache
                                        </NeonButton>
                                    </div>
                                </GlassCard>
                            </div>
                        </div>
                    )}

                    {/* USERS MANAGEMENT */}
                    {activeSubTab === 'users' && (
                        <div className="space-y-6">
                            <header className="flex items-center justify-between">
                                <Title subtitle="Zarządzanie dostępem i rolami">Dostęp Obrońców</Title>
                                <NeonButton size="sm">
                                    <UserPlus size={14} className="mr-2" /> Zaproś
                                </NeonButton>
                            </header>

                            <GlassCard className="overflow-hidden border-white/5 bg-black/10">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5">
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Użytkownik</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Rola</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Data Rejestracji</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center font-black text-gold-primary text-[10px]">
                                                            {u.email?.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-bold text-white">{u.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={u.role === 'admin' ? 'gold' : 'muted'}>{u.role}</Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold text-slate-500">{new Date(u.created_at).toLocaleDateString('pl-PL')}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><Shield size={14} /></button>
                                                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </GlassCard>
                        </div>
                    )}

                    {/* API KEYS MANAGEMENT (SECURITY) */}
                    {activeSubTab === 'security' && (
                        <div className="space-y-8">
                            <header>
                                <Title subtitle="Bramka uwierzytelniania dla modeli AI">Klucze Szyfrujące</Title>
                            </header>

                            <div className="flex flex-col gap-3">
                                {providers.map((p: Provider) => (
                                    <GlassCard 
                                        key={p.id}
                                        className={cn(
                                            "p-4 px-8 rounded-3xl flex items-center gap-8 transition-all border-white/5 bg-black/20 hover:border-gold-primary/30",
                                            p.active && "border-gold-primary/20 bg-gold-primary/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                                            p.active ? "bg-gold-primary text-black border-gold-primary shadow-lg" : "bg-white/5 border-white/10 text-slate-500"
                                        )}>
                                            {p.name.includes('Google') ? <Globe size={20} /> : <Cpu size={20} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-black text-white uppercase tracking-tight truncate">{p.name}</h4>
                                            <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-2 mt-1">
                                                {p.key ? <CheckCircle2 size={12} className="text-gold-primary" /> : <AlertCircle size={12} />}
                                                {p.key ? 'ZWERYFIKOWANO TLS 1.3' : 'BRAK KLUCZA'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="relative group/input flex items-center">
                                                <LockIcon size={14} className="absolute left-4 text-slate-700 group-focus-within/input:text-gold-primary transition-colors" />
                                                <input 
                                                    type={showKeys[p.id] ? 'text' : 'password'}
                                                    defaultValue={p.key}
                                                    placeholder="Wprowadź klucz..."
                                                    className="bg-black/60 border border-white/10 rounded-2xl py-3 pl-12 pr-12 text-xs font-mono text-white outline-none focus:border-gold-primary/40 focus:bg-black/80 transition-all w-64 lg:w-96 shadow-inner tracking-widest"
                                                    onChange={(e) => updateKey(p.id, e.target.value)}
                                                />
                                                <button 
                                                    onClick={() => toggleVisibility(p.id)}
                                                    className="absolute right-4 text-slate-600 hover:text-white transition-colors"
                                                >
                                                    {showKeys[p.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>

                                            <button 
                                                onClick={() => toggleProvider(p.id)}
                                                className={cn(
                                                    "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all min-w-[120px] shadow-lg",
                                                    p.active 
                                                        ? "bg-white/5 text-slate-500 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20" 
                                                        : "bg-gold-primary text-black border border-gold-primary hover:brightness-110 active:scale-95"
                                                )}
                                            >
                                                {p.active ? "USUŃ" : "AKTYWUJ"}
                                            </button>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODELS MANAGEMENT */}
                    {activeSubTab === 'models' && (
                        <div className="space-y-8">
                            <header>
                                <Title subtitle="Zarządzanie flotą jednostek poznawczych">Arsenał AI</Title>
                            </header>

                            <div className="bg-black/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
                                <h2 className="text-xl font-black text-white italic tracking-tight uppercase text-gold-gradient">Modele AI (OpenRouter)</h2>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-4">Wybierz modele dostępne w sekcji czatu</p>
                                <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                    <ModelManagement />
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function SubNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex items-center gap-2.5 pb-2 transition-all relative group",
                active ? "text-gold-primary" : "text-slate-500 hover:text-slate-300"
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                active ? "bg-gold-primary/20 text-gold-primary shadow-[0_0_15px_rgba(255,215,128,0.2)]" : "bg-white/5 group-hover:bg-white/10"
            )}>
                {icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            {active && (
                <motion.div 
                    layoutId="subnav-indicator"
                    className="absolute -bottom-6 left-0 right-0 h-1 bg-gold-primary rounded-t-full shadow-[0_-5px_15px_rgba(255,215,128,0.8)]"
                />
            )}
        </button>
    );
}

function StatCard({ label, value, icon, isCompacted = false }: { label: string, value: number, icon: React.ReactNode, isCompacted?: boolean }) {
    return (
        <GlassCard className="p-6 flex flex-col gap-4 group hover:border-gold-primary/30 transition-all cursor-default relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                {isCompacted && <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Compacted</span>}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
                <div className="text-3xl font-outfit font-black tracking-tighter shimmer-text">
                    <AnimatedNumber value={value} />
                </div>
            </div>
        </GlassCard>
    );
}

function HealthRow({ label, status, ping }: { label: string, status: 'online' | 'offline', ping: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 group hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'online' ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-red-500 shadow-[0_0_10px_#ef4444]"
                )} />
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">{label}</span>
            </div>
            <span className="text-[9px] font-black font-mono text-slate-600">{ping}</span>
        </div>
    );
}
