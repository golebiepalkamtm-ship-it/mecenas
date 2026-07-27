/**
 * Zakładka: Preferencje & Statystyki
 */
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Zap, FileText, Clock } from 'lucide-react';
import type { UserPreferences, NotificationPreferences, UserStatistics } from '../../../types/profile';

interface PreferencesTabProps {
  preferences: UserPreferences | null;
  notifications: NotificationPreferences | null;
  statistics: UserStatistics | null;
  onUpdatePreferences?: (prefs: Partial<UserPreferences>) => Promise<void>;
  onUpdateNotifications?: (notifs: Partial<NotificationPreferences>) => Promise<void>;
}

export function PreferencesTab({
  preferences,
  notifications,
  statistics,
  onUpdatePreferences,
  onUpdateNotifications,
}: PreferencesTabProps) {
  const StatCard = ({ icon: Icon, label, value, unit }: any) => (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 border border-black/10 rounded-lg bg-white/40 hover:bg-white/60 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-gold-primary" />
        <div>
          <p className="text-xs text-black/60 uppercase tracking-widest font-semibold">
            {label}
          </p>
          <p className="text-lg font-bold text-black">
            {value?.toLocaleString('pl-PL') || '—'} {unit && <span className="text-xs">{unit}</span>}
          </p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* STATYSTYKI */}
      {statistics && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h4 className="text-sm font-bold uppercase tracking-widest text-black/70 mb-4">
            Statystyki Twojego Konta
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              icon={Clock}
              label="Czaty"
              value={statistics.total_chats}
            />
            <StatCard
              icon={FileText}
              label="Dokumenty"
              value={statistics.total_documents}
            />
            <StatCard
              icon={Zap}
              label="Tokeny użyte"
              value={statistics.current_month_tokens}
              unit="/ mies."
            />
            <StatCard
              icon={TrendingUp}
              label="Średnio / czat"
              value={Math.round(statistics.average_tokens_per_chat)}
              unit="tokenów"
            />
            <StatCard
              icon={BarChart3}
              label="Najpopularniejszy model"
              value={statistics.most_used_model?.split('/').pop()?.toUpperCase() || '—'}
            />
          </div>
        </motion.div>
      )}

      {/* PREFERENCJE SYSTEMU */}
      {preferences && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h4 className="text-sm font-bold uppercase tracking-widest text-black/70 mb-4">
            Preferencje Systemu
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-4 border border-black/10 rounded-lg bg-white/40">
              <label className="text-xs font-semibold text-black/70 uppercase tracking-widest block mb-2">
                Motyw
              </label>
              <select
                defaultValue={preferences.theme}
                onChange={(e) =>
                  onUpdatePreferences?.({ ...preferences, theme: e.target.value as any })
                }
                className="w-full px-3 py-2 text-sm border border-black/10 rounded bg-white/50 focus:outline-none focus:border-gold-primary"
              >
                <option value="light">Jasny</option>
                <option value="dark">Ciemny</option>
                <option value="system">Systemowy</option>
              </select>
            </div>

            <div className="p-4 border border-black/10 rounded-lg bg-white/40">
              <label className="text-xs font-semibold text-black/70 uppercase tracking-widest block mb-2">
                Język
              </label>
              <select
                defaultValue={preferences.language}
                onChange={(e) =>
                  onUpdatePreferences?.({ ...preferences, language: e.target.value as any })
                }
                className="w-full px-3 py-2 text-sm border border-black/10 rounded bg-white/50 focus:outline-none focus:border-gold-primary"
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="p-4 border border-black/10 rounded-lg bg-white/40">
              <label className="text-xs font-semibold text-black/70 uppercase tracking-widest block mb-2">
                Strefa czasowa
              </label>
              <input
                type="text"
                defaultValue={preferences.timezone}
                disabled
                className="w-full px-3 py-2 text-sm border border-black/10 rounded bg-white/50 text-black/60"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="mt-4 space-y-3 p-4 border border-black/10 rounded-lg bg-white/40">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-black">Autosave drafty</span>
              <input
                type="checkbox"
                checked={preferences.auto_save_drafts}
                onChange={(e) =>
                  onUpdatePreferences?.({
                    ...preferences,
                    auto_save_drafts: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-gold-primary cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-black">Pokaż porady</span>
              <input
                type="checkbox"
                checked={preferences.show_tips}
                onChange={(e) =>
                  onUpdatePreferences?.({
                    ...preferences,
                    show_tips: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-gold-primary cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-black">Analityka</span>
              <input
                type="checkbox"
                checked={preferences.analytics_enabled}
                onChange={(e) =>
                  onUpdatePreferences?.({
                    ...preferences,
                    analytics_enabled: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-gold-primary cursor-pointer"
              />
            </label>
          </div>
        </motion.div>
      )}

      {/* POWIADOMIENIA */}
      {notifications && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h4 className="text-sm font-bold uppercase tracking-widest text-black/70 mb-4">
            Powiadomienia
          </h4>
          <div className="space-y-3 p-4 border border-black/10 rounded-lg bg-white/40">
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-black">Email: Aktualizacje</span>
              <input
                type="checkbox"
                checked={notifications.email_updates}
                onChange={(e) =>
                  onUpdateNotifications?.({
                    ...notifications,
                    email_updates: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-black">Email: Bezpieczeństwo</span>
              <input
                type="checkbox"
                checked={notifications.email_security}
                onChange={(e) =>
                  onUpdateNotifications?.({
                    ...notifications,
                    email_security: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-black">Email: Billing</span>
              <input
                type="checkbox"
                checked={notifications.email_billing}
                onChange={(e) =>
                  onUpdateNotifications?.({
                    ...notifications,
                    email_billing: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-black">Email: Marketing</span>
              <input
                type="checkbox"
                checked={notifications.email_marketing}
                onChange={(e) =>
                  onUpdateNotifications?.({
                    ...notifications,
                    email_marketing: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-black">In-app powiadomienia</span>
              <input
                type="checkbox"
                checked={notifications.in_app_notifications}
                onChange={(e) =>
                  onUpdateNotifications?.({
                    ...notifications,
                    in_app_notifications: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded cursor-pointer"
              />
            </label>

            <div className="pt-3 border-t border-black/10">
              <label className="text-xs font-semibold text-black/70 uppercase tracking-widest block mb-2">
                Częstotliwość
              </label>
              <select
                defaultValue={notifications.notification_frequency}
                onChange={(e) =>
                  onUpdateNotifications?.({
                    ...notifications,
                    notification_frequency: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-black/10 rounded bg-white/50 focus:outline-none focus:border-gold-primary"
              >
                <option value="immediate">Natychmiast</option>
                <option value="daily">Codziennie</option>
                <option value="weekly">Tygodniowo</option>
                <option value="monthly">Miesięcznie</option>
                <option value="never">Nigdy</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
