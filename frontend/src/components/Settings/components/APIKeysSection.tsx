import { useState } from 'react';
import { Key, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { SettingsInput } from './SettingsInput';
import type { Profile } from '../types';
import { API_BASE } from '../../../config';

interface APIKeysSectionProps {
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export function APIKeysSection({ profile, onUpdateProfile }: APIKeysSectionProps) {
  const [isTesting, setIsTesting] = useState<string | null>(null); // provider being tested
  const [status, setStatus] = useState<Record<string, 'success' | 'error' | null>>({});

  const handleKeyUpdate = (provider: string, val: string) => {
    const currentKeys = profile?.api_keys || {};
    onUpdateProfile({
      api_keys: {
        ...currentKeys,
        [provider]: val
      }
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
        body: JSON.stringify({ api_key: key, provider })
      });

      if (response.ok) {
        const models = await response.json();
        // Store models in local storage to be used by the orchestrator
        localStorage.setItem(`custom_models_${provider}`, JSON.stringify(models));
        setStatus(prev => ({ ...prev, [provider]: 'success' }));
        
        // Notify the rest of the app that models might have changed
        window.dispatchEvent(new CustomEvent('prawnik_models_updated'));
      } else {
        setStatus(prev => ({ ...prev, [provider]: 'error' }));
      }
    } catch (err) {
      setStatus(prev => ({ ...prev, [provider]: 'error' }));
    } finally {
      setIsTesting(null);
      setTimeout(() => setStatus(prev => ({ ...prev, [provider]: null })), 3000);
    }
  };

  const providers = [
    { id: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-v1-...' },
    { id: 'google', label: 'Google AI (Gemini)', placeholder: 'AIza...' },
    { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black text-white italic tracking-tight uppercase text-gold-gradient flex items-center gap-2">
        <Key size={12} className="text-gold-primary" />
        Klucze API (Własne)
      </h3>
      
      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="relative group">
            <SettingsInput 
              label={`${p.label} API Key`}
              defaultValue={(profile?.api_keys as any)?.[p.id] || ''}
              placeholder={p.placeholder}
              type="password"
              onBlur={(val) => handleKeyUpdate(p.id, val)}
            />
            <button
              onClick={() => testAndFetchModels(p.id)}
              disabled={isTesting === p.id || !(profile?.api_keys as any)?.[p.id]}
              className="absolute right-2 bottom-1.5 p-1.5 rounded-lg bg-white/5 hover:bg-gold-primary hover:text-white transition-all disabled:opacity-30 flex items-center justify-center"
              title="Testuj i pobierz modele"
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
            </button>
          </div>
        ))}
      </div>
      
      <p className="text-[7px] text-white/20 font-bold uppercase tracking-widest leading-relaxed">
        Wprowadź własne klucze, aby korzystać z dodatkowych modeli bez limitów kredytowych LexMind. Klucze są przechowywane bezpiecznie w Twoim profilu.
      </p>
    </div>
  );
}
