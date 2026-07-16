import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2 } from 'lucide-react';
import { LexIcon, type LexIconName } from '../../Layout/LexIcon';
import { useFavoriteModelsCount } from '../../../hooks/chatSettingsSelectors';
import type { SettingsViewProps } from '../types';
import { APIKeysSection } from './APIKeysSection';
import { ProfileAccountForm } from './ProfileAccountForm';
import { SubscriptionCard } from './SubscriptionCard';
import { cn } from '../../../utils/cn';

const STAGGER = 0.08;

function Col({
  children,
  className,
  index,
}: {
  children: ReactNode;
  className?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.12 + index * STAGGER, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col min-h-0 min-w-0',
        'px-4 sm:px-5 xl:px-6 py-4 sm:py-5',
        'border-black/6',
        index < 3 && 'xl:border-r',
        index % 2 === 0 && 'md:max-xl:border-r',
        index < 2 && 'md:max-xl:border-b xl:border-b-0',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children, icon, className }: { children: string; icon?: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('library-view-label flex items-center gap-2 shrink-0 not-italic', className)}>
      {icon}
      {children}
    </h3>
  );
}

function ToggleRow({ label, on, onToggle, tooltipId, setHoveredTooltip }: { label: string; on: boolean; onToggle: () => void; tooltipId: string; setHoveredTooltip: (id: string | null) => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHoveredTooltip(tooltipId)}
      onMouseLeave={() => setHoveredTooltip(null)}
      className={cn(
        'flex items-center justify-between gap-2 px-2.5 py-1.5 library-view-cell',
        'hover:bg-white/50 w-full text-left transition-colors duration-300 relative group/toggle',
      )}
    >
      <span className="text-[8px] font-black uppercase tracking-widest text-black/60 font-outfit truncate">{label}</span>
      <div className={cn('w-7 h-3.5 rounded-full flex items-center px-0.5 shrink-0', on ? 'bg-gold-primary' : 'bg-black/10')}>
        <motion.div
          animate={{ x: on ? 13 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn('w-2.5 h-2.5 rounded-full', on ? 'bg-black' : 'bg-white')}
        />
      </div>
    </button>
  );
}

function StatBox({ lexIcon, label, value }: { lexIcon: LexIconName; label: string; value: string }) {
  return (
    <div className={cn('p-2 flex flex-col items-center justify-center text-center min-w-0 library-view-cell')}>
      <LexIcon name={lexIcon} size={11} />
      <p className="text-[6px] font-black uppercase tracking-widest text-black/35 mt-1 truncate w-full">{label}</p>
      <p className="text-[9px] font-black text-black italic font-outfit truncate w-full">{value}</p>
    </div>
  );
}

