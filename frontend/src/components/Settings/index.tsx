import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import type { User as AuthUser } from '@supabase/supabase-js';
import type { Profile } from './types';
import { useChatSettingsStore } from '../../store/useChatSettingsStore';
import { ModelOrchestrator } from '../ModelOrchestrator';
import { ProfileSettingsPanel } from './components/ProfileSettingsPanel';
import { ProfileHeroCard } from './components/ProfileHeroCard';
import { SETTINGS_TABS, type SettingsTabId } from './settingsTabs';
import {
  PROFILE_SHELL,
  LibraryHero,
  LibraryToolbar,
  LibraryTabRow,
  type LibraryTabItem,
} from '../Library/shared';

const PROFILE_TABS: LibraryTabItem[] = SETTINGS_TABS.map((t) => ({
  id: t.id,
  label: t.label,
  lexIcon: t.lexIcon,
}));

export function SettingsView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const currentSettingsTab = useChatSettingsStore((s) => s.currentSettingsTab);
  const setSettingsTab = useChatSettingsStore((s) => s.setSettingsTab);
  const activeTab = (currentSettingsTab as SettingsTabId) || 'Profil';
  const activeTabDef = SETTINGS_TABS.find((t) => t.id === activeTab) ?? SETTINGS_TABS[0];

  useEffect(() => {
    async function load() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        const { data } = await supabase.from('profiles').select('*').eq('id', u.id);
        if (data?.[0]) setProfile(data[0]);
        else {
          const p: Profile = { id: u.id, full_name: u.email?.split('@')[0] || 'User', role: 'user' };
          await supabase.from('profiles').insert(p);
          setProfile(p);
        }
      }
      setIsLoading(false);
    }
    void load();
  }, []);

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      setSuccessMsg('Zapisano');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-gold-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-3 sm:pb-4">
      <div className={PROFILE_SHELL}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            {activeTab === 'Profil' ? (
              <ProfileHeroCard user={user} profile={profile} />
            ) : (
              <LibraryHero
                variant="documents"
                ornament="Silnik · Orkiestracja"
                title={activeTabDef.label}
                subtitle={activeTabDef.description}
              />
            )}

            <LibraryToolbar>
              <LibraryTabRow
                tabs={PROFILE_TABS}
                activeId={activeTab}
                onChange={(id) => setSettingsTab(id as SettingsTabId)}
              />
            </LibraryToolbar>

            <section className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {activeTab === 'Profil' ? (
                <ProfileSettingsPanel
                  user={user}
                  profile={profile}
                  onUpdateProfile={handleUpdateProfile}
                  isSaving={isSaving}
                  successMsg={successMsg}
                />
              ) : (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ModelOrchestrator />
                </div>
              )}
            </section>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
