import { Gavel, Shield, Scale } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { TrialSide } from './types';

const STYLES = {
  defense: {
    icon: Shield,
    accent: 'border-emerald-500/40 bg-emerald-50/80',
    text: 'text-emerald-900',
    label: 'Obrona',
  },
  prosecution: {
    icon: Scale,
    accent: 'border-rose-500/40 bg-rose-50/80',
    text: 'text-rose-900',
    label: 'Oskarżenie',
  },
} as const;

function BriefCard({
  side,
  text,
  empty,
}: {
  side: TrialSide;
  text: string;
  empty: string;
}) {
  const s = STYLES[side];
  const Icon = s.icon;
  return (
    <div className={cn('rounded-2xl border p-4 min-h-[140px] flex flex-col', s.accent)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={s.text} />
        <span className={cn('text-[9px] font-black uppercase tracking-[0.25em]', s.text)}>
          {s.label}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-black/80 whitespace-pre-wrap flex-1 font-medium">
        {text.trim() || empty}
      </p>
    </div>
  );
}

interface TrialBriefCardsProps {
  defenseText: string;
  prosecutionText: string;
}

export function TrialBriefCards({ defenseText, prosecutionText }: TrialBriefCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
      <BriefCard
        side="defense"
        text={defenseText}
        empty="Pozycja obrony pojawi się po wygenerowaniu."
      />
      <div className="hidden lg:flex flex-col items-center justify-center px-2 py-8">
        <div className="w-px flex-1 bg-gradient-to-b from-transparent via-gold-primary/40 to-transparent" />
        <Gavel className="my-4 text-gold-primary shrink-0" size={28} />
        <p className="text-[8px] font-black uppercase tracking-[0.35em] text-black/40 text-center max-w-[80px]">
          Trybunał
        </p>
        <div className="w-px flex-1 bg-gradient-to-b from-transparent via-gold-primary/40 to-transparent" />
      </div>
      <BriefCard
        side="prosecution"
        text={prosecutionText}
        empty="Pozycja oskarżenia pojawi się po wygenerowaniu."
      />
    </div>
  );
}
