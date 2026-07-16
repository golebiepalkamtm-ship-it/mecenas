import { cn } from '../../utils/cn';
import {
  ELABORATION_PRESETS,
  type TrialElaborationMode,
} from '../../utils/chatContextForTrial';

interface TrialChatContextStepProps {
  chatContext: string;
  question: string;
  elaborationMode: TrialElaborationMode;
  onElaborationChange: (mode: TrialElaborationMode) => void;
  onQuestionChange: (q: string) => void;
  onContinue: () => void;
  fromChat: boolean;
}

export function TrialChatContextStep({
  chatContext,
  question,
  elaborationMode,
  onElaborationChange,
  onQuestionChange,
  onContinue,
  fromChat,
}: TrialChatContextStepProps) {
  const hasContext = chatContext.trim().length > 0;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gold-primary/25 bg-gradient-to-b from-amber-50/60 to-white p-5">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-black/50 mb-2">
          {fromChat ? 'Kontekst z czatu' : 'Materiał sprawy'}
        </p>
        {hasContext ? (
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar rounded-xl border border-black/8 bg-white/80 p-3 text-[11px] leading-relaxed text-black/85 whitespace-pre-wrap">
            {chatContext}
          </div>
        ) : (
          <p className="text-[11px] text-black/45 italic">
            Brak kontekstu z czatu. Wróć do zakładki Czat, poprowadź rozmowę i użyj „Przenieś na salę
            rozprawy”, albo wklej opis sprawy poniżej.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-black/10 bg-white/90 p-4">
        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-black/50 block mb-2">
          Skrót sprawy (dla sędziego i stron)
        </label>
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-black resize-none focus:outline-none focus:border-gold-primary/50"
        />
      </div>

      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-black/50 mb-2">
          Jak strony mają opracować pozycje z tego kontekstu?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.keys(ELABORATION_PRESETS) as TrialElaborationMode[]).map((mode) => {
            const p = ELABORATION_PRESETS[mode];
            const active = elaborationMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onElaborationChange(mode)}
                className={cn(
                  'text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'border-gold-primary bg-gold-primary/15 shadow-sm'
                    : 'border-black/10 bg-white hover:border-black/20',
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-black">
                  {p.label}
                </p>
                <p className="text-[9px] text-black/50 mt-1 leading-snug">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!hasContext && question.trim().length < 10}
        onClick={onContinue}
        className="px-5 py-2.5 rounded-xl bg-black text-gold-primary text-[10px] font-black uppercase tracking-widest disabled:opacity-40 btn-convex-glossy"
      >
        Konfiguruj zespoły — obrona
      </button>
    </section>
  );
}
