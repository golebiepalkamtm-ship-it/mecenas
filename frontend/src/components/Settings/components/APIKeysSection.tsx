import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { SettingsInput } from './SettingsInput';
import type { Profile } from '../types';
import { API_BASE } from '../../../config';

interface APIKeysSectionProps {
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export function APIKeysSection({ profile, onUpdateProfile }: APIKeysSectionProps) {
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const handleKeyUpdate = (provider: string, val: string) => {
    onUpdateProfile({
      api_keys: { ...(profile?.api_keys || {}), [provider]: val },
    });
  };

  const testAndFetchModels = async (provider: string) => {
    const key = profile?.api_keys?.[provider as keyof typeof profile.api_keys];
    if (!key) return;
    setIsTesting(provider);
    try {
      const response = await fetch(`${API_BASE}/models/fetch-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key, provider }),
      });
      if (response.ok) {
        const models = await response.json();
        localStorage.setItem(`custom_models_${provider}`, JSON.stringify(models));
        setStatus((prev) => ({ ...prev, [provider]: 'success' }));
        window.dispatchEvent(new CustomEvent('prawnik_models_updated'));
      } else {
        setStatus((prev) => ({ ...prev, [provider]: 'error' }));
      }
    } catch {
      setStatus((prev) => ({ ...prev, [provider]: 'error' }));
    } finally {
      setIsTesting(null);
      setTimeout(() => setStatus((prev) => ({ ...prev, [provider]: null })), 3000);
    }
  };

  const providers = [
    { id: 'openrouter', label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...' },
    { id: 'google', label: 'Google AI (Gemini)', placeholder: 'AIza...' },
    { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="library-view-label flex items-center gap-2 text-black/70">
        <Key size={12} className="text-gold-primary" />
        Klucze API (Własne)
      </h3>
      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="relative group">
            <SettingsInput
              label={p.label}
              defaultValue={(profile?.api_keys as Record<string, string> | undefined)?.[p.id] || ''}
              placeholder={p.placeholder}
              type="password"
              onBlur={(val) => handleKeyUpdate(p.id, val)}
            />
            <button
              type="button"
              onClick={() => void testAndFetchModels(p.id)}
              onMouseEnter={() => setHoveredKey(p.id)}
              onMouseLeave={() => setHoveredKey(null)}
              disabled={isTesting === p.id || !(profile?.api_keys as Record<string, string> | undefined)?.[p.id]}
              className="absolute right-2 bottom-1.5 p-1.5 rounded-lg border border-black/8 bg-white/60 hover:bg-gold-primary hover:text-black transition-all disabled:opacity-30 flex items-center justify-center"
            >
              {isTesting === p.id ? (
                <RefreshCw size={10} className="animate-spin" />
              ) : status[p.id] === 'success' ? (
                <CheckCircle2 size={10} className="text-emerald-400" />
              ) : status[p.id] === 'error' ? (
                <AlertCircle size={10} className="text-red-400" />
              ) : (
                <RefreshCw size={10} />
              )}
              
              <AnimatePresence>
                {hoveredKey === p.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                      Połączenie API
                    </p>
                    <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1">
                      Testuje podany klucz i pobiera listę dostępnych modeli od tego dostawcy.
                    </p>
                    <div className="absolute top-full right-2 -mt-px w-2 h-2 bg-white border-r border-b border-black/10 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[7px] text-black/35 font-bold uppercase tracking-widest leading-relaxed font-outfit">
        Własne klucze w profilu — bez limitów kredytowych LexMind.
      </p>
    </div>
  );
}
