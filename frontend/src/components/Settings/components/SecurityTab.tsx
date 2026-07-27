/**
 * Zakładka: Bezpieczeństwo
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Shield,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  Trash2,
  Smartphone,
} from 'lucide-react';
import type {
  SecuritySession,
  TwoFactorMethod,
  SecuritySettings,
} from '../../../types/profile';

interface SecurityTabProps {
  sessions: SecuritySession[];
  twoFactorMethods: TwoFactorMethod[];
  settings: SecuritySettings | null;
  onChangePassword?: () => void;
  onEnableTwoFactor?: () => void;
  onRevokeSession?: (sessionId: string) => Promise<void>;
  onRevokeAllSessions?: () => Promise<void>;
  onUpdateSettings?: (settings: Partial<SecuritySettings>) => Promise<void>;
}

export function SecurityTab({
  sessions,
  twoFactorMethods,
  settings,
  onChangePassword,
  onEnableTwoFactor,
  onRevokeSession,
  onRevokeAllSessions,
  onUpdateSettings: _onUpdateSettings,
}: SecurityTabProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await onRevokeSession?.(sessionId);
    } finally {
      setRevoking(null);
    }
  };

  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);
  const twoFactorEnabled = twoFactorMethods.some((m) => m.enabled);

  return (
    <div className="space-y-6">
      {/* SECURITY SCORE */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border border-blue-primary/20 rounded-xl bg-linear-to-br from-blue-primary/5 to-transparent"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black flex items-center gap-2">
              <Shield size={20} className="text-blue-primary" />
              Poziom bezpieczeństwa
            </h3>
            <p className="text-sm text-black/60 mt-2">
              {settings?.security_level === 'strict'
                ? '🔒 Tryb rygorystyczny'
                : '🔓 Tryb standardowy'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-primary">
              {twoFactorEnabled ? '★★★' : '★★'}
            </p>
            <p className="text-xs text-black/60 mt-1">
              {twoFactorEnabled ? 'Wysokie' : 'Średnie'}
            </p>
          </div>
        </div>

        {/* Security Tips */}
        <div className="mt-4 space-y-2 p-3 bg-white/40 rounded-lg">
          <div className="flex items-start gap-2 text-xs">
            <Check size={14} className="text-green-600 mt-0.5 shrink-0" />
            <span className="text-black/70">Silne hasło ustawione</span>
          </div>
          {twoFactorEnabled ? (
            <div className="flex items-start gap-2 text-xs">
              <Check size={14} className="text-green-600 mt-0.5 shrink-0" />
              <span className="text-black/70">2FA włączone</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <span className="text-black/70">Włącz 2FA dla dodatkowego bezpieczeństwa</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* PASSWORD CHANGE */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border border-black/10 rounded-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-black flex items-center gap-2">
            <Lock size={18} />
            Hasło
          </h4>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-xs font-semibold text-gold-primary hover:text-gold-bright transition-colors"
          >
            {showPasswordForm ? 'Anuluj' : 'Zmień hasło'}
          </button>
        </div>

        {showPasswordForm && (
          <div className="space-y-3 p-4 bg-white/40 rounded-lg">
            <div>
              <label className="text-xs font-semibold text-black/70 uppercase tracking-widest">
                Bieżące hasło
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-black/70 uppercase tracking-widest">
                Nowe hasło
              </label>
              <div className="relative">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black/40 hover:text-black/60"
                >
                  {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-black/70 uppercase tracking-widest">
                Potwierdź hasło
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={onChangePassword}
              className="w-full py-2 bg-gold-primary text-black font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm"
            >
              Zmień hasło
            </button>
          </div>
        )}
      </motion.div>

      {/* TWO-FACTOR AUTHENTICATION */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border border-black/10 rounded-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-black flex items-center gap-2">
            <Smartphone size={18} />
            Weryfikacja dwuskładnikowa (2FA)
          </h4>
          {twoFactorEnabled ? (
            <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">
              Włączone
            </span>
          ) : (
            <button
              onClick={onEnableTwoFactor}
              className="text-xs font-semibold text-gold-primary hover:text-gold-bright transition-colors flex items-center gap-1"
            >
              <Plus size={14} />
              Włącz
            </button>
          )}
        </div>

        {twoFactorMethods.length > 0 && (
          <div className="space-y-2">
            {twoFactorMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-3 bg-white/40 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Smartphone size={14} className="text-black/60" />
                  <span className="text-sm font-semibold text-black capitalize">
                    {method.type}
                  </span>
                  {method.verified && (
                    <span className="text-xs text-green-600 font-semibold">Zweryfikowana</span>
                  )}
                </div>
                {twoFactorMethods.length > 1 && (
                  <button className="text-red-600 hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ACTIVE SESSIONS */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border border-black/10 rounded-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-black">Aktywne sesje ({sessions.length})</h4>
          {otherSessions.length > 1 && (
            <button
              onClick={onRevokeAllSessions}
              className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Wyloguj wszystkie inne
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Current session */}
          {currentSession && (
            <div className="p-4 border-2 border-gold-primary bg-gold-primary/5 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-black">{currentSession.device_name}</p>
                  <p className="text-xs text-black/60">
                    {currentSession.ip_address}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs font-bold bg-gold-primary/20 text-gold-primary rounded-full">
                  Bieżąca
                </span>
              </div>
              <p className="text-xs text-black/50">
                Ostatnia aktywność:{' '}
                {new Date(currentSession.last_active).toLocaleString('pl-PL')}
              </p>
            </div>
          )}

          {/* Other sessions */}
          {otherSessions.map((session) => (
            <div
              key={session.id}
              className="p-4 border border-black/10 rounded-lg flex items-start justify-between hover:bg-black/2 transition-colors"
            >
              <div>
                <p className="font-semibold text-black text-sm">{session.device_name}</p>
                <p className="text-xs text-black/60">{session.ip_address}</p>
                <p className="text-xs text-black/50 mt-1">
                  {new Date(session.last_active).toLocaleString('pl-PL')}
                </p>
              </div>
              <button
                onClick={() => handleRevokeSession(session.id)}
                disabled={revoking === session.id}
                className="px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                {revoking === session.id ? 'Wylogowywanie...' : <LogOut size={14} />}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
