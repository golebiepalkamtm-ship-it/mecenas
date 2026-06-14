import { Gavel, Download, Loader2 } from 'lucide-react';

interface TrialVerdictPanelProps {
  verdict: string;
  draft: string;
  running: boolean;
  canRequest: boolean;
  onRequest: () => void;
  onExport: () => void;
}

export function TrialVerdictPanel({
  verdict,
  draft,
  running,
  canRequest,
  onRequest,
  onExport,
}: TrialVerdictPanelProps) {
  const text = running ? draft : verdict;
  const hasText = text.trim().length > 0;

  return (
    <section className="rounded-2xl border-2 border-gold-primary/35 bg-gradient-to-br from-amber-100/40 via-white to-amber-50/60 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Gavel size={18} className="text-gold-primary" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-black">
            Werdykt sędziego
          </h2>
        </div>
        {hasText && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold-primary/30 text-[8px] font-black uppercase tracking-widest text-black/70 hover:bg-white/80"
          >
            <Download size={12} />
            Pobierz protokół
          </button>
        )}
      </div>
      {!hasText && (
        <button
          type="button"
          disabled={running || !canRequest}
          onClick={onRequest}
          className="mb-4 px-5 py-2.5 rounded-xl bg-gold-primary text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center gap-2"
        >
          {running && <Loader2 size={14} className="animate-spin" />}
          Wydaj werdykt
        </button>
      )}
      {hasText && (
        <div className="text-sm leading-relaxed text-black/90 whitespace-pre-wrap">{text}</div>
      )}
    </section>
  );
}
