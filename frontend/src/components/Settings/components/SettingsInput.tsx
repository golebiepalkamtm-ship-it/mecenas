import { Lock } from 'lucide-react';

interface SettingsInputProps {
  label: string;
  defaultValue: string;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  onBlur?: (val: string) => void;
}

export function SettingsInput({ 
  label, 
  defaultValue, 
  placeholder = "", 
  disabled = false, 
  type = "text",
  onBlur 
}: SettingsInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 px-1">{label}</label>
      <div className="relative group">
        <input 
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          onBlur={(e) => onBlur?.(e.target.value)}
          className="w-full glass-prestige-input focus:border-gold-primary/40 focus:bg-white/10 px-3 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all outline-hidden disabled:opacity-40"
        />
        {disabled && <Lock size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" />}
      </div>
    </div>
  );
}
