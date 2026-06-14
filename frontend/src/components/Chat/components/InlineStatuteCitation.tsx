import React, { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import type { SourceReference } from "../types";
import { cn } from "../../../utils/cn";

interface InlineStatuteCitationProps {
  source?: SourceReference;
  refNum: string;
}

export const InlineStatuteCitation = React.memo(
  ({ source, refNum }: InlineStatuteCitationProps) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
          close();
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, [open, close]);

    return (
      <span ref={rootRef} className="relative inline-flex align-middle ml-0.5 mr-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-md border transition-all",
            open
              ? "bg-gold-primary text-white border-gold-primary shadow-sm"
              : "bg-gold-primary/10 text-gold-primary border-gold-primary/30 hover:bg-gold-primary/20",
          )}
          title={
            source?.full_text
              ? "Rozwiń pełne brzmienie przepisu"
              : "Brak pełnego tekstu w RAG — sprawdź ISAP"
          }
          aria-expanded={open}
          aria-controls={`cite-popover-${refNum}`}
        >
          <BookOpen size={11} strokeWidth={2.5} />
        </button>

        {open && (
          <div
            id={`cite-popover-${refNum}`}
            role="dialog"
            className="absolute left-0 top-full z-50 mt-1.5 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-white shadow-lg shadow-stone-900/10 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-stone-100 bg-stone-50">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-gold-primary">
                  {source?.ref_id ?? `[${refNum}]`}
                </p>
                <p className="text-[12px] font-bold text-stone-800 truncate">
                  {source?.label ?? "Przepis"}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                aria-label="Zamknij"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-3 py-2.5 max-h-64 overflow-y-auto custom-scrollbar">
              {source?.full_text ? (
                <pre className="text-[11.5px] leading-relaxed text-stone-800 whitespace-pre-wrap font-outfit m-0">
                  {source.full_text}
                </pre>
              ) : (
                <p className="text-[12px] leading-relaxed text-stone-600 m-0">
                  {source?.snippet ??
                    "Pełne brzmienie nie zostało wyodrębnione z bazy RAG. Otwórz ISAP lub przypis na dole wiadomości."}
                </p>
              )}
            </div>

            {source?.url && (
              <div className="px-3 py-2 border-t border-stone-100 bg-stone-50/80 flex justify-end">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-500 uppercase tracking-wide"
                >
                  ISAP / ELI <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        )}
      </span>
    );
  },
);

InlineStatuteCitation.displayName = "InlineStatuteCitation";
