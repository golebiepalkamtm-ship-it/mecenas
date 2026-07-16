import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock, Shield } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';
import type { SettingsViewProps } from '../types';
import { SettingsInput } from './SettingsInput';
import { ProfileAvatar } from './ProfileAvatar';
import { cn } from '../../../utils/cn';

const ROW = 'library-view-cell px-3 py-2.5';

function accountTypeLabel(role?: string, tier?: string) {
  const r = role === 'admin' ? 'Administrator' : 'Użytkownik';
  const t = tier || 'Free';
  return `${r} · plan ${t}`;
}

export function ProfileAccountForm({
  user,
  profile,
  onUpdateProfile,
  isSaving,
  successMsg,
}: Pick<SettingsViewProps, 'user' | 'profile' | 'onUpdateProfile' | 'isSaving' | 'successMsg'>) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile?.full_name, profile?.phone]);

  const email = user?.email || '';
  const accountType = useMemo(
    () => accountTypeLabel(profile?.role, profile?.subscription_tier),
    [profile?.role, profile?.subscription_tier],
  );

  const saveProfile = async () => {
    const updates: { full_name?: string; phone?: string } = {};
    const name = fullName.trim();
    const tel = phone.trim();
    if (name && name !== profile?.full_name) updates.full_name = name;
    if (tel !== (profile?.phone || '')) updates.phone = tel;
    if (Object.keys(updates).length === 0) return;
    await onUpdateProfile(updates);
  };

  const sendResetEmail = async () => {
    if (!email) return;
    setPassLoading(true);
    setPassMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setPassLoading(false);
    setPassMsg(error ? 'Błąd wysyłki linku' : 'Link wysłany na e-mail');
    setTimeout(() => setPassMsg(''), 4000);
  };

  const changePassword = async () => {
    setPassMsg('');
    if (newPassword.length < 8) {
      setPassMsg('Hasło: min. 8 znaków');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg('Hasła muszą być identyczne');
      return;
    }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);
    if (error) {
      setPassMsg('Nie udało się zmienić hasła');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPassMsg('Hasło zmienione');
    setTimeout(() => setPassMsg(''), 4000);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="flex items-center gap-3 shrink-0 md:hidden">
        <ProfileAvatar avatarUrl={profile?.avatar_url} fullName={fullName} email={email} size="md" />
        <div className="min-w-0">
          <p className="text-lg font-semibold text-black italic font-profile-display truncate leading-tight">
            {fullName || 'Użytkownik'}
          </p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-black/40 mt-0.5 font-outfit">{accountType}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <p className="library-view-label">Dane konta</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <SettingsInput
            label="Imię i nazwisko"
            value={fullName}
            placeholder="Jan Kowalski"
            onChange={setFullName}
          />
          <SettingsInput
            label="Nr telefonu"
            value={phone}
            placeholder="+48 600 000 000"
            type="tel"
            onChange={setPhone}
          />
        </div>

        <SettingsInput label="E-mail" defaultValue={email} disabled />

        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase tracking-[0.28em] text-black/40 font-outfit px-0.5">
            Rodzaj konta
          </label>
          <div className={cn(ROW, 'flex items-center gap-2 text-black')}>
            <Shield size={14} className="text-gold-primary shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-widest font-outfit">{accountType}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-black/8 space-y-2.5">
          <p className="library-view-label flex items-center gap-2">
            <Lock size={11} className="text-gold-primary" />
            Zmiana hasła
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <SettingsInput
              label="Nowe hasło"
              value={newPassword}
              type="password"
              placeholder="••••••••"
              onChange={setNewPassword}
            />
            <SettingsInput
              label="Powtórz hasło"
              value={confirmPassword}
              type="password"
              placeholder="••••••••"
              onChange={setConfirmPassword}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 relative">
            <div 
              onMouseEnter={() => setHoveredBtn('change_pwd')}
              onMouseLeave={() => setHoveredBtn(null)}
              className="relative"
            >
              <button
                type="button"
                disabled={passLoading || !newPassword}
                onClick={() => void changePassword()}
                className="px-3 py-1.5 rounded-lg bg-black text-white text-[8px] font-black uppercase tracking-widest hover:bg-black/85 disabled:opacity-40 btn-convex-glossy"
              >
                Zmień hasło
              </button>
              <AnimatePresence>
                {hoveredBtn === 'change_pwd' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute top-full left-0 mt-2 w-48 p-2 bg-white border border-black/10 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.1)] text-left z-9999 pointer-events-none"
                  >
                    <p className="text-[8px] font-black uppercase tracking-widest text-black mb-1">
                      Wymuszenie Zmiany
                    </p>
                    <p className="text-[7px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1">
                      Zapisze nowe hasło pod warunkiem, że podano w obu polach to samo poprawne hasło.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div 
              onMouseEnter={() => setHoveredBtn('reset_email')}
              onMouseLeave={() => setHoveredBtn(null)}
              className="relative"
            >
              <button
                type="button"
                disabled={passLoading || !email}
                onClick={() => void sendResetEmail()}
                className="px-3 py-1.5 rounded-lg border border-black/15 bg-white/50 text-[8px] font-black uppercase tracking-widest text-black hover:border-gold-primary/40 disabled:opacity-40 btn-convex-glossy"
              >
                Link na e-mail
              </button>
              <AnimatePresence>
                {hoveredBtn === 'reset_email' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute top-full left-0 mt-2 w-48 p-2 bg-white border border-black/10 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.1)] text-left z-9999 pointer-events-none"
                  >
                    <p className="text-[8px] font-black uppercase tracking-widest text-black mb-1">
                      Link Autoryzacyjny
                    </p>
                    <p className="text-[7px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1">
                      Wyśle na Twój e-mail bezpieczny, jednorazowy link do resetowania hasła, ważny 24h.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {passMsg && (
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">{passMsg}</span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-between gap-2 pt-3 border-t border-black/8">
        {successMsg ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[8px] font-black uppercase text-emerald-600 flex items-center gap-1"
          >
            <CheckCircle2 size={10} />
            {successMsg}
          </motion.span>
        ) : (
          <span className="text-[7px] text-black/30 uppercase tracking-widest">Zapis w chmurze</span>
        )}
        <div 
          onMouseEnter={() => setHoveredBtn('save_profile')}
          onMouseLeave={() => setHoveredBtn(null)}
          className="relative"
        >
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void saveProfile()}
            className="px-4 py-1.5 rounded-lg bg-gold-primary text-black text-[8px] font-black uppercase tracking-widest shadow-[0_4px_14px_rgba(212,175,55,0.35)] hover:brightness-105 disabled:opacity-50 btn-convex-glossy"
          >
            {isSaving ? '…' : 'Zapisz profil'}
          </button>
          <AnimatePresence>
            {hoveredBtn === 'save_profile' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-white border border-black/10 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.1)] text-left z-9999 pointer-events-none"
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                  Synchronizacja Zmian
                </p>
                <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1">
                  Zapisuje imię i telefon na zaszyfrowanym serwerze bazy danych, synchronizując aplikację.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
