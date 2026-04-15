import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Sparkles, FileText, Search, 
  ChevronDown, Check, X, Clock, Network, Gavel, 
  BarChart3, Shield 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Message, ExpertAnalysis } from "../types";
import { getBrand } from "../constants";
import Mermaid from "../../Shared/Mermaid";


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Expert Analysis Card — shown inside consensus messages
// ---------------------------------------------------------------------------
const ExpertCard = React.memo(({ expert, index }: { expert: ExpertAnalysis; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const vendor = expert.model.split("/")[0]?.toUpperCase() || "UNKNOWN";
  const modelName = expert.model.split("/")[1] || expert.model;
  const brand = getBrand(vendor);
  const latency = expert.latency_ms ? (expert.latency_ms / 1000).toFixed(1) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl border border-white/5 overflow-hidden transition-all"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/2 transition-colors"
      >
        {/* Status dot */}
        <div className={cn(
          "w-2 h-2 rounded-full shrink-0",
          expert.success !== false 
            ? "bg-gold shadow-[0_0_12px_rgba(197,163,88,0.5)]" 
            : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
        )} />

        {/* Model info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[8px] font-bold uppercase tracking-wider", brand.color)}>
              {vendor}
            </span>
            <span className="text-[10px] font-bold text-white/70 truncate">
              {modelName}
            </span>
          </div>
        </div>

        {/* Latency badge */}
        {latency && (
          <div className="flex items-center gap-1 text-white/20">
            <Clock size={9} />
            <span className="text-[8px] font-bold">{latency}s</span>
          </div>
        )}

        {/* Status badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest",
          expert.success !== false
            ? "bg-gold/10 text-gold border border-gold/20"
            : "bg-red-500/10 text-red-500 border border-red-500/20"
        )}>
          {expert.success !== false ? <Check size={8} /> : <X size={8} />}
          {expert.success !== false ? "SUCCESS" : "ERROR"}
        </div>

        {/* Expand chevron */}
        <ChevronDown 
          size={13} 
          className={cn(
            "text-white/20 transition-transform shrink-0",
            expanded && "rotate-180"
          )} 
        />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && expert.response && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/4">
              <div className="pt-3 text-[11px] leading-[1.6] text-white/50 prose dark:prose-invert max-w-none prose-p:mb-2 prose-strong:text-white/70 prose-headings:text-white/60 prose-headings:text-[12px] max-h-[300px] overflow-y-auto custom-scrollbar">
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
                    }
                  }}
                >
                  {expert.response}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

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
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/6">
      {/* MOA badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/20 shadow-[0_0_15px_rgba(197,163,88,0.05)]">
        <Network size={10} className="text-gold" />
        <span className="text-[8px] font-black text-gold uppercase tracking-wider">MOA ARCHITECTURE</span>
      </div>

      {/* Experts */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/3 border border-white/6">
        <BarChart3 size={9} className="text-white/30" />
        <span className="text-[8px] font-medium text-white/30">
          {successCount}/{expertCount} ekspertów
        </span>
      </div>

      {/* Latency */}
      {latency && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/3 border border-white/6">
          <Clock size={9} className="text-white/30" />
          <span className="text-[8px] font-medium text-white/30">{latency}s</span>
        </div>
      )}

      {/* Context size */}
      {context && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/3 border border-white/6">
          <FileText size={9} className="text-white/30" />
          <span className="text-[8px] font-medium text-white/30">{context} kontekstu</span>
        </div>
      )}
    </div>
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
      className="mt-6 mb-2 rounded-2xl border border-gold/20 bg-gold/5 overflow-hidden shadow-2xl group/eli"
    >
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gold/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-gold animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gold font-outfit">
            ELI VERIFICATION LAYER
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[8px] font-bold text-gold/30 uppercase tracking-[0.4em] hidden sm:block">Explainable Legal Intelligence</span>
          <ChevronDown size={14} className={cn("text-gold/50 transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gold-primary/20"
          >
            <div className="p-4 text-[11px] leading-[1.65] text-white/70 font-outfit bg-white/5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export const MessageBubble = React.memo(({ msg, onPreviewDoc }: MessageBubbleProps) => {
  const isUser = msg.role === "user";
  const [showExperts, setShowExperts] = useState(false);
  const hasExperts = msg.expert_analyses && msg.expert_analyses.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className={cn(
        "flex gap-2 group w-full",
        isUser ? "flex-row-reverse pl-4 md:pl-8" : "pr-4 md:pr-8",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center transition-all shadow-xl relative overflow-hidden",
          isUser
            ? "glass-prestige-gold text-gold-primary border border-gold-primary/30"
            : msg.consensus_used
              ? "glass-prestige-gold text-gold-primary border border-gold-primary/40"
              : "glass-prestige-gold text-gold-primary border border-gold-primary/30",
        )}
      >
        {isUser ? <User size={15} /> : msg.consensus_used ? <Gavel size={15} /> : <Sparkles size={15} />}
        <div
          className={cn(
            "absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity",
            "bg-gold",
          )}
        />
      </div>

      <div
        className={cn(
          "flex flex-col gap-1.5 max-w-[90%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "relative px-5 py-4 rounded-3xl overflow-hidden glass-lux transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
            isUser ? "rounded-tr-none border-gold/10 bg-gold/5" : "rounded-tl-none",
          )}
        >
          <div
            className={cn(
              "absolute top-0 w-48 h-[1px]",
              isUser ? "right-0 bg-gradient-to-l from-gold to-transparent" : "left-0 bg-gradient-to-r from-gold/50 to-transparent",
            )}
          />

          {!isUser && (
            <div className="flex items-center gap-2 mb-3">
              {msg.consensus_used ? (
                <>
                  <Network size={12} className="text-gold" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/80 font-outfit">
                    CONSENSUS MOA
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="text-gold" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/80 font-outfit">
                    AI LEGAL CORE
                  </span>
                </>
              )}
            </div>
          )}

          <div className="text-[14px] leading-[1.75] font-medium text-white/90 prose dark:prose-invert max-w-none prose-p:mb-4 prose-strong:text-gold prose-strong:font-black prose-headings:text-white prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:font-outfit prose-ul:list-disc prose-li:marker:text-gold">
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
                }
              }}
            >
              {typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content)}
            </ReactMarkdown>
          </div>

          {/* ELI Explanation (Verification Layer) */}
          {msg.eli_explanation && <ELIExplanation content={msg.eli_explanation} />}

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-4">
              {msg.attachments.map((att, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group/att overflow-hidden rounded-2xl border-gold-gradient shadow-xl w-full max-w-[260px] xs:max-w-[300px] sm:max-w-[400px]"
                >
                  {att.type?.startsWith("image/") ? (
                    <img
                      src={att.content.startsWith("data:") ? att.content : `data:${att.type};base64,${att.content}`}
                      alt={att.name}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover/att:scale-105"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-4 glass-prestige">
                      <FileText size={20} className="text-accent" />
                      <span className="text-xs font-bold uppercase tracking-tighter truncate max-w-[150px]">
                        {att.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => onPreviewDoc?.(att.name, att.content)}
                      className="p-2 glass-prestige rounded-full text-white transition-all hover:scale-110 hover:text-gold-primary"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Sources */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 space-y-2 glass-prestige rounded-xl p-3">
              <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] flex items-center gap-1.5">
                <Search size={11} className="text-accent" /> Źródła
              </p>
              <div className="flex flex-wrap gap-1.5">
                {msg.sources.map((src, i) => {
                  const srcStr = typeof src === 'string' ? src : (src as unknown as { name?: string })?.name || String(src);
                  const isSaos = srcStr.toUpperCase().includes('SAOS') || srcStr.toUpperCase().includes('ORZECZENIE');
                  const isEli = srcStr.toUpperCase().includes('SEJM') || srcStr.toUpperCase().includes('ISAP') || srcStr.toUpperCase().includes('ELI');
                  
                  const iconColor = isSaos ? 'text-red-400' : isEli ? 'text-gold-primary' : 'text-gold-primary';
                  const hoverBg = isSaos ? 'hover:bg-red-500/20 hover:text-red-400' : isEli ? 'hover:bg-gold-primary/20 hover:text-gold-primary' : 'hover:bg-gold-primary/20 hover:text-gold-primary';
                  const label = isSaos ? 'SAOS' : isEli ? 'ELI' : 'RAG';
                  const borderColor = isSaos ? 'border-red-500/20' : isEli ? 'border-gold-primary/20' : 'border-gold-primary/20';
                  
                  return (
                    <button
                      key={i}
                      onClick={() => onPreviewDoc?.(srcStr)}
                      className={`flex items-center gap-1.5 glass-prestige px-2.5 py-1.5 rounded-lg text-[9px] font-bold text-white ${hoverBg} transition-all active:scale-95 border ${borderColor}`}
                    >
                      <span className={`text-[7px] font-black px-1 py-0.5 rounded ${isSaos ? 'bg-red-500/20 text-red-400' : isEli ? 'bg-gold-primary/20 text-gold-primary' : 'bg-gold-primary/20 text-gold-primary'}`}>
                        {label}
                      </span>
                      <FileText size={10} className={iconColor} />
                      <span className="truncate max-w-[140px] uppercase tracking-tighter text-[8px]">
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

          {/* Expert analyses toggle */}
          {hasExperts && (
            <div className="mt-3">
              <button
                onClick={() => setShowExperts(!showExperts)}
                className="flex items-center gap-3 mt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-white/20 hover:text-gold transition-all group/exp"
              >
                <div className="w-5 h-5 rounded flex items-center justify-center bg-white/5 group-hover/exp:bg-gold/10 transition-colors">
                  <ChevronDown 
                    size={14} 
                    className={cn("transition-transform duration-500", showExperts && "rotate-180")} 
                  />
                </div>
                {showExperts ? "HIDE INDEPENDENT ANALYSES" : `VIEW AGENT LOGS (${msg.expert_analyses!.length})`}
              </button>

              <AnimatePresence>
                {showExperts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mt-3">
                      {msg.expert_analyses!.map((expert, i) => (
                        <ExpertCard key={expert.model} expert={expert} index={i} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 opacity-30 group-hover:opacity-60 transition-opacity">
          <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
            {isUser ? "Client Identity" : msg.consensus_used ? "MOA Network" : "LexMind Core"}
          </span>
          <div className="h-1 w-1 rounded-full bg-slate-800" />
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
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
