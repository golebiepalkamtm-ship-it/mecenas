import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  Library,
  Gavel,
  Terminal, 
  Sparkles, 
  Sun,
  Moon,
  X,
  ShieldAlert,
  LogOut,
  ChevronRight,
  User
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Import Modular Components
import { ChatView } from './components/Chat';
import { KnowledgeView } from './components/Knowledge';
import { PromptsView } from './components/Prompts';
import { AuthView } from './components/Auth';
import { AdminView } from './components/Admin';
import { SettingsView } from './components/Settings';
import { supabase } from './utils/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { ChatProvider } from './context/ChatContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'chat' | 'knowledge' | 'api' | 'prompts' | 'admin' | 'settings';

const NAV_ITEMS: { id: Tab; icon: React.ReactNode; label: string; sublabel: string; adminOnly?: boolean }[] = [
  { id: 'chat',      icon: <Gavel size={18} />,    label: 'Rozprawa AI',    sublabel: 'Centrum Dowodzenia' },
  { id: 'knowledge', icon: <Library size={18} />,  label: 'Biblioteka',     sublabel: 'Baza Wiedzy' },
  { id: 'prompts',   icon: <Terminal size={18} />, label: 'System Prompts', sublabel: 'Konfiguracja Roli' },
  { id: 'settings',  icon: <User size={18} />,     label: 'Moje Konto',     sublabel: 'Ustawienia Profilu' },
  { id: 'admin',     icon: <ShieldAlert size={18} />, label: 'Panel Admina', sublabel: 'Zarządzanie Flotą', adminOnly: true },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [theme, setTheme] = useState(() => localStorage.getItem('prawnik_theme') || 'dark');
  const [showNav, setShowNav] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data?.role) setUserRole(data.role);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session?.user.id) fetchUserRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user.id) fetchUserRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
    localStorage.setItem('prawnik_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleTabClick = (id: Tab) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) setShowNav(false);
  };

  if (authLoading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#020a13]">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-[rgba(255,215,128,0.95)] shadow-[0_0_60px_rgba(255,215,128,0.5)] flex items-center justify-center animate-pulse">
          <Scale className="w-8 h-8 text-black" fill="currentColor" strokeWidth={1} />
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[rgba(255,215,128,0.6)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  if (!session) return <AuthView />;

  const userEmail = session.user.email || '';
  const userInitials = userEmail.slice(0, 2).toUpperCase();

  return (
    <ChatProvider>
    <div className="flex h-screen w-screen bg-transparent overflow-hidden relative selection:bg-gold-primary/30 selection:text-white">
      {/* Aurora BG */}
      <div className="aurora-bg" />
      
      {/* Noise Overlay */}
      <div className="noise-overlay fixed inset-0 z-0 pointer-events-none" />
      
      {/* MOBILE NAV OVERLAY */}
      <AnimatePresence>
        {showNav && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowNav(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* FLOATING EXPAND BUTTON */}
      <AnimatePresence>
        {!showNav && (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setShowNav(true)}
            className="absolute left-4 top-6 lg:left-4 lg:top-1/2 lg:-translate-y-1/2 z-50 p-3 glass-prestige bg-(--bg-top) rounded-2xl text-(--gold-primary) hover:scale-110 transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)] interactive"
            title="Rozwiń Nawigację"
          >
            <Scale size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <AnimatePresence>
        {showNav && (
          <motion.nav 
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed lg:relative inset-y-0 left-0 w-full xs:w-[300px] sm:w-[320px] lg:w-[300px] xl:w-[320px] lg:h-[calc(100%-2rem)] flex flex-col z-50 glass-prestige lg:rounded-[2.5rem] lg:my-4 lg:ml-4 shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden bg-(--bg-top) backdrop-blur-3xl"
          >
            {/* Subtle edge glow */}
            <div className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-gold-primary/20 to-transparent pointer-events-none" />
            
            {/* CLOSE BUTTON MOBILE */}
            <button 
              onClick={() => setShowNav(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all lg:hidden"
            >
              <X size={20} />
            </button>

            {/* LOGO */}
            <div className="px-8 pt-10 pb-6 flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-2xl bg-gold-primary shadow-[0_0_40px_rgba(255,215,128,0.5)] flex items-center justify-center shrink-0 cursor-pointer animate-glow-pulse"
              >
                <Scale className="w-7 h-7 text-black" fill="currentColor" strokeWidth={1} />
              </motion.div>
              <div>
                <h1 className="text-xl font-outfit font-black tracking-tight uppercase italic text-gold-gradient leading-none">
                  LexMind AI
                </h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                  <p className="text-[9px] font-inter text-white font-black uppercase tracking-[0.3em]">SYSTEM ONLINE</p>
                </div>
              </div>
            </div>

            {/* NAV LABEL */}
            <div className="px-8 mb-3">
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Nawigacja</p>
            </div>

            {/* NAV ITEMS */}
            <div className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-4">
              {NAV_ITEMS.filter(item => !item.adminOnly || userRole === 'admin').map((item) => (
                <SidebarItem 
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  sublabel={item.sublabel}
                  active={activeTab === item.id}
                  onClick={() => handleTabClick(item.id)}
                  danger={item.id === 'admin'}
                />
              ))}
            </div>

            {/* SPACER LINE */}
            <div className="mx-6 h-px bg-gold-muted/20" />

            {/* BOTTOM */}
            <div className="p-4 space-y-3">
              {/* Update Button */}
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.dispatchEvent(new CustomEvent('prawnik_models_updated'))}
                className="w-full py-3.5 text-[9px] font-black uppercase tracking-[0.25em] text-gold-primary border border-gold-primary/20 bg-gold-primary/5 rounded-2xl hover:bg-gold-primary/15 hover:border-gold-primary/40 transition-all flex items-center justify-center gap-2.5 relative overflow-hidden group"
              >
                <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-gold-primary/40 to-transparent" />
                <Sparkles size={12} className="group-hover:rotate-12 transition-transform duration-300" />
                Sprawdź Aktualizacje
              </motion.button>

              {/* User Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 group">
                <div className="w-9 h-9 rounded-xl bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-black text-gold-primary">{userInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-white truncate">{userEmail.split('@')[0]}</p>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-wider">{userRole}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSignOut}
                  title="Wyloguj"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <LogOut size={14} />
                </motion.button>
              </div>

              {/* Collapse */}
              <button 
                onClick={() => setShowNav(false)}
                className="hidden lg:flex w-full py-3 text-[8px] font-black uppercase tracking-[0.3em] text-white/70 hover:text-white rounded-xl hover:bg-white/5 transition-all items-center justify-center gap-2 group/close"
              >
                <ChevronRight size={12} className="group-hover/close:-translate-x-0.5 transition-transform" />
                Zwiń
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex-1 flex flex-col relative z-10 overflow-hidden m-2 lg:m-4 gap-2 lg:gap-3 will-animate"
      >
        {/* TOP STATUS BAR */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 22 }}
          className="h-16 lg:h-20 flex items-center px-4 md:px-8 lg:px-12 justify-between glass-prestige bg-(--bg-top) rounded-2xl lg:rounded-3xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] relative overflow-hidden group/header shrink-0"
        >
          {/* Hover sweep */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/3 to-transparent -translate-x-full group-hover/header:translate-x-full transition-transform duration-1000 pointer-events-none" />
          
          <div className="flex items-center gap-3 md:gap-6 relative z-10 min-w-0">
            {!showNav && <div className="w-8 lg:hidden shrink-0" />}
            <div className="flex flex-col min-w-0">
              <h1 className="text-base md:text-xl lg:text-2xl font-outfit font-black tracking-tight uppercase italic shimmer-text drop-shadow-2xl leading-none truncate">
                Radca AI — LexMind
              </h1>
              <p className="text-[7px] md:text-[9px] font-inter font-black text-(--text-secondary) uppercase tracking-[0.3em] mt-0.5 opacity-60 truncate">
                {NAV_ITEMS.find(n => n.id === activeTab)?.sublabel || 'Inteligentny System Prawny'}
              </p>
            </div>
          </div>

          {/* Disclaimer — only on wider screens */}
          <div className="hidden xl:block absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <p className="text-[8px] font-bold text-white/50 uppercase tracking-[0.2em] text-center leading-tight">
              Serwis ma charakter wyłącznie informacyjny.<br />
              Treści nie stanowią porady prawnej.
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 relative z-10">
            {/* Active Tab Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </span>
            </div>

            {/* Theme Toggle */}
            <motion.div 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92, rotate: 20 }}
              onClick={toggleTheme}
              className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl border-prestige bg-white/5 flex items-center justify-center text-slate-400 hover:text-gold-primary hover:bg-white/10 transition-colors cursor-pointer interactive"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* AI Status Badge */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl border-prestige bg-gold-primary/20 flex items-center justify-center cursor-pointer"
            >
              <Sparkles size={16} className="text-gold-primary" fill="currentColor" />
            </motion.div>
          </div>
        </motion.header>

        {/* CONTENT VIEW */}
        <section className="flex-1 overflow-hidden relative glass-prestige rounded-2xl lg:rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.6)] bg-(--bg-top)/80">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ 
                duration: 0.25,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="w-full h-full will-animate"
            >
              {activeTab === 'chat' && <ChatView />}
              {activeTab === 'knowledge' && <KnowledgeView />}
              {activeTab === 'prompts' && <PromptsView />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'admin' && <AdminView />}
            </motion.div>
          </AnimatePresence>
        </section>
      </motion.main>
    </div>
    </ChatProvider>
  );
}

// ─── SIDEBAR ITEM ───

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
}

function SidebarItem({ icon, label, sublabel, active, onClick, danger = false }: SidebarItemProps) {
  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group relative flex items-center gap-4 px-5 py-3.5 cursor-pointer rounded-2xl transition-colors duration-200 overflow-hidden",
        active 
          ? danger 
            ? "bg-red-500/15 border border-red-500/30" 
            : "bg-gold-primary/10 border border-gold-primary/25"
          : "border border-transparent hover:bg-white/5"
      )}
    >
      {/* Active glow bloom */}
      {active && !danger && (
        <motion.div
          layoutId="nav-glow"
          className="absolute inset-0 bg-gold-primary/5 rounded-2xl blur-xl"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      <div className={cn(
        "relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0",
        active
          ? danger 
            ? "bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
            : "bg-gold-primary/20 text-gold-primary shadow-[0_0_20px_rgba(255,215,128,0.25)]"
          : "bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10"
      )}>
        {icon}
      </div>

      <div className="flex flex-col min-w-0 relative z-10 flex-1">
        <span className={cn(
          "text-[12px] font-black tracking-tight leading-none mb-0.5 truncate",
          active ? (danger ? "text-red-300" : "text-gold-primary") : "text-(--text-secondary) group-hover:text-white"
        )}>
          {label}
        </span>
        <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider truncate">
          {sublabel}
        </span>
      </div>

      {/* Active indicator */}
      {active && (
        <motion.div 
          layoutId="active-dot"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className={cn(
            "relative z-10 w-1.5 h-1.5 rounded-full shrink-0",
            danger ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-gold-primary shadow-[0_0_10px_rgba(255,215,128,0.9)]"
          )}
        />
      )}
    </motion.div>
  );
}