export function ProfileSettingsPanel({
  user,
  profile,
  onUpdateProfile,
  isSaving,
  successMsg,
}: Pick<SettingsViewProps, 'user' | 'profile' | 'onUpdateProfile' | 'isSaving' | 'successMsg'>) {
  const favoriteCount = useFavoriteModelsCount();
  const [notif, setNotif] = useState({ newCases: true, kb: true, sys: false, promos: false });
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div
          className={cn(
            'grid min-h-full',
            'grid-cols-1 md:grid-cols-2',
            'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1.1fr)]',
            'xl:grid-rows-1 md:grid-rows-2',
          )}
        >
          <Col index={0} className="xl:row-span-1">
            <ProfileAccountForm
              user={user}
              profile={profile}
              onUpdateProfile={onUpdateProfile}
              isSaving={isSaving}
              successMsg={successMsg}
            />
          </Col>

          <Col index={1}>
            <SectionLabel className="mb-3">Subskrypcja</SectionLabel>
            <div className="flex-1 min-h-0">
              <SubscriptionCard profile={profile} />
            </div>
          </Col>

          <Col index={2}>
            <SectionLabel className="mb-3" icon={<LexIcon name="shield" size={11} />}>
              Klucze API
            </SectionLabel>
            <div className="flex-1 min-h-0 library-view-panel p-3 sm:p-4">
              <APIKeysSection profile={profile} onUpdateProfile={onUpdateProfile} />
            </div>
          </Col>

          <Col index={3}>
            <div className="flex items-center justify-between shrink-0 mb-3">
              <SectionLabel className="mb-0">System</SectionLabel>
              <span className="text-[7px] font-black uppercase text-emerald-700 tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10">
                Optimized
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 shrink-0 mb-3">
              <StatBox lexIcon="ai" label="AI" value="OK" />
              <StatBox lexIcon="chat" label="Zespół" value={String(favoriteCount)} />
              <StatBox lexIcon="knowledge" label="Baza" value="Sync" />
              <StatBox lexIcon="settings" label="Ver." value="3.0" />
            </div>

            <SectionLabel className="mb-2" icon={<Bell size={10} className="text-gold-primary" />}>
              Powiadomienia
            </SectionLabel>
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-1.5 content-start relative">
              <ToggleRow label="Sprawy AI" on={notif.newCases} onToggle={() => setNotif((p) => ({ ...p, newCases: !p.newCases }))} tooltipId="notif_cases" setHoveredTooltip={setHoveredTooltip} />
              <ToggleRow label="Baza wiedzy" on={notif.kb} onToggle={() => setNotif((p) => ({ ...p, kb: !p.kb }))} tooltipId="notif_kb" setHoveredTooltip={setHoveredTooltip} />
              <ToggleRow label="System" on={notif.sys} onToggle={() => setNotif((p) => ({ ...p, sys: !p.sys }))} tooltipId="notif_sys" setHoveredTooltip={setHoveredTooltip} />
              <ToggleRow label="Promocje" on={notif.promos} onToggle={() => setNotif((p) => ({ ...p, promos: !p.promos }))} tooltipId="notif_promos" setHoveredTooltip={setHoveredTooltip} />
              
              <AnimatePresence>
                {hoveredTooltip && hoveredTooltip.startsWith('notif_') && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                      {hoveredTooltip === 'notif_cases' ? 'Powiadomienia: Sprawy AI' :
                       hoveredTooltip === 'notif_kb' ? 'Powiadomienia: Baza Wiedzy' :
                       hoveredTooltip === 'notif_sys' ? 'Powiadomienia: Systemowe' :
                       hoveredTooltip === 'notif_promos' ? 'Powiadomienia: Oferty' : ''}
                    </p>
                    <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1.5">
                      {hoveredTooltip === 'notif_cases' ? 'Informuje o nowych sugestiach ekspertów dotyczących Twoich otwartych spraw.' :
                       hoveredTooltip === 'notif_kb' ? 'Wysyła alerty, gdy nowo wgrane dokumenty powiążą się z aktualnymi sprawami.' :
                       hoveredTooltip === 'notif_sys' ? 'Otrzymuj wiadomości o nowych modelach AI, awariach i oknach serwisowych.' :
                       hoveredTooltip === 'notif_promos' ? 'Najlepsze oferty cenowe, zniżki na zapytania premium i pakiety dla biura.' : ''}
                    </p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              onMouseEnter={() => setHoveredTooltip('delete_account')}
              onMouseLeave={() => setHoveredTooltip(null)}
              className={cn(
                'mt-3 shrink-0 flex items-center justify-between px-3 py-2 library-view-cell relative group/delete',
                'border-red-300/50 bg-red-50/40 hover:bg-red-50/60 transition-colors',
              )}
            >
              <span className="text-[8px] font-black uppercase text-red-700 tracking-widest">Usuń konto</span>
              <button type="button" className="p-1 text-red-500/80 hover:text-red-700" aria-label="Usuń konto">
                <Trash2 size={12} />
              </button>
              
              <AnimatePresence>
                {hoveredTooltip === 'delete_account' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute top-full right-0 mt-2 w-56 p-3 bg-white border border-red-500/20 rounded-2xl shadow-[0_15px_30px_rgba(239,68,68,0.15)] text-left z-9999 pointer-events-none"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1">
                      Nieodwracalne Usunięcie
                    </p>
                    <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1.5">
                      Usunięcie konta natychmiast i bezpowrotnie kasuje wszystkie Twoje sprawy, wgrane pliki oraz całą prywatną bazę wiedzy (RAG). Akcja wymaga potrójnego potwierdzenia.
                    </p>
                    <div className="absolute bottom-full right-4 -mb-px w-2 h-2 bg-white border-l border-t border-red-500/20 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Col>
        </div>
      </div>
    </div>
  );
}
