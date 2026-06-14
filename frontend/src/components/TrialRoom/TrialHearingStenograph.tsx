import { cn } from '../../utils/cn';
import type { HearingRound } from '../../store/useTrialRoomStore';
import { SIDE_META } from './trialLabels';

interface TrialHearingStenographProps {
  rounds: HearingRound[];
  running: boolean;
  roundsCount: number;
  onRoundsCountChange: (n: number) => void;
  onStart: () => void;
  canStart: boolean;
  /** Tury z presetu elaboration — bez ręcznej zmiany */
  roundsLocked?: boolean;
}

export function TrialHearingStenograph({
  rounds,
  running,
  roundsCount,
  onRoundsCountChange,
  onStart,
  canStart,
  roundsLocked = false,
}: TrialHearingStenographProps) {
  return (
    <section className="rounded-2xl border border-black/10 bg-neutral-50/90 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-black/60">
          Protokół sali
        </h2>
        <label className="flex items-center gap-2 text-[9px] font-bold uppercase text-black/50">
          Tury
          {roundsLocked ? (
            <span className="text-[9px] font-black text-black/60">{roundsCount} tur</span>
          ) : (
            <select
              value={roundsCount}
              onChange={(e) => onRoundsCountChange(Number(e.target.value))}
              disabled={running}
              className="rounded-lg border border-black/10 px-2 py-1 bg-white text-black"
              aria-label="Liczba tur symulacji"
            >
              {[2, 4, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </label>
        <button
          type="button"
          disabled={running || !canStart}
          onClick={onStart}
          className="px-4 py-2 rounded-xl bg-black text-gold-primary text-[9px] font-black uppercase tracking-widest disabled:opacity-40"
        >
          {running ? 'Trwa symulacja…' : 'Uruchom symulację sali'}
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-3">
        {rounds.length === 0 && !running && (
          <p className="text-[10px] text-black/40 italic text-center py-6">
            Po uruchomieniu tury oskarżenia i obrony pojawią się naprzemiennie.
          </p>
        )}
        {rounds.map((r) => {
          const isDef = r.side === 'defense';
          return (
            <div
              key={`${r.round}-${r.side}`}
              className={cn('flex', isDef ? 'justify-start' : 'justify-end')}
            >
              <div
                className={cn(
                  'max-w-[92%] rounded-2xl px-4 py-3 border text-[11px] leading-relaxed whitespace-pre-wrap',
                  isDef
                    ? 'bg-emerald-50/90 border-emerald-500/25 text-emerald-950'
                    : 'bg-rose-50/90 border-rose-500/25 text-rose-950',
                )}
              >
                <p className="text-[8px] font-black uppercase tracking-widest mb-1.5 opacity-60">
                  Tura {r.round} · {SIDE_META[r.side].title}
                </p>
                {r.text}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
