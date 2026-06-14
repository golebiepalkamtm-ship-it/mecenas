import { Lock } from 'lucide-react';

interface SettingsInputProps {
  label: string;
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  onBlur?: (val: string) => void;
  onChange?: (val: string) => void;
}

export function SettingsInput({
  label,
  defaultValue = '',
  value,
  placeholder = '',
  disabled = false,
  type = 'text',
  onBlur,
  onChange,
}: SettingsInputProps) {
  const controlled = value !== undefined;

  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black uppercase tracking-[0.28em] text-black/40 font-outfit px-0.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={controlled ? value : undefined}
          defaultValue={controlled ? undefined : defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          className="w-full h-9 px-3 rounded-xl glass-prestige bg-white/50 border border-white/70 text-[11px] font-semibold text-black font-outfit outline-none focus:border-gold-primary/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] disabled:opacity-45 placeholder:text-black/25"
        />
        {disabled && (
          <Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/25" />
        )}
      </div>
    </div>
  );
}
