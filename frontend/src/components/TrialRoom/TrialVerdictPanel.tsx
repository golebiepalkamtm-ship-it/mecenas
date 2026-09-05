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
    <section className="rounded-2xl border-2 border-gold-primary/30 bg-black/40 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Gavel size={18} className="text-gold-primary" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-gold-primary drop-shadow-md">
            Werdykt sędziego
          </h2>
        </div>
        {hasText && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-gold-primary hover:text-gold-bright hover:bg-white/5 transition-colors border border-gold-primary/20 bg-black/40 backdrop-blur-sm"
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
          className="mb-4 px-5 py-2.5 rounded-xl bg-gold-primary text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center gap-2 btn-convex-glossy"
        >
          {running && <Loader2 size={14} className="animate-spin" />}
          Wydaj werdykt
        </button>
      )}
      {hasText && (
        <div className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap drop-shadow-md">{text}</div>
      )}
    </section>
  );
}
