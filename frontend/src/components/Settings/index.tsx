import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Loader2, Cpu, HardDrive, Wifi, Gauge, Bell, Mail, CheckCircle2, Sparkles, Shield } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { Profile } from './types';
import { useChatSettingsStore } from '../../store/useChatSettingsStore';

import { SettingsInput } from './components/SettingsInput';
import { ModelOrchestrator } from '../ModelOrchestrator';

export function SettingsView() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const { currentSettingsTab } = useChatSettingsStore();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
            setIsLoading(false);
        }
        loadProfile();
    }, []);

    function SystemInfoCard({ icon: Icon, label, value, status }: { icon: React.ElementType; label: string; value: string; status: 'active' | 'warning' | 'neutral' }) {
        const statusColor = { active: 'text-emerald-400', warning: 'text-amber-400', neutral: 'text-gold-primary' }[status];
        const statusDot = { active: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]', warning: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]', neutral: 'bg-gold-primary shadow-[0_0_6px_rgba(212,175,55,0.5)]' }[status];
    return (
        <div className="p-3.5 rounded-xl glass-prestige flex items-center gap-2.5 hover:bg-white/5 transition-all">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 flex-shrink-0">
                    <Icon size={13} className={statusColor} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em] truncate">{label}</p>
                    <p className={`text-[9px] font-black ${statusColor} uppercase tracking-wider flex items-center gap-1.5 mt-0.5 truncate`}>
                        <span className={`w-1 h-1 rounded-full ${statusDot}`} />{value}
                    </p>
                </div>
            </div>
        );
    }

    function NotificationToggle({ label, active = false }: { label: string; active?: boolean }) {
        const [isOn, setIsOn] = useState(active);
        return (
            <div className="px-4 py-3 rounded-xl glass-prestige flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer" onClick={() => setIsOn(!isOn)}>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/80 truncate mr-2">{label}</span>
                <div className={`w-7 h-3.5 rounded-full transition-all flex items-center px-0.5 flex-shrink-0 ${isOn ? 'bg-gold-primary' : 'bg-white/20'}`}>
                    <motion.div animate={{ x: isOn ? 13 : 0 }} className={`w-2.5 h-2.5 rounded-full ${isOn ? 'bg-black' : 'bg-white/40'}`} />
                </div>
            </div>
        );
    }

    const handleUpdateProfile = async (updates: Partial<Profile>) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);
            if (error) throw error;
            setProfile(prev => (prev ? { ...prev, ...updates } as Profile : null));
            window.dispatchEvent(new CustomEvent('prawnik_profile_updated', {
                detail: { profile: { ...profile, ...updates } }
            }));
            setSuccessMsg('Zapisano pomyślnie!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error("Profile update error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center space-y-6 bg-prestige-view">
                <div className="w-16 h-16 rounded-3xl glass-prestige flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 neural-orb opacity-40" />
                    <Loader2 size={32} className="animate-spin text-gold-primary relative z-10" />
                </div>
                <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-gold-primary/80 animate-pulse">Autoryzacja Profilu</p>
                    <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/20 mt-2">Synchronizacja z Prestige Cloud</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-prestige-view relative overflow-hidden">
            <div className="absolute inset-0 noise-overlay opacity-20 pointer-events-none" />
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSettingsTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {currentSettingsTab === 'Profil' && (
                        <div className="w-full mx-auto px-10 pt-0 pb-10">
                            <motion.section
                                key="profile-4col"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="glass-prestige rounded-2xl p-16 shadow-2xl min-h-[80vh]"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr] gap-10 h-full">
                                    {/* Column 1: Profile Details */}
                                    <div className="space-y-4 flex flex-col h-full">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl glass-prestige-gold flex items-center justify-center text-2xl font-black text-gold-primary shadow-[0_10px_30px_rgba(212,175,55,0.25)] overflow-hidden relative group">
                                                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="text-lg font-black text-white italic tracking-tight truncate">{profile?.full_name || 'Użytkownik LexMind'}</h2>
                                                <p className="text-gold-300/60 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5 truncate">
                                                    <Mail size={10} className="text-gold-primary flex-shrink-0" /> {user?.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <SettingsInput
                                                label="Pełne Imię i Nazwisko"
                                                defaultValue={profile?.full_name || ''}
                                                placeholder="Wpisz dane..."
                                                onBlur={(val) => handleUpdateProfile({ full_name: val })}
                                            />
                                            <SettingsInput
                                                label="ID Użytkownika"
                                                defaultValue={user?.id?.substring(0, 12) + "..."}
                                                disabled
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            {successMsg && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={12} /> {successMsg}
                                                </motion.div>
                                            )}
                                            <div className="flex-1" />
                                            <button
                                                className="px-5 py-2 bg-gold-primary text-black text-[9px] font-black uppercase tracking-widest rounded-lg shadow-[0_8px_20px_rgba(255,215,128,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? 'Zapisywanie...' : 'Zapisz Profil'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Column 2: Subskrypcja */}
                                    <div className="space-y-4 flex flex-col h-full">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-sm font-black text-white italic tracking-tight uppercase text-gold-gradient">Subskrypcja</h2>
                                            <span className="px-2 py-0.5 rounded-full bg-gold-primary/10 text-gold-primary border border-gold-primary/30 text-[8px] font-black uppercase tracking-widest">
                                                {profile?.subscription_tier || 'Free'}
                                            </span>
                                        </div>

                                        <div className="p-6 rounded-xl glass-prestige-gold relative overflow-hidden group flex-grow">
                                            <Sparkles size={80} className="absolute -right-6 -bottom-6 text-gold-primary/10 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
                                            <p className="text-gold-primary font-black text-sm uppercase tracking-[0.2em] italic">Twój pakiet: LexMind Trial</p>
                                            <div className="mt-3 space-y-2">
                                                <div className="text-white/80 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-gold-primary shadow-[0_0_6px_#FFD780]" /> 10 kredytów na start
                                                </div>
                                                <div className="text-white/80 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-gold-primary shadow-[0_0_6px_#FFD780]" /> Dostęp do Gemini 2.0 Flash
                                                </div>
                                                <div className="text-white/80 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-gold-primary shadow-[0_0_6px_#FFD780]" /> Podstawowa analiza prawna
                                                </div>
                                            </div>
                                            <button className="mt-4 px-6 py-2.5 bg-white text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-2xl border-t-2 border-white/80">
                                                Uaktualnij do Pro
                                            </button>
                                        </div>
                                    </div>

                                    {/* Column 3: Bezpieczeństwo */}
                                    <div className="space-y-4 flex flex-col h-full">
                                        <h3 className="text-[10px] font-black text-white italic tracking-tight uppercase text-gold-gradient flex items-center gap-2">
                                            <Shield size={12} className="text-gold-primary" />
                                            Bezpieczeństwo
                                        </h3>
                                        <div className="space-y-1.5 flex-grow">
                                            <div className="p-4 rounded-xl glass-prestige flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Zmiana Hasła</p>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase mt-0.5 truncate">Link do resetowania na e-mail</p>
                                                </div>
                                                <button
                                                    onClick={() => supabase.auth.resetPasswordForEmail(user?.email || '')}
                                                    className="px-3 py-1.5 bg-white/10 hover:bg-gold-primary hover:text-black rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex-shrink-0"
                                                >
                                                    Wyślij Link
                                                </button>
                                            </div>
                                            <div className="p-3 rounded-xl glass-prestige flex items-center justify-between opacity-50 gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Dwuetapowa Weryfikacja</p>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase mt-0.5 truncate">Zwiększ bezpieczeństwo konta</p>
                                                </div>
                                                <span className="text-[7px] font-black uppercase text-gold-primary flex-shrink-0">Wkrótce</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 4: System, Powiadomienia, Usuń Konto */}
                                    <div className="space-y-4 flex flex-col h-full">
                                        {/* System */}
                                        <div>
                                            <h3 className="text-[10px] font-black text-white italic tracking-tight uppercase text-gold-gradient mb-2">System</h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                <SystemInfoCard icon={Cpu} label="Silnik AI" value="Aktywny" status="active" />
                                                <SystemInfoCard icon={Wifi} label="Połączenie" value="Stabilne" status="active" />
                                                <SystemInfoCard icon={HardDrive} label="Baza Wiedzy" value="Zsynchronizowana" status="active" />
                                                <SystemInfoCard icon={Gauge} label="Wersja" value="v3.0 Prestige" status="neutral" />
                                            </div>
                                        </div>

                                        {/* Powiadomienia */}
                                        <div>
                                            <h3 className="text-[10px] font-black text-white italic tracking-tight uppercase text-gold-gradient flex items-center gap-2 mb-2">
                                                <Bell size={12} className="text-gold-primary" />
                                                Powiadomienia
                                            </h3>
                                            <div className="space-y-1">
                                                <NotificationToggle label="Nowe sprawy AI" active />
                                                <NotificationToggle label="Aktualizacje bazy wiedzy" active />
                                                <NotificationToggle label="Wiadomości systemowe" />
                                                <NotificationToggle label="Promocje i nowości" />
                                            </div>
                                        </div>

                                        {/* Usuń Konto */}
                                        <section className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex items-center justify-between gap-4 group hover:border-red-500/30 transition-all">
                                            <div className="space-y-0.5">
                                                <h3 className="text-red-400 font-black text-[10px] uppercase tracking-[0.3em]">Usuń Konto</h3>
                                                <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest max-w-sm">
                                                    Wszystkie dane zostaną bezpowrotnie skasowane.
                                                </p>
                                            </div>
                                            <button className="px-4 py-2 border border-red-500/20 text-red-500/40 hover:text-white hover:bg-red-500 text-[8px] font-black uppercase tracking-[0.3em] rounded-lg transition-all">
                                                <Trash2 size={12} />
                                            </button>
                                        </section>
                                    </div>
                                </div>
                            </motion.section>
                        </div>
                    )}

                    {currentSettingsTab === 'Modele AI' && (
                        <div className="px-6 py-6">
                            <div className="glass-prestige rounded-[2.5rem] shadow-3xl overflow-hidden h-[calc(100vh-220px)] border border-white/5">
                                <ModelOrchestrator />
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
