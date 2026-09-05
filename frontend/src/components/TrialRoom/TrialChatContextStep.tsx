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
  onExtractPoints?: () => void;
  isExtracting?: boolean;
}

export function TrialChatContextStep({
  chatContext,
  question,
  elaborationMode,
  onElaborationChange,
  onQuestionChange,
  onContinue,
  fromChat,
  onExtractPoints,
  isExtracting,
}: TrialChatContextStepProps) {
  const hasContext = chatContext.trim().length > 0;

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      <div className="p-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-primary/80 drop-shadow-md mb-3">
          {fromChat ? 'Kontekst z czatu' : 'Materiał sprawy'}
        </p>
        {hasContext ? (
          <div className="max-h-[220px] panel-scrollbar-gold p-4 text-[12px] leading-relaxed text-white whitespace-pre-wrap bg-black/40 backdrop-blur-sm rounded-xl border border-white/5">
            {chatContext}
          </div>
        ) : (
          <p className="text-[12px] text-white/50 italic drop-shadow-md">
            Brak kontekstu z czatu. Wróć do zakładki Czat, poprowadź rozmowę i użyj „Przenieś na salę
            rozprawy”, albo wklej opis sprawy poniżej.
          </p>
        )}
      </div>

      <div className="p-2">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 drop-shadow-md block">
            Skrót sprawy (dla sędziego i stron)
          </label>
          {onExtractPoints && hasContext && (
            <button
              onClick={onExtractPoints}
              disabled={isExtracting}
              className="text-[9px] font-black uppercase tracking-widest text-gold-primary hover:text-gold-bright disabled:opacity-50 transition-colors drop-shadow-md"
            >
              {isExtracting ? 'Trwa ekstrakcja...' : 'Wyciągnij kluczowe punkty ze sprawy'}
            </button>
          )}
        </div>
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          rows={3}
          className="w-full bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 panel-scrollbar-gold px-4 py-3 text-[13px] text-white resize-none focus:outline-none focus:ring-1 focus:ring-gold-primary/50 placeholder:text-white/30"
        />
      </div>

      <div className="p-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 mb-3 px-2 drop-shadow-md">
          Jak strony mają opracować pozycje z tego kontekstu?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(ELABORATION_PRESETS) as TrialElaborationMode[]).map((mode) => {
            const p = ELABORATION_PRESETS[mode];
            const active = elaborationMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onElaborationChange(mode)}
                className={cn(
                  'text-left rounded-xl p-4 transition-all duration-300 border',
                  active
                    ? 'border-gold-primary/50 bg-black/60 backdrop-blur-md shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                    : 'border-white/10 bg-black/30 backdrop-blur-sm hover:bg-black/50',
                )}
              >
                <p
                  className={cn(
                    'text-[11px] font-black uppercase tracking-widest',
                    active ? 'text-gold-bright' : 'text-white/80'
                  )}
                >
                  {p.label}
                </p>
                <p className="text-[10px] text-white/50 mt-2 leading-snug">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex justify-center">
        <button
          type="button"
          disabled={!hasContext && question.trim().length < 10}
          onClick={onContinue}
          className="px-8 py-3 rounded-xl bg-black/80 text-gold-primary border border-gold-primary/30 hover:border-gold-primary/80 hover:bg-black text-[10px] font-black uppercase tracking-[0.25em] disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          Rozpocznij konfigurację zespołów
        </button>
      </div>
    </section>
  );
}
