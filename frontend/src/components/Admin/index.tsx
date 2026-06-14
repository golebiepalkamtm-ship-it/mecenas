import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert, Activity } from 'lucide-react';
import { useAdminUsers, useApiManagement, useAdminSystem } from '../../hooks';
import { SecurityPanel } from './components/SecurityPanel';
import { ModelsPanel } from './components/ModelsPanel';
import { SystemPanel } from './components/SystemPanel';
import { UsersPanel } from './components/UsersPanel';
import { DebuggerPanel } from './components/DebuggerPanel';
import type { AdminTab, AdminTabConfig } from './types';
import { formatNumber } from './utils';
import { cn } from '../../utils/cn';
import {
  ADMIN_SHELL,
  LibraryHero,
  LibraryStatPill,
  LibraryToolbar,
  LibraryTabRow,
  type LibraryTabItem,
} from '../Library/shared';

const TABS: AdminTabConfig[] = [
  { id: 'system', label: 'Stan Systemu', lexIcon: 'admin' },
  { id: 'security', label: 'Klucze API', lexIcon: 'shield' },
  { id: 'models', label: 'Modele AI', lexIcon: 'ai' },
  { id: 'users', label: 'Użytkownicy', lexIcon: 'user' },
  { id: 'debugger', label: 'Diagnostyka', lexIcon: 'prompts' },
];

const TAB_COPY: Record<AdminTab, { title: string; subtitle: string }> = {
  system: {
    title: 'Admin',
    subtitle: 'Pulpit operacyjny · metryki platformy i status usług',
  },
  security: {
    title: 'Admin',
    subtitle: 'Klucze API · konfiguracja dostawców AI',
  },
  models: {
    title: 'Admin',
    subtitle: 'Mapa modeli OpenRouter · włączanie i filtry',
  },
  users: {
    title: 'Admin',
    subtitle: 'Baza użytkowników · role i uprawnienia',
  },
  debugger: {
    title: 'Admin',
    subtitle: 'Diagnostyka · logi i testy połączeń',
  },
};

const ADMIN_TABS: LibraryTabItem[] = TABS.map((t) => ({
  id: t.id,
  label: t.label,
  lexIcon: t.lexIcon,
}));

export function AdminView() {
  const [activeTab, setActiveTab] = useState<AdminTab>('system');

  const { users, isLoading: usersLoading, updateUserRole, deleteUser } = useAdminUsers();
  const { providers, toggleProvider, updateProviderKey, addProvider, removeProvider } = useApiManagement();
  const { stats, services, isLoading: systemLoading } = useAdminSystem();

  const copy = TAB_COPY[activeTab];

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-3 sm:pb-4">
      <div className={ADMIN_SHELL}>
        <LibraryHero
          variant="documents"
          ornament="LexMind · Centrum kontroli"
          title={copy.title}
          subtitle={copy.subtitle}
          badge={
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold-primary/35 bg-gold-primary/12 text-[10px] font-black uppercase tracking-[0.2em] text-gold-bright font-outfit">
                <ShieldAlert size={10} className="text-gold-primary" />
                <Activity size={10} className="animate-pulse" />
                Administrator
              </span>
              {stats && activeTab === 'system' && (
                <>
                  <LibraryStatPill label="Użytk." value={formatNumber(stats.users)} />
                  <LibraryStatPill label="Dok." value={formatNumber(stats.docs)} />
                  <LibraryStatPill label="Zapyt." value={formatNumber(stats.requests)} />
                  <LibraryStatPill label="Tokeny" value={formatNumber(stats.tokens)} />
                </>
              )}
            </>
          }
        />

        <LibraryToolbar>
          <LibraryTabRow tabs={ADMIN_TABS} activeId={activeTab} onChange={(id) => setActiveTab(id as AdminTab)} />
        </LibraryToolbar>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={cn('p-4 sm:p-5 lg:p-6', activeTab === 'models' && 'p-3 sm:p-4')}
            >
              {activeTab === 'system' && (
                <SystemPanel stats={stats} services={services} isLoading={systemLoading} />
              )}
              {activeTab === 'security' && (
                <SecurityPanel
                  providers={providers}
                  onToggleProvider={toggleProvider}
                  onUpdateKey={updateProviderKey}
                  onAddProvider={addProvider}
                  onRemoveProvider={removeProvider}
                />
              )}
              {activeTab === 'models' && <ModelsPanel embedded />}
              {activeTab === 'users' && (
                <UsersPanel
                  users={users}
                  isLoading={usersLoading}
                  onUpdateRole={updateUserRole}
                  onDelete={deleteUser}
                />
              )}
              {activeTab === 'debugger' && <DebuggerPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
