
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  CreditCard, 
  ShieldCheck, 
  Bell, 
  LogOut,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export function SettingsView() {
    // ... existing SettingsView code remains the same
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [currentSubTab, setCurrentSubTab] = useState('Profil');

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

    const handleUpdateProfile = async (updates: any) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);
            if (error) throw error;
            setProfile({ ...profile, ...updates });
            setSuccessMsg('Zapisano pomyślnie!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error("Profile update error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    if (isLoading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-primary"></div></div>;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-1 md:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <header className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-outfit font-black text-white italic tracking-tight uppercase text-gold-gradient py-2">
                        Ustawienia Systemowe
                    </h1>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Zarządzanie kontem i preferencjami LexMind</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Navigation Sidebar */}
                    <aside className="lg:col-span-1 space-y-2">
                        <NavCard icon={<User size={18} />} label="Profil" active={currentSubTab === 'Profil'} onClick={() => setCurrentSubTab('Profil')} />
                        <NavCard icon={<ShieldCheck size={18} />} label="Bezpieczeństwo" active={currentSubTab === 'Bezpieczeństwo'} onClick={() => setCurrentSubTab('Bezpieczeństwo')} />
                        <NavCard icon={<CreditCard size={18} />} label="Subskrypcja" active={currentSubTab === 'Subskrypcja'} onClick={() => setCurrentSubTab('Subskrypcja')} />
                        <NavCard icon={<Bell size={18} />} label="Powiadomienia" active={currentSubTab === 'Powiadomienia'} onClick={() => setCurrentSubTab('Powiadomienia')} />
                        
                        <div className="pt-8">
                            <button 
                                onClick={handleSignOut}
                                className="w-full group flex items-center justify-between p-4 rounded-2xl bg-red-400/5 hover:bg-red-400/10 border border-red-400/10 hover:border-red-400/30 transition-all text-red-400"
                            >
                                <div className="flex items-center gap-3">
                                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Wyloguj Się</span>
                                </div>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </aside>

                    {/* Content Section */}
                    <main className="lg:col-span-2 space-y-6">
                        <AnimatePresence mode="wait">
                            {currentSubTab === 'Profil' && (
                                <motion.section 
                                    key="profil"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-(--bg-top)/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-3xl bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center text-3xl font-black text-gold-primary shadow-[0_0_40px_rgba(255,215,128,0.15)] overflow-hidden relative group">
                                            {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">{profile?.full_name || 'Użytkownik LexMind'}</h2>
                                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                                <Mail size={12} className="text-gold-primary" /> {user?.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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

                                    <div className="pt-4 flex items-center justify-between">
                                        {successMsg && (
                                            <motion.div 
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                            >
                                                <CheckCircle2 size={14} /> {successMsg}
                                            </motion.div>
                                        )}
                                        <div className="flex-1" />
                                        <button 
                                            className="px-8 py-3 bg-gold-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(255,215,128,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Zapisywanie...' : 'Zapisz Profil'}
                                        </button>
                                    </div>
                                </motion.section>
                            )}

                            {currentSubTab === 'Bezpieczeństwo' && (
                                <motion.section 
                                    key="security"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-(--bg-top)/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
                                >
                                    <h2 className="text-xl font-black text-white italic tracking-tight uppercase text-gold-gradient">Bezpieczeństwo</h2>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black text-white uppercase tracking-widest">Zmiana Hasła</p>
                                                <p className="text-[10px] text-white/30 font-bold uppercase mt-1">Otrzymasz link do resetowania hasła na e-mail</p>
                                            </div>
                                            <button 
                                                onClick={() => supabase.auth.resetPasswordForEmail(user?.email || '')}
                                                className="px-4 py-2 bg-white/10 hover:bg-gold-primary hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Wyślij Link
                                            </button>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between opacity-50">
                                            <div>
                                                <p className="text-xs font-black text-white uppercase tracking-widest">Dwuetapowa Weryfikacja (MFA)</p>
                                                <p className="text-[10px] text-white/30 font-bold uppercase mt-1">Zwiększ bezpieczeństwo swojego konta</p>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-gold-primary">Wkrótce</span>
                                        </div>
                                    </div>
                                </motion.section>
                            )}


                            {currentSubTab === 'Subskrypcja' && (
                                <motion.section 
                                    key="subscription"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-(--bg-top)/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
                                >
                                    <div className="flex justify-between items-start">
                                        <h2 className="text-xl font-black text-white italic tracking-tight uppercase text-gold-gradient">Subskrypcja</h2>
                                        <span className="px-3 py-1 rounded-full bg-gold-primary/10 text-gold-primary border border-gold-primary/30 text-[9px] font-black uppercase tracking-widest">
                                            {profile?.subscription_tier || 'Free'}
                                        </span>
                                    </div>
                                    
                                    <div className="p-6 rounded-3xl bg-linear-to-br from-gold-primary/20 to-transparent border border-gold-primary/30 relative overflow-hidden group">
                                        <Sparkles size={120} className="absolute -right-10 -bottom-10 text-gold-primary/5 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
                                        <p className="text-gold-primary font-black text-sm uppercase tracking-[0.2em]">Twój pakiet: LexMind Trial</p>
                                        <div className="mt-4 space-y-2">
                                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">• 10 kredytów na start</p>
                                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">• Dostęp do Gemini 2.0 Flash</p>
                                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">• Podstawowa analiza prawna</p>
                                        </div>
                                        <button className="mt-8 px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl">
                                            Uaktualnij do Pro
                                        </button>
                                    </div>
                                </motion.section>
                            )}

                            {currentSubTab === 'Powiadomienia' && (
                                <motion.section 
                                    key="notifications"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-(--bg-top)/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
                                >
                                    <h2 className="text-xl font-black text-white italic tracking-tight uppercase text-gold-gradient">Powiadomienia</h2>
                                    <div className="space-y-3">
                                        <NotificationToggle label="Nowe sprawy AI" active />
                                        <NotificationToggle label="Aktualizacje bazy wiedzy" active />
                                        <NotificationToggle label="Wiadomości systemowe" />
                                        <NotificationToggle label="Promocje i nowości" />
                                    </div>
                                </motion.section>
                            )}
                        </AnimatePresence>

                        {/* Danger Zone Integration */}
                        <section className="bg-red-400/5 border border-red-400/10 rounded-[2.5rem] p-8 flex items-center justify-between group">
                            <div>
                                <h3 className="text-red-400 font-black text-xs uppercase tracking-widest">Strefa Zagrożenia</h3>
                                <p className="text-white/30 text-[9px] mt-1">Usunięcie konta jest nieodwracalne i niszczy historię spraw.</p>
                            </div>
                            <button className="px-6 py-3 border border-red-400/20 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all">
                                <Trash2 size={14} />
                            </button>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}

function NavCard({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group ${
                active 
                    ? 'bg-gold-primary/10 border-gold-primary/30 text-gold-primary shadow-[0_0_30px_rgba(255,215,128,0.1)]' 
                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10 hover:text-white'
            }`}
        >
            <div className={`transition-transform duration-300 ${active ? '' : 'group-hover:scale-110'}`}>
                {icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-primary shadow-[0_0_8px_#FFD780]" />}
        </button>
    );
}

function SettingsInput({ label, defaultValue, placeholder = "", disabled = false, onBlur }: { label: string, defaultValue: string, placeholder?: string, disabled?: boolean, onBlur?: (val: string) => void }) {
    return (
        <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 px-1">{label}</label>
            <div className="relative group">
                <input 
                    type="text"
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    disabled={disabled}
                    onBlur={(e) => onBlur?.(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-gold-primary/40 focus:bg-white/10 p-4 rounded-2xl text-xs font-bold text-white transition-all outline-hidden disabled:opacity-40"
                />
                {disabled && <Lock size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />}
            </div>
        </div>
    );
}

function NotificationToggle({ label, active = false }: { label: string, active?: boolean }) {
    const [isOn, setIsOn] = useState(active);
    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer" onClick={() => setIsOn(!isOn)}>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{label}</span>
            <div className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${isOn ? 'bg-gold-primary' : 'bg-white/20'}`}>
                <motion.div animate={{ x: isOn ? 20 : 0 }} className={`w-3 h-3 rounded-full ${isOn ? 'bg-black' : 'bg-white/40'}`} />
            </div>
        </div>
    );
}
