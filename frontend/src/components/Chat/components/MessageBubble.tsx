import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, Sparkles, FileText, Search, 
  ChevronDown, Clock, Network, Gavel, 
  BarChart3, Shield, AlertTriangle, AlertOctagon, Calendar, Zap, Activity,
  Microscope,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Message, ClaimScore, InvestigationSummary } from "../types";
import Mermaid from "../../Shared/Mermaid";
import { ExpertAnalysesCompact } from "./ExpertAnalysesCompact";
import { InlineStatuteCitation } from "./InlineStatuteCitation";
import {
  buildCiteLookup,
  linkStatuteCitationsInMarkdown,
} from "../../../utils/statuteCitationParse";


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Pipeline Stats Bar — shown for consensus messages
// ---------------------------------------------------------------------------
const PipelineStats = React.memo(({ msg }: { msg: Message }) => {
  if (!msg.consensus_used) return null;

  const expertCount = msg.expert_analyses?.length || 0;
  const successCount = msg.expert_analyses?.filter(e => e.success !== false).length || 0;
  const latency = msg.pipeline_latency_ms ? (msg.pipeline_latency_ms / 1000).toFixed(1) : null;
  const context = msg.context_chars ? `${(msg.context_chars / 1000).toFixed(0)}k` : null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3.5 border-t border-stone-200">
      {/* MOA badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gold-primary/10 border border-gold-primary/20 shadow-[0_0_15px_rgba(197,163,88,0.05)]">
        <Network size={11} className="text-gold-primary" />
        <span className="text-[9.5px] font-black text-gold-primary uppercase tracking-wider">MOA ARCHITECTURE</span>
      </div>

      {/* Experts */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
        <BarChart3 size={10} className="text-stone-500" />
        <span className="text-[9.5px] font-medium text-stone-500">
          {expertCount > 0
            ? `${successCount}/${expertCount} ekspertów`
            : "Konsylium MOA — szczegóły w treści"}
        </span>
      </div>

      {/* Latency */}
      {latency && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
          <Clock size={10} className="text-stone-500" />
          <span className="text-[9.5px] font-medium text-stone-500">{latency}s</span>
        </div>
      )}

      {/* Context size */}
      {context && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
          <FileText size={10} className="text-stone-500" />
          <span className="text-[9.5px] font-medium text-stone-500">{context} kontekstu</span>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Legal Investigation v2 — hipotezy, scoring, skrót śledztwa
// ---------------------------------------------------------------------------
function normScore01(v: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  if (v > 1) return Math.min(1, Math.max(0, v / 100));
  return Math.min(1, Math.max(0, v));
}

const ScoreRow = ({ label, value, invert }: { label: string; value: number; invert?: boolean }) => {
  const pct = Math.round(normScore01(value) * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between gap-2 text-[9px] font-bold text-stone-500 uppercase tracking-tight">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            invert ? "bg-amber-600" : "bg-gold-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const LegalInvestigationPanel = React.memo(({ msg }: { msg: Message }) => {
  const [expanded, setExpanded] = useState(true);
  const scores = msg.claim_scores;
  const summary = msg.investigation_summary as InvestigationSummary | undefined;
  if (!scores?.length && summary == null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-stone-50/80 overflow-hidden shadow-xs"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-violet-50/80 transition-colors border-b border-violet-100"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Microscope size={16} className="text-violet-600 shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-800 font-outfit truncate">
            Śledztwo prawne — hipotezy i scoring
          </span>
        </div>
        <ChevronDown size={15} className={cn("text-violet-500 transition-transform shrink-0", expanded && "rotate-180")} />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-4 space-y-4">
            {summary != null && (
              <div className="flex flex-wrap gap-2">
                {(summary.hypothesis_count ?? 0) > 0 && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white border border-violet-100 text-violet-700">
                    Hipotez: {summary.hypothesis_count}
                  </span>
                )}
                {(summary.research_rounds ?? 0) > 0 && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white border border-violet-100 text-violet-700">
                    Rund RAG: {summary.research_rounds}
                  </span>
                )}
                {(summary.evidence_count ?? 0) > 0 && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white border border-violet-100 text-violet-700">
                    Dowodów: {summary.evidence_count}
                  </span>
                )}
                {summary.problem_tags && summary.problem_tags.length > 0 && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-violet-100/60 border border-violet-200 text-violet-800">
                    {summary.problem_tags.join(" · ")}
                  </span>
                )}
                {(summary.budget_llm_calls ?? 0) > 0 && (
                  <span className="text-[9px] font-semibold text-stone-500 px-2 py-1 rounded-lg bg-stone-100/80 border border-stone-200">
                    LLM: {summary.budget_llm_calls} · RAG: {summary.budget_retrieval_calls ?? 0}
                  </span>
                )}
              </div>
            )}

            {scores && scores.length > 0 && (
              <div className="space-y-3">
                {scores.map((c: ClaimScore, idx: number) => (
                  <div
                    key={`${c.hypothesis_id || idx}-${idx}`}
                    className="rounded-xl border border-stone-200 bg-white/90 p-3 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                      <span className="text-[11px] font-black text-stone-800 uppercase tracking-tight font-outfit">
                        {c.label || c.hypothesis_id || `Hipoteza ${idx + 1}`}
                      </span>
                      {c.hypothesis_id ? (
                        <span className="text-[9px] font-mono font-bold text-violet-600/80">{c.hypothesis_id}</span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <ScoreRow label="Siła prawna" value={c.legal_strength} />
                      <ScoreRow label="Procedura" value={c.procedural_strength} />
                      <ScoreRow label="Orzecznictwo" value={c.precedent_support} />
                      <ScoreRow label="Ryzyko sprzeczności" value={c.contradiction_risk} invert />
                    </div>
                    {c.notes?.trim() ? (
                      <p className="mt-2 text-[11.5px] leading-snug text-stone-600 font-outfit">{c.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Main Message Bubble
// ---------------------------------------------------------------------------
interface MessageBubbleProps {
  msg: Message;
  onPreviewDoc?: (name: string, content?: string) => void;
}

// ---------------------------------------------------------------------------
// ELI Explanation — Highlighted verification section
// ---------------------------------------------------------------------------
const ELIExplanation = React.memo(({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 mb-2 rounded-2xl border border-gold-primary/30 bg-gold-primary/5 overflow-hidden shadow-xs group/eli"
    >
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gold-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield size={17} className="text-gold-primary animate-pulse" />
          <span className="text-[12.5px] font-black uppercase tracking-[0.25em] text-gold-primary font-outfit">
            ELI VERIFICATION LAYER
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9.5px] font-bold text-gold-primary/50 uppercase tracking-[0.4em] hidden sm:block">Explainable Legal Intelligence</span>
          <ChevronDown size={15} className={cn("text-gold-primary/70 transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out border-t border-gold-primary/20",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-4 text-[13px] leading-[1.75] text-stone-750 font-outfit bg-stone-100/30">
            {expanded ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown> : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Pipeline Diagnosis — Detailed step-by-step breakdown
// ---------------------------------------------------------------------------
type DiagnosisStep = {
  step_name: string;
  status: string;
  details?: string;
  latency_ms: number;
};

const MessageDiagnosis = React.memo(({ diagnostics }: { diagnostics: DiagnosisStep[] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden shadow-xs">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-stone-100 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-stone-400 group-hover:text-gold-primary transition-colors animate-pulse" />
          <span className="text-[11.5px] font-black uppercase tracking-[0.2em] text-stone-500 group-hover:text-stone-750 transition-colors font-outfit">
             SZCZEGÓŁOWA DIAGNOZA PROCESU
          </span>
        </div>
        <ChevronDown size={15} className={cn("text-stone-400 transition-transform", expanded && "rotate-180")} />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out border-t border-stone-200 bg-stone-100/30",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-3 space-y-1.5">
            {expanded
              ? diagnostics.map((step, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white border border-stone-150 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    step.status === 'ok' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                    step.status === 'warning' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
                    "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                  )} />
                  <div className="flex flex-col">
                     <span className="text-[11.5px] font-bold text-stone-750 uppercase tracking-tight">{step.step_name}</span>
                     {step.details && <span className="text-[9.5px] text-stone-400 font-medium">{step.details}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[10.5px] font-black font-mono text-stone-400">{Math.round(step.latency_ms)}ms</span>
                   <Zap size={9} className={cn(step.latency_ms < 500 ? "text-emerald-500" : "text-stone-300")} />
                </div>
              </div>
              ))
              : null}
          </div>
        </div>
      </div>
    </div>
  );
});

export const MessageBubble = React.memo(({ msg, onPreviewDoc }: MessageBubbleProps) => {
  const isUser = msg.role === "user";
  const hasExperts = msg.expert_analyses && msg.expert_analyses.length > 0;
  const citeLookup = React.useMemo(
    () => buildCiteLookup(msg.cited_sources),
    [msg.cited_sources],
  );

  const displayContent =
    typeof msg.content === "string" && !isUser
      ? linkStatuteCitationsInMarkdown(msg.content, msg.cited_sources)
      : typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="flex gap-4 group w-full pl-0 pr-0"
    >
      <div
        className={cn(
          "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center transition-all relative overflow-hidden mt-1 border",
          isUser
            ? "bg-stone-50 text-stone-700 border-stone-200"
            : "bg-gold-primary/10 text-gold-primary border-gold-primary/20",
        )}
      >
        {isUser ? <User size={15} /> : msg.consensus_used ? <Gavel size={15} /> : <Sparkles size={15} />}
        <div
          className={cn(
            "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity",
            "bg-gold-primary",
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5 w-full min-w-0">
        <div
          className={cn(
            "relative w-full overflow-hidden transition-all duration-300 bg-white px-1 py-1",
            isUser ? "border-b border-stone-100 pb-6 mb-4" : "pb-4"
          )}
        >
          {isUser ? (
            <div className="flex items-center gap-2 mb-3 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 w-fit">
              <User size={12} className="text-stone-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600 font-outfit">
                Twoje Zapytanie
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3">
              {msg.consensus_used ? (
                <div className="flex items-center gap-2 bg-gold-primary/10 px-3 py-1.5 rounded-lg border border-gold-primary/20 w-fit">
                  <Network size={12} className="text-gold-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-primary font-outfit">
                    ANALIZA KONSENSUSOWA MOA
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 w-fit">
                  <Sparkles size={12} className="text-gold-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-primary font-outfit">
                    RDZEŃ BAZY PRAWNEJ AI
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pipeline progress (live etapy podczas generowania) */}
          {!isUser && msg.pipeline_log && msg.pipeline_log.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-gold-primary/25 bg-gold-primary/5 overflow-hidden"
            >
              <motion.div className="px-4 py-3 border-b border-gold-primary/20 flex items-center gap-2">
                <Activity size={14} className="text-gold-primary animate-pulse shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-primary font-outfit">
                  Potok analizy prawnej
                </span>
              </motion.div>
              <div className="px-4 py-3 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                {msg.pipeline_log.map((step, idx) => (
                  <motion.div
                    key={`${idx}-${step.slice(0, 24)}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "text-[12px] leading-snug font-outfit pl-3 border-l-2",
                      idx === msg.pipeline_log!.length - 1
                        ? "border-gold-primary text-stone-800 font-semibold"
                        : "border-stone-200 text-stone-500",
                    )}
                  >
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Urgency Alert Banners */}
          {!isUser && msg.urgency_alerts && msg.urgency_alerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {msg.urgency_alerts.map((alert, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200/80 shadow-xs text-red-700">
                  <AlertTriangle size={18} className="shrink-0 animate-bounce text-red-500" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-black uppercase tracking-wider block text-red-800">Termin procesowy</span>
                    <p className="text-sm font-semibold leading-normal">{alert}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COI Warning Banners */}
          {!isUser && msg.coi_conflicts && msg.coi_conflicts.length > 0 && (
            <div className="mb-4 space-y-2">
              {msg.coi_conflicts.map((conflict, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-xs text-amber-700">
                  <AlertOctagon size={18} className="shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-black uppercase tracking-wider block text-amber-800">Conflict of Interest Found</span>
                    <p className="text-sm font-semibold leading-normal">{conflict}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Synteza zablokowana — niezweryfikowane cytaty */}
          {!isUser && msg.synthesis_blocked && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200/80 shadow-xs text-red-800">
              <Shield size={18} className="shrink-0 text-red-500" />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-black uppercase tracking-wider block text-red-900">
                  Synteza wstrzymana — podstawa prawna
                </span>
                <p className="text-sm font-semibold leading-normal">
                  Niezweryfikowane przepisy
                  {msg.hallucinated_cites?.length
                    ? `: ${msg.hallucinated_cites.slice(0, 4).join(', ')}${msg.hallucinated_cites.length > 4 ? ` (+${msg.hallucinated_cites.length - 4} innych)` : ''}`
                    : ''}.
                  Każdy art. musi być poparty aktami, RAG lub ELI — sprawdź w ISAP przed działaniem.
                  Poniżej raporty ekspertów.
                </p>
              </div>
            </div>
          )}

          {/* Niska pewność — bez fałszywej eskalacji HITL */}
          {!isUser && msg.hitl_escalated && !msg.synthesis_blocked && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200/80 shadow-xs text-yellow-750">
              <Shield size={18} className="shrink-0 text-yellow-500" />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-black uppercase tracking-wider block text-yellow-800">Niska pewność odpowiedzi</span>
                <p className="text-sm font-semibold leading-normal">
                  Silnik wykrył niepewność (pewność {msg.confidence_score}% &lt; 92%) — zweryfikuj cytaty przepisów i fakty w aktach przed podjęciem decyzji procesowej.
                </p>
              </div>
            </div>
          )}

          {/* Premium Strategic Metrics Layer */}
          {!isUser && (typeof msg.p_sukces === 'number' || msg.confidence_score !== undefined) && (
            <div className="grid grid-cols-2 gap-3 mb-5 p-3.5 rounded-2xl border border-stone-200 bg-stone-100/50">
              {typeof msg.p_sukces === 'number' && (
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="22" cy="22" r="18" className="stroke-stone-200 fill-none" strokeWidth="3" />
                      <circle cx="22" cy="22" r="18" className="stroke-gold fill-none" strokeWidth="3"
                        strokeDasharray="113.1"
                        strokeDashoffset={113.1 - (113.1 * msg.p_sukces) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[11.5px] font-black text-stone-850">{msg.p_sukces}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gold-primary uppercase tracking-wider block">Szansa Powodzenia</span>
                    <span className="text-[11px] text-stone-500 font-medium font-outfit">P(Sukces)</span>
                  </div>
                </div>
              )}
              {msg.confidence_score !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="22" cy="22" r="18" className="stroke-stone-200 fill-none" strokeWidth="3" />
                      <circle cx="22" cy="22" r="18" className="stroke-emerald-500 fill-none" strokeWidth="3"
                        strokeDasharray="113.1"
                        strokeDashoffset={113.1 - (113.1 * msg.confidence_score) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[11.5px] font-black text-stone-855">{msg.confidence_score}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">Pewność Decyzyjna</span>
                    <span className="text-[11px] text-stone-500 font-medium font-outfit">LexMind Confidence</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legal Investigation — claim scores & summary (v2) */}
          {!isUser && (msg.claim_scores?.length || msg.investigation_summary != null) && (
            <LegalInvestigationPanel msg={msg} />
          )}

          <div
            className={cn(
              "text-[17px] leading-[1.85] max-w-none font-outfit",
              isUser
                ? "font-bold text-stone-900 prose prose-stone prose-p:mb-2 prose-headings:text-stone-900"
                : "font-normal text-stone-900 prose prose-stone prose-p:mb-3 prose-p:text-stone-800 prose-strong:text-stone-900 prose-strong:font-bold prose-headings:text-stone-900 prose-headings:font-bold prose-headings:tracking-tight prose-ul:list-disc prose-li:marker:text-stone-400"
            )}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isMermaid = match && match[1] === "mermaid";
                  
                  if (isMermaid) {
                    return <Mermaid content={String(children).replace(/\n$/, "")} />;
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                a({ href, children, ...props }) {
                  const citeMatch = href?.match(/^#cite-(\d+)$/);
                  if (citeMatch) {
                    const refNum = citeMatch[1];
                    const source = citeLookup.byRefId.get(refNum);
                    return (
                      <span className="inline-flex items-baseline flex-wrap gap-0.5 align-baseline not-prose">
                        <a
                          href={`#cite-${refNum}`}
                          className="inline text-gold-primary font-semibold underline decoration-gold-primary/40 underline-offset-2 hover:decoration-gold-primary"
                          {...props}
                        >
                          {children}
                        </a>
                        <InlineStatuteCitation source={source} refNum={refNum} />
                      </span>
                    );
                  }
                  return <a href={href} className="text-gold-primary underline hover:no-underline font-semibold" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                }
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>

          {/* ELI Explanation (Verification Layer) */}
          {msg.eli_explanation && <ELIExplanation content={msg.eli_explanation} />}

          {/* Chronological Timeline Component */}
          {!isUser && msg.timeline && msg.timeline.length > 0 && (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-stone-100/80 border-b border-stone-200 flex items-center gap-2">
                <Calendar size={15} className="text-gold-primary" />
                <span className="text-[12px] font-black uppercase tracking-[0.15em] text-stone-700 font-outfit">
                  Chronologia Zdarzeń (Timeline)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-100/45 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      <th className="px-4 py-2.5">Data</th>
                      <th className="px-4 py-2.5">Zdarzenie / Fakt</th>
                      <th className="px-4 py-2.5">Źródło</th>
                      <th className="px-4 py-2.5">Wpływ Strategiczny</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {msg.timeline.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50 transition-colors text-sm text-stone-700">
                        <td className="px-4 py-3 font-bold text-gold-primary font-mono whitespace-nowrap">{item.date}</td>
                        <td className="px-4 py-3 leading-relaxed">{item.event}</td>
                        <td className="px-4 py-3 text-stone-500 text-[11.5px]">{item.source}</td>
                        <td className="px-4 py-3 font-semibold text-[12.5px] text-emerald-600">{item.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Evidence Gaps & Inconsistencies */}
          {!isUser && ((msg.gaps && msg.gaps.length > 0) || (msg.inconsistencies && msg.inconsistencies.length > 0)) && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {msg.gaps && msg.gaps.length > 0 && (
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-xxs">
                  <span className="text-[12px] font-black uppercase tracking-wider text-blue-700 block mb-2.5 font-outfit">
                    Luki Dowodowe (Gaps)
                  </span>
                  <ul className="space-y-2 text-sm text-stone-700 font-sans">
                    {msg.gaps.map((gap, idx) => (
                      <li key={idx} className="flex gap-2 leading-relaxed">
                        <span className="text-blue-500 font-bold shrink-0">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {msg.inconsistencies && msg.inconsistencies.length > 0 && (
                <div className="p-4 rounded-2xl border border-red-200 bg-red-50/50 shadow-xxs">
                  <span className="text-[12px] font-black uppercase tracking-wider text-red-700 block mb-2.5 font-outfit">
                    Niespójności w materiale (Inconsistencies)
                  </span>
                  <ul className="space-y-2 text-sm text-stone-700 font-sans">
                    {msg.inconsistencies.map((inc, idx) => (
                      <li key={idx} className="flex gap-2 leading-relaxed">
                        <span className="text-red-500 font-bold shrink-0">•</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-4">
              {msg.attachments.map((att, i) => (
                <motion.div
                  key={`${msg.id}-att-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group/att overflow-hidden rounded-2xl border border-stone-200 shadow-md w-full max-w-[260px] xs:max-w-[300px] sm:max-w-[400px] bg-white"
                >
                  {att.type?.startsWith("image/") ? (
                    <img
                      src={att.content.startsWith("data:") ? att.content : `data:${att.type};base64,${att.content}`}
                      alt={att.name}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover/att:scale-105"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-stone-50">
                      <FileText size={22} className="text-stone-500" />
                      <span className="text-sm font-bold uppercase tracking-tight truncate max-w-[200px] text-stone-750">
                        {att.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => onPreviewDoc?.(att.name, att.content)}
                      className="p-2.5 bg-white/90 rounded-full text-stone-800 transition-all hover:scale-110 hover:text-gold-primary"
                    >
                      <Search size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Inline Citations List (Libra-style) */}
          {msg.cited_sources && msg.cited_sources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-stone-200 space-y-2.5">
              <p className="text-[12px] font-black uppercase text-gold-primary tracking-[0.15em] flex items-center gap-1.5 font-outfit">
                <FileText size={13} /> Przepisy — weryfikacja brzmienia
              </p>
              <p className="text-[11px] text-stone-500 font-outfit leading-snug">
                Przy każdym artykule w tekście kliknij ikonę 📖 — rozwiniesz pełne brzmienie. Poniżej lista przypisów.
              </p>
              <div className="flex flex-col gap-2.5">
                {msg.cited_sources.map((src, i) => (
                  <div key={`cite-${src.ref_id}-${i}`} id={`cite-${src.ref_id.replace(/[[\]]/g, "")}`} className="group/cite flex gap-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/60 transition-colors shadow-xxs scroll-mt-24">
                    <div className="text-[11px] font-black text-gold bg-gold/5 px-2 py-1 rounded h-fit shrink-0 border border-gold/10">
                      {src.ref_id}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[12.5px] font-bold text-stone-800 uppercase tracking-tighter">
                          {src.label}
                        </span>
                        <span className={cn(
                          "text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase",
                          src.verified === false
                            ? "bg-amber-100 text-amber-800"
                            : src.source_type === "judgment"
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800",
                        )}>
                          {src.verified === false
                            ? "Do weryfikacji"
                            : src.source_type === "judgment"
                              ? "SAOS"
                              : src.source_type === "document"
                                ? "Akta"
                                : "Zweryfikowany"}
                        </span>
                      </div>
                      {src.snippet && (
                        <p className="text-[12px] leading-relaxed text-stone-500">
                          {src.snippet}
                        </p>
                      )}
                      {src.full_text ? (
                        <details className="mt-1 rounded-lg border border-stone-200 bg-white overflow-hidden">
                          <summary className="cursor-pointer px-3 py-2 text-[11px] font-black uppercase tracking-wider text-gold-primary hover:bg-stone-50">
                            Pokaż pełne brzmienie przepisu
                          </summary>
                          <div className="px-3 py-3 text-[12px] leading-relaxed text-stone-800 whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar border-t border-stone-100 font-mono">
                            {src.full_text}
                          </div>
                        </details>
                      ) : null}
                      {src.url && (
                        <div className="flex justify-end gap-3 mt-1">
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-blue-600 hover:text-blue-500 uppercase tracking-wider flex items-center gap-1">
                            ISAP / ELI <Search size={10} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources (Raw Context metadata) */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-stone-250 space-y-2 border border-stone-200 bg-stone-100/30 rounded-xl p-3.5">
              <p className="text-[12px] font-black uppercase text-stone-600 tracking-[0.15em] flex items-center gap-1.5">
                <Search size={13} className="text-stone-500" /> Źródła
              </p>
              <div className="flex flex-wrap gap-2">
                {msg.sources.map((src, i) => {
                  const srcStr = typeof src === 'string' ? src : (src as unknown as { name?: string })?.name || String(src);
                  const isSaos = srcStr.toUpperCase().includes('SAOS') || srcStr.toUpperCase().includes('ORZECZENIE');
                  const isEli = srcStr.toUpperCase().includes('SEJM') || srcStr.toUpperCase().includes('ISAP') || srcStr.toUpperCase().includes('ELI');
                  
                  const iconColor = isSaos ? 'text-red-500' : isEli ? 'text-gold-primary' : 'text-gold-primary';
                  const hoverBg = isSaos ? 'hover:bg-red-50 hover:text-red-700' : isEli ? 'hover:bg-gold-primary/10 hover:text-gold-primary' : 'hover:bg-gold-primary/10 hover:text-gold-primary';
                  const label = isSaos ? 'SAOS' : isEli ? 'ELI' : 'RAG';
                  const borderColor = isSaos ? 'border-red-200' : isEli ? 'border-gold-primary/20' : 'border-gold-primary/20';
                  
                  return (
                    <button
                      key={`${msg.id}-source-${i}`}
                      onClick={() => onPreviewDoc?.(srcStr)}
                      className={`flex items-center gap-2 bg-white px-3 py-2 rounded-lg text-[11px] font-bold text-stone-700 ${hoverBg} transition-all active:scale-95 border ${borderColor}`}
                    >
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${isSaos ? 'bg-red-50 text-red-600' : isEli ? 'bg-gold-primary/10 text-gold-primary' : 'bg-gold-primary/10 text-gold-primary'}`}>
                        {label}
                      </span>
                      <FileText size={12} className={iconColor} />
                      <span className="truncate max-w-[180px] uppercase tracking-tighter text-[10px]">
                        {srcStr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pipeline metadata */}
          <PipelineStats msg={msg} />

          {/* Detailed Diagnosis */}
          {msg.diagnostics && msg.diagnostics.length > 0 && (
            <MessageDiagnosis diagnostics={msg.diagnostics} />
          )}

          {hasExperts && (
            <ExpertAnalysesCompact
              analyses={msg.expert_analyses!}
              onOpenFull={onPreviewDoc}
            />
          )}
        </div>

        <div className="flex items-center gap-2 px-2 opacity-60 transition-opacity mt-1">
          <span className="text-[11px] text-stone-400 font-black uppercase tracking-[0.3em]">
            {isUser ? "Client Identity" : msg.consensus_used ? "MOA Network" : "LexMind Core"}
          </span>
          <div className="h-1 w-1 rounded-full bg-stone-300" />
          <span className="text-[11px] text-stone-500 font-bold uppercase tracking-widest">
            {msg.created_at 
              ? new Date(msg.created_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
              : new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
            }
          </span>
        </div>
      </div>
    </motion.div>
  );
});
