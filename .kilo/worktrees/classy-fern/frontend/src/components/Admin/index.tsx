import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Key, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Layers, 
  Check, 
  ChevronDown,
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
  active: boolean;
  provider: string;
  model_id?: string;
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

export function AdminView() {
  const [activeSubTab, setActiveSubTab] = useState<AdminTab>('system');
  const { providers, toggleProvider, updateKey } = useApiManagement();
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({
      users: 0,
      docs: 0,
      requests: 0,
      tokens: 0
  });

  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  
  const [enabledModelIds, setEnabledModelIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('prawnik_enabled_models');
    return stored ? JSON.parse(stored) : ['gemini', 'openrouter-gpt4mini', 'openrouter-gpt4o', 'openrouter-claude35', 'openrouter-llama3', 'consensus'];
  });

  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
        try {
            const [modelsRes, profilesRes, kbCountRes] = await Promise.all([
                fetch('http://127.0.0.1:8001/models'),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('knowledge_base').select('id', { count: 'exact', head: true })
            ]);

            const modelsData = await modelsRes.json();
            setAllModels(modelsData);
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

  const toggleModel = (id: string) => {
    const newIds = enabledModelIds.includes(id) 
        ? enabledModelIds.filter(mid => mid !== id)
        : [...enabledModelIds, id];
    
    setEnabledModelIds(newIds);
    localStorage.setItem('prawnik_enabled_models', JSON.stringify(newIds));
    window.dispatchEvent(new Event('prawnik_models_updated'));
  };

  const groupedHierarchy = useMemo(() => {
    return allModels.reduce((acc: Record<string, Record<string, Model[]>>, m: Model) => {
        const providerName = (m.provider || 'SYSTEM').toUpperCase();
        if (!acc[providerName]) acc[providerName] = {};
        
        let vendor = 'INNE';
        if (m.name.includes(':')) {
            vendor = m.name.split(':')[0].trim().toUpperCase();
        } else if (m.model_id?.includes('/')) {
            vendor = m.model_id.split('/')[0].trim().toUpperCase();
        } else if (providerName === 'GOOGLE') vendor = 'GOOGLE';
        else if (providerName === 'OPENAI') vendor = 'OPENAI';
        else if (providerName === 'SYSTEM') vendor = 'ZASOBY SYSTEMOWE';

        if (!acc[providerName][vendor]) acc[providerName][vendor] = [];
        acc[providerName][vendor].push(m);
        return acc;
    }, {});
  }, [allModels]);

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

                            <div className="flex flex-col gap-4">
                                {Object.entries(groupedHierarchy).map(([provider, subProviders]) => (
                                    <div key={provider} className="flex flex-col gap-2">
                                        <button 
                                            onClick={() => setExpandedGroups(prev => ({ ...prev, [provider]: !prev[provider] }))}
                                            className={cn(
                                                "w-full flex items-center justify-between p-6 rounded-3xl glass-prestige bg-white/2 hover:bg-white/5 transition-all group",
                                                expandedGroups[provider] && "border-gold-primary/30 bg-gold-primary/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <Building2 size={20} className={expandedGroups[provider] ? "text-gold-primary" : "text-slate-600"} />
                                                <span className="text-sm font-black text-white uppercase tracking-widest">{provider}</span>
                                            </div>
                                            <ChevronDown className={cn("transition-transform duration-300", expandedGroups[provider] && "rotate-180")} />
                                        </button>

                                        <AnimatePresence>
                                            {expandedGroups[provider] && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden space-y-4 px-4 pt-2"
                                                >
                                                    {Object.entries(subProviders).map(([vendor, models]) => (
                                                        <div key={vendor} className="space-y-3">
                                                            <div className="flex items-center gap-3 px-2">
                                                                <Layers size={14} className="text-slate-600" />
                                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{vendor}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                                                {models.map((m: Model) => (
                                                                    <div
                                                                        key={m.id}
                                                                        onClick={() => m.active && toggleModel(m.id)}
                                                                        className={cn(
                                                                            "p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-300 relative overflow-hidden group/m bg-white/2 hover:bg-white/5",
                                                                            enabledModelIds.includes(m.id) && m.active
                                                                                ? "bg-gold-primary/10 border-gold-primary/30 shadow-lg" 
                                                                                : "border-transparent opacity-60",
                                                                            !m.active && "opacity-20 cursor-not-allowed"
                                                                        )}
                                                                    >
                                                                        <div className="flex flex-col min-w-0 z-10">
                                                                            <span className={cn(
                                                                                "text-[10px] uppercase tracking-widest font-black transition-colors",
                                                                                enabledModelIds.includes(m.id) && m.active ? "text-gold-primary" : "text-slate-400"
                                                                            )}>
                                                                                {m.name.includes(':') ? m.name.split(':').pop()?.trim() : m.name}
                                                                            </span>
                                                                        </div>
                                                                        {enabledModelIds.includes(m.id) && m.active && <Check size={14} className="text-gold-primary" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
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
