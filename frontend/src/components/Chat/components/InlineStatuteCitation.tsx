import React, { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink, X, Copy, Check, ChevronDown } from "lucide-react";
import type { SourceReference } from "../types";
import { cn } from "../../../utils/cn";

interface InlineStatuteCitationProps {
  source?: SourceReference;
  refNum: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const InlineStatuteCitation = React.memo(
  ({ source, refNum, isOpen, onToggle }: InlineStatuteCitationProps) => {
    const [localOpen, setLocalOpen] = useState(false);
    const open = isOpen !== undefined ? isOpen : localOpen;

    const toggleOpen = useCallback(() => {
      if (onToggle) {
        onToggle();
      } else {
        setLocalOpen((v) => !v);
      }
    }, [onToggle]);

    const close = useCallback(() => {
      if (onToggle && isOpen) {
        onToggle();
      } else {
        setLocalOpen(false);
      }
    }, [onToggle, isOpen]);

    const [copied, setCopied] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // ESC to close
    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [open, close]);

    // Smooth scroll into view when opened
    useEffect(() => {
      if (open && contentRef.current) {
        setTimeout(() => {
          contentRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }, 80);
      }
    }, [open]);

    const handleCopy = useCallback(() => {
      if (!source?.full_text) return;
      navigator.clipboard.writeText(source.full_text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }, [source?.full_text]);

    const hasFullText = !!source?.full_text;

    return (
      <span ref={rootRef} className="inline-flex flex-wrap items-baseline align-middle ml-0.5 mr-0.5 max-w-full">
        {/* Trigger button — book icon */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleOpen();
          }}
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-md border transition-all",
            hasFullText
              ? "px-1.5 h-5"
              : "w-5 h-5",
            open
              ? "bg-gold-primary text-white border-gold-primary shadow-sm"
              : hasFullText
                ? "bg-gold-primary/10 text-gold-primary border-gold-primary/30 hover:bg-gold-primary/20 hover:border-gold-primary/50"
                : "bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-200",
          )}
          title={
            hasFullText
              ? "Kliknij — rozwiń pełne brzmienie przepisu"
              : "Brak pełnego tekstu — sprawdź ISAP"
          }
          aria-expanded={open}
          aria-controls={`cite-inline-${refNum}`}
        >
          <BookOpen size={11} strokeWidth={2.5} />
          {hasFullText && (
            <ChevronDown
              size={9}
              strokeWidth={3}
              className={cn(
                "transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          )}
        </button>

        {/* Inline expanded article — shows directly in chat flow */}
        {open && (
          <div
            id={`cite-inline-${refNum}`}
            ref={contentRef}
            className="cite-inline-panel not-prose basis-full w-full min-w-0"
            role="region"
            aria-label={`Pełny tekst: ${source?.label ?? "Przepis"}`}
          >
            {/* Header bar */}
            <span className="cite-inline-header">
              <span className="cite-inline-header-left">
                <span className="cite-inline-ref-badge">
                  {source?.ref_id ?? `[${refNum}]`}
                </span>
                <span className="cite-inline-label">
                  {source?.label ?? "Przepis"}
                </span>
                {source?.verified !== false ? (
                  <span className="cite-inline-status cite-inline-status--ok">
                    Zweryfikowany
                  </span>
                ) : (
                  <span className="cite-inline-status cite-inline-status--warn">
                    Do weryfikacji
                  </span>
                )}
              </span>
              <span className="cite-inline-header-right">
                {hasFullText && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopy();
                    }}
                    className="cite-inline-action-btn"
                    title="Kopiuj treść"
                  >
                    {copied ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
                {source?.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cite-inline-action-btn cite-inline-action-link"
                    title="Otwórz w ISAP"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    close();
                  }}
                  className="cite-inline-action-btn cite-inline-close-btn"
                  aria-label="Zamknij"
                >
                  <X size={13} />
                </button>
              </span>
            </span>

            {/* Full article text */}
            <span className="cite-inline-body custom-scrollbar">
              {hasFullText ? (
                <span className="cite-inline-fulltext">
                  {source!.full_text}
                </span>
              ) : (
                <span className="cite-inline-empty">
                  {source?.snippet ??
                    "Pełne brzmienie nie zostało wyodrębnione z bazy RAG. Otwórz ISAP lub przypis na dole wiadomości."}
                </span>
              )}
            </span>
          </div>
        )}
      </span>
    );
  },
);

InlineStatuteCitation.displayName = "InlineStatuteCitation";
