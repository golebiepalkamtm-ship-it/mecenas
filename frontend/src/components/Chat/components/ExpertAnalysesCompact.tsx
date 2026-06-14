import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { LexIcon, type LexIconName } from "../../Layout/LexIcon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ExpertAnalysis } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function extractRoleLabel(model: string): string {
  const paren = model.match(/\(([^)]+)\)/);
  if (paren?.[1]) return paren[1];
  const slash = model.split("/");
  return slash[slash.length - 1] || model || "Ekspert";
}

const ROLE_ICON_MAP: { test: RegExp; lexIcon: LexIconName; ring: string; bg: string }[] = [
  { test: /doktryn|prawn|norm/i, lexIcon: "judgments", ring: "ring-amber-600/40", bg: "bg-amber-50 text-amber-800" },
  { test: /strateg|taktyk|ryzyk/i, lexIcon: "prompts", ring: "ring-emerald-600/40", bg: "bg-emerald-50 text-emerald-800" },
  { test: /organ|urzęd|proced/i, lexIcon: "documents", ring: "ring-blue-600/40", bg: "bg-blue-50 text-blue-800" },
  { test: /analiz|syntez|architekt/i, lexIcon: "knowledge", ring: "ring-violet-600/40", bg: "bg-violet-50 text-violet-800" },
];

function getRoleStyle(label: string, index: number) {
  for (const entry of ROLE_ICON_MAP) {
    if (entry.test.test(label)) return entry;
  }
  const fallback: { lexIcon: LexIconName; ring: string; bg: string }[] = [
    { lexIcon: "judgments", ring: "ring-stone-400/50", bg: "bg-stone-100 text-stone-700" },
    { lexIcon: "prompts", ring: "ring-stone-400/50", bg: "bg-stone-100 text-stone-700" },
    { lexIcon: "documents", ring: "ring-stone-400/50", bg: "bg-stone-100 text-stone-700" },
    { lexIcon: "knowledge", ring: "ring-stone-400/50", bg: "bg-stone-100 text-stone-700" },
  ];
  return { ...fallback[index % fallback.length], test: /.*/ };
}

const PAPER_CLASS =
  "relative bg-[#fafaf8] text-stone-800 rounded-sm border border-stone-300/90 shadow-[0_2px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]";

interface ExpertAnalysesCompactProps {
  analyses: ExpertAnalysis[];
  onOpenFull?: (title: string, content: string) => void;
}

export const ExpertAnalysesCompact = React.memo(({ analyses, onOpenFull }: ExpertAnalysesCompactProps) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!analyses?.length) return null;

  const toggle = (i: number) => setExpandedIdx((prev) => (prev === i ? null : i));

  return (
    <motion.div className="mt-3 pt-3 border-t border-stone-200/80">
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2.5 font-outfit">
        Pozostali eksperci
      </p>

      <motion.div layout className="flex flex-wrap items-end gap-2 mb-1">
        {analyses.map((expert, i) => {
          const label = extractRoleLabel(String(expert.model || ""));
          const roleStyle = getRoleStyle(label, i);
          const roleLexIcon = roleStyle.lexIcon;
          const isOpen = expandedIdx === i;
          const failed = expert.success === false;

          return (
            <motion.button
              key={`${expert.model}-${i}`}
              type="button"
              layout
              title={label}
              onClick={() => toggle(i)}
              animate={{
                scale: isOpen ? 1.22 : 1,
                y: isOpen ? -4 : 0,
              }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
                isOpen ? "z-20" : "z-10",
              )}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-full border-2 shadow-sm transition-shadow",
                  isOpen ? "w-11 h-11 ring-2 ring-offset-2 ring-offset-[#fafaf8]" : "w-8 h-8",
                  roleStyle.bg,
                  roleStyle.ring,
                  isOpen && "shadow-md",
                  failed && !isOpen && "border-red-300 opacity-80",
                )}
              >
                <LexIcon name={roleLexIcon} size={isOpen ? 18 : 14} />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-white/90 bg-white shadow-sm",
                    isOpen ? "w-4 h-4" : "w-3 h-3",
                  )}
                >
                  <LexIcon name="ai" size={isOpen ? 9 : 7} className="opacity-70" />
                </span>
                {failed && (
                  <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
                )}
              </span>
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-[10px] font-bold text-stone-600 max-w-[85px] truncate text-center leading-tight mt-1"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>

      {expandedIdx !== null && analyses[expandedIdx]?.response && (
        <div
          key={expandedIdx}
          className="mt-2"
        >
          <article
            className={PAPER_CLASS}
            style={{
              backgroundImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)",
              backgroundSize: "100% 1.75rem",
            }}
          >
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-stone-200/80 bg-[#f5f4f0]">
              <span className="text-[12px] font-bold text-stone-750 truncate">
                {extractRoleLabel(String(analyses[expandedIdx].model || ""))}
              </span>
              {onOpenFull && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenFull(
                      extractRoleLabel(String(analyses[expandedIdx].model || "")),
                      String(analyses[expandedIdx].response || ""),
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-500 hover:text-stone-800 shrink-0 uppercase tracking-wider transition-colors"
                >
                  <Maximize2 size={11} />
                  Pełny ekran
                </button>
              )}
            </div>
            <div className="px-4 py-3.5 max-h-[260px] overflow-y-auto custom-scrollbar text-[14px] leading-relaxed prose prose-stone prose-sm max-w-none prose-p:my-2.5 prose-headings:text-stone-900 prose-headings:text-sm prose-strong:text-stone-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {String(analyses[expandedIdx].response)}
              </ReactMarkdown>
            </div>
          </article>
        </div>
      )}
    </motion.div>
  );
});

ExpertAnalysesCompact.displayName = "ExpertAnalysesCompact";
