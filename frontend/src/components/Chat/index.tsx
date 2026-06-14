import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { LexIcon } from "../Layout/LexIcon";
import { useQueryClient } from "@tanstack/react-query";

const MAX_ATTACHMENTS = 20;

// Context & Hooks
import { useSharedChat } from "../../context/useSharedChat";
import { useChatSettingsStore } from "../../store/useChatSettingsStore";
import { useChatMutation } from "../../hooks/useChatMutation";
import type { ChatMetadata } from "../../hooks/useChatMutation";
import { useKnowledgeBase, useUserLibrary } from "../../hooks";
import type { ChatMessage, ExpertAnalysis } from "../../types/chat";
import type { Tab } from "../../types/navigation";

// Internal Components
import { MessageBubble } from "./components/MessageBubble";
import { ChatSidebar } from "./components/ChatSidebar";
import { QuickIntelligencePanel } from "./components/QuickIntelligencePanel";

import { ChatInput } from "./components/ChatInput";
import { FeatureCard } from "./components/FeatureCard";
import { WelcomeView } from "./components/WelcomeView";
import { LibrarySelectionModal } from "./components/LibrarySelectionModal";

// Shared Tools
import type { Attachment, Message, QueuedAttachment } from "./types";
import { API_BASE } from "../../config";

import { cn } from "../../utils/cn";
import {
  CHAT_MAIN_STAGE,
  CHAT_MESSAGES_SURFACE,
  CHAT_MESSAGES_INNER,
  CHAT_INPUT_DOCK,
  CHAT_INPUT_DOCK_INNER,
} from "../Library/shared";

import React from "react";

interface ChatViewProps {
  onNavigate?: (tab: Tab) => void;
}

export const ChatView = React.memo(function ChatView({ onNavigate }: ChatViewProps) {
  // Navigation helper
  const goToTab = useCallback((tab: Tab) => {
    onNavigate?.(tab);
  }, [onNavigate]);

  // Zustand Store
  const {
    mode,
    isOpen,
    setIsOpen,
    showHistory,
    setShowHistory,
    useSaos,
    setUseSaos,
    useEli,
    setUseEli,
    useRagLegal,
    setUseRagLegal,
    useRagUser,
    setUseRagUser,
  } = useChatSettingsStore();
  const isConsensusMode = mode === 'consensus' || mode === 'moa';

  // Core Hooks
  const chatMutation = useChatMutation();
  const { isPending: isLoading } = chatMutation;
  const queryClient = useQueryClient();
  const rag = useKnowledgeBase();
  const userLibrary = useUserLibrary();

  const {
    messages,
    setMessages,
    sessions,
    sessionId,
    setSessionId,
    newChat,
    switchSession,
    removeSession,
    removeSessions,
    fetchSessions,
    messagesLoaded
  } = useSharedChat();

  // Component State
  const [attachments, setAttachments] = useState<QueuedAttachment[]>([]);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryMode, setLibraryMode] = useState<'all' | 'documents' | 'images'>('all');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content?: string } | null>(null);
  const [actTerms, setActTerms] = useState<string[]>([]);
  const [isActSelectorOpen, setIsActSelectorOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  
  // Refs
  const processingQueue = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoadAfterSwitch = useRef(true);
  const activeOCRCount = useRef(0);
  const ocrQueue = useRef<Array<{id: string, file: File}>>([]);
  const ocrAbortControllers = useRef<Map<string, AbortController>>(new Map());
  const activeAssistantIdRef = useRef<string>("");
  const scrollRafRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
  }, []);

  // Effects
  useEffect(() => {
    isFirstLoadAfterSwitch.current = true;
  }, [sessionId]);
  
  // Cleanup OCR controllers on unmount
  useEffect(() => {
    const controllers = ocrAbortControllers.current;
    return () => {
      controllers.forEach(controller => controller.abort());
      controllers.clear();
    };
  }, []);

  // Scroll after session/messages load (not on every streaming chunk)
  useEffect(() => {
    if (!messagesLoaded) {
      console.log("[CHAT] Messages still loading...");
      return;
    }

    const timeoutId = setTimeout(() => {
      performance.mark("chat-messages-loaded");
      if (import.meta.env.DEV) {
        console.log("[CHAT] Messages loaded at:", performance.now().toFixed(2));
      }

      const behavior = isFirstLoadAfterSwitch.current ? "auto" : "smooth";
      scrollToBottom(behavior);

      if (isFirstLoadAfterSwitch.current) {
        isFirstLoadAfterSwitch.current = false;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messagesLoaded, messages.length, sessionId, scrollToBottom]);

  // Throttled scroll while assistant is streaming (avoids DOM thrash + log spam)
  const lastMessageContent = messages.length > 0 ? messages[messages.length - 1]?.content : undefined;

  useEffect(() => {
    if (!messagesLoaded || !isLoading) return;

    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      scrollToBottom("auto");
    });

    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [messagesLoaded, isLoading, lastMessageContent, scrollToBottom]);

  const startOCRProcessing = useCallback(async (id: string, file: File) => {
    if (processingQueue.current.has(id)) return;
    processingQueue.current.add(id);
    
    // Create abort controller for this OCR task
    const abortController = new AbortController();
    ocrAbortControllers.current.set(id, abortController);
    const signal = abortController.signal;

    try {
      // Phase 1: Uploading
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'uploading', progress: 10 } : a));
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/documents/upload-document`, {
        method: 'POST',
        body: formData,
        signal: signal // Use the signal to allow cancellation
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Błąd serwera (${response.status}): ${errorText.substring(0, 100)}`);
      }
      
      // Phase 2: Processing (OCR)
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'processing', progress: 50 } : a));
      
      const data = await response.json();
      
      if (data.success) {
        setAttachments(prev => prev.map(a => a.id === id ? { 
          ...a, 
          status: 'ready', 
          progress: 100, 
          extractedText: data.extracted_text 
        } : a));
        
        // NOWOŚĆ: Inwalidacja biblioteki użytkownika, aby nowy plik pojawił się w wynikach
        queryClient.invalidateQueries({ queryKey: ["user_library"] });
      } else {
        throw new Error(data.error || 'Błąd przetwarzania dokumentu (pusty wynik)');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas dodawania pliku';
      console.error("Upload/OCR Error:", err);
      setAttachments(prev => prev.map(a => a.id === id ? { 
        ...a, 
        status: 'error', 
        progress: 0, 
        error: errorMessage 
      } : a));
    } finally {
      processingQueue.current.delete(id);
    }
  }, [queryClient]);

  // Actions
  const handleSend = async (message?: string) => {
    if (chatMutation.isPending) {
      chatMutation.stopGeneration();
      return;
    }

    const messageContent = message?.trim() || "";

    const isAnyProcessing = attachments.some(a => 
      ['waiting', 'uploading'].includes(a.status) || 
      (a.status === 'processing' && !a.file.type.startsWith('image/'))
    );
    if (isAnyProcessing) {
      setAttachmentWarning("Poczekaj na zakończenie przetwarzania dokumentów...");
      return;
    }

    if (!messageContent && attachments.length === 0) return;

    // Aggregate extracted texts for the backend
    const combinedDocText = attachments
      .filter(a => a.status === 'ready' && a.extractedText)
      .map((a, idx) => `--- STRONA ${idx + 1} (Plik: ${a.file.name}) ---\n${a.extractedText}`)
      .join("\n\n");

    // Convert images to base64 for vision models
    const attachmentData: Attachment[] = [];
    if (attachments.length > 0) {
      for (const a of attachments) {
        if (a.file.type.startsWith("image/")) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(a.file);
          });
          attachmentData.push({
            name: a.file.name,
            type: a.file.type,
            content: base64,
          });
        }
      }
    }

    // Add user message locally
    const userMsg: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: messageContent,
      attachments: attachmentData,
      created_at: new Date().toISOString(),
    };

    // Add temporary assistant message for streaming
    const assistantMsgId = "assistant-" + Date.now();
    activeAssistantIdRef.current = assistantMsgId;
    const tempAssistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      consensus_used: isConsensusMode,
      pipeline_log: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev: ChatMessage[]) => [...prev, userMsg as ChatMessage, tempAssistantMsg as ChatMessage]);
    setAttachments([]);
    setCurrentStatus("Inicjalizacja potoku analizy prawnej...");

    const updateAssistantMessage = (updater: (msg: ChatMessage) => ChatMessage) => {
      const targetId = activeAssistantIdRef.current;
      setMessages((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === targetId ? updater(msg) : msg)),
      );
    };

    chatMutation.mutate({
      message: messageContent,
      history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      sessionId: sessionId || undefined,
      attachments: attachmentData,
      document_text: combinedDocText,
      use_saos: useSaos,
      use_eli: useEli,
      use_rag_legal: useRagLegal,
      use_rag_user: useRagUser,
      act_terms: actTerms.length > 0 ? actTerms : undefined,
      onChunk: (chunk) => {
        updateAssistantMessage((msg) => ({ ...msg, content: msg.content + chunk }));
      },
      onMetadata: (meta: ChatMetadata) => {
        const statusMessage = typeof meta.message === "string" ? meta.message : "";
        if (statusMessage) {
          setCurrentStatus(statusMessage);
          updateAssistantMessage((msg) => {
            const log = msg.pipeline_log ?? [];
            if (log[log.length - 1] === statusMessage) return msg;
            return { ...msg, pipeline_log: [...log, statusMessage] };
          });
        }
        if (meta.expert_analyses) {
          updateAssistantMessage((msg) => ({
            ...msg,
            expert_analyses: (meta.expert_analyses as ExpertAnalysis[]) || msg.expert_analyses || [],
            consensus_used: isConsensusMode,
          }));
        }
        if (typeof meta.eli_explanation === "string" && meta.eli_explanation) {
          updateAssistantMessage((msg) => ({
            ...msg,
            eli_explanation: meta.eli_explanation as string,
          }));
        }
        if (meta.investigation_summary && typeof meta.investigation_summary === "object") {
          updateAssistantMessage((msg) => ({
            ...msg,
            investigation_summary: meta.investigation_summary as ChatMessage["investigation_summary"],
          }));
        }
        if (Array.isArray(meta.claim_scores) && meta.claim_scores.length > 0) {
          updateAssistantMessage((msg) => ({
            ...msg,
            claim_scores: meta.claim_scores as ChatMessage["claim_scores"],
          }));
        }
      }
    }, {
      onSuccess: (data) => {
        setCurrentStatus("");
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("prawnik_session_id", data.sessionId);
        }
        if (data.id) {
          activeAssistantIdRef.current = data.id;
        }
        updateAssistantMessage((msg) => ({
          ...msg,
          id: data.id || msg.id,
          content: data.content || msg.content,
          sources: data.sources || [],
          consensus_used: isConsensusMode,
          expert_analyses: data.expert_analyses || msg.expert_analyses || [],
          eli_explanation: data.eli_explanation || msg.eli_explanation,
          urgency_alerts: data.urgency_alerts,
          timeline: data.timeline as ChatMessage["timeline"],
          gaps: data.gaps,
          inconsistencies: data.inconsistencies,
          coi_conflicts: data.coi_conflicts,
          p_sukces: data.p_sukces,
          confidence_score: data.confidence_score,
          hitl_escalated: data.hitl_escalated,
          synthesis_blocked: data.synthesis_blocked,
          hallucinated_cites: data.hallucinated_cites,
          claim_scores: data.claim_scores ?? msg.claim_scores,
          investigation_summary: data.investigation_summary ?? msg.investigation_summary,
        }));

        fetchSessions();
      },
      onError: (error: Error) => {
        setCurrentStatus("");
        updateAssistantMessage((msg) => ({
          ...msg,
          content: `❌ Błąd: ${error.message}`,
        }));
      }
    });
  };

  const processNextInQueue = useCallback(async () => {
    if (activeOCRCount.current >= 5 || ocrQueue.current.length === 0) return;

    const next = ocrQueue.current.shift();
    if (!next) return;

    activeOCRCount.current++;
    try {
      // Add timeout for OCR processing to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OCR Processing timed out after 300 seconds (Lokalny silnik OCR pracuje wolniej, spróbuj mniejszego pliku lub odczekaj)')), 300000);
      });
      
      await Promise.race([startOCRProcessing(next.id, next.file), timeoutPromise]);
    } catch (err) {
      console.error('OCR Queue processing error:', err);
      // Mark attachment as error even if not handled in startOCRProcessing
      setAttachments(prev => prev.map(a => 
        a.id === next.id ? { ...a, status: 'error', error: err instanceof Error ? err.message : 'Processing failed' } : a
      ));
    } finally {
      activeOCRCount.current--;
      // Schedule next with small delay to prevent stack overflow
      setTimeout(() => processNextInQueue(), 0);
    }
  }, [startOCRProcessing]);

  const addAttachment = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setAttachmentWarning(null);

    // Obsługiwane typy: Obrazy oraz Dokumenty (PDF, DOCX, TXT)
    const validFiles = files.filter(file => {
      const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif', 'image/tiff', 'image/webp',
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp', '.pdf', '.docx', '.txt'];
      
      const isValidByType = validTypes.includes(file.type);
      const isValidByExtension = validExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      
      return isValidByType || isValidByExtension;
    });
    
    const validSizeFiles = validFiles.filter(file => file.size <= 15 * 1024 * 1024);
    
    if (validSizeFiles.length !== validFiles.length) {
      setAttachmentWarning('Niektóre pliki zostały odrzucone - przekroczenie rozmiaru 15MB');
    }
    
    if (validSizeFiles.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setAttachmentWarning(`Osiągnięto limit ${MAX_ATTACHMENTS} załączników`);
      return;
    }

    const filesToAdd = validSizeFiles.slice(0, remainingSlots);
    const newAttachments: QueuedAttachment[] = filesToAdd.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'waiting',
      progress: 0
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    // Add to internal queue and start processing
    ocrQueue.current.push(...newAttachments.map(a => ({ id: a.id, file: a.file })));
    
    // Start processing queue (sequential)
    processNextInQueue();
  }, [attachments.length, processNextInQueue]);

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const getActivePhaseIndex = useCallback(() => {
    const status = currentStatus.toLowerCase();
    if (status.includes("konsylium") || status.includes("ekspert")) {
      return 1; // Zespół Ekspertów
    }
    if (status.includes("sędzia") || status.includes("werdykt") || status.includes("wyjaśnienie") || status.includes("eli5") || status.includes("synteza")) {
      return 2; // Synteza Końcowa
    }
    return 0; // Baza Danych
  }, [currentStatus]);

  useEffect(() => {
    if (!attachmentWarning) return;
    const timer = setTimeout(() => setAttachmentWarning(null), 4000);
    return () => clearTimeout(timer);
  }, [attachmentWarning]);

  const activeSessionTitle = useMemo(() => {
    const current = sessions.find((s) => s.id === sessionId);
    return current?.title?.trim() || "Nowa konsultacja";
  }, [sessions, sessionId]);

  const showChatThreadHeader = messagesLoaded && messages.length > 0;

  return (
    <div className="h-full flex relative overflow-hidden bg-transparent min-w-0 min-h-0">
      <ChatSidebar 
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        sessions={sessions}
        sessionId={sessionId}
        switchSession={switchSession}
        removeSession={removeSession}
        removeSessions={removeSessions}
        newChat={newChat}
      />

      <div className={CHAT_MAIN_STAGE}>
        {!showHistory && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowHistory(true)}
            className="absolute left-0 lg:left-1 top-[42%] -translate-y-1/2 z-30 p-3 lg:p-3.5 glass-prestige-platinum rounded-full text-white/50 hover:text-white hover:scale-110 transition-all shadow-xl group/hist"
            title="Pokaż Historię"
          >
            <LexIcon name="history" size={20} className="group-hover/hist:rotate-12 transition-transform" />
          </motion.button>
        )}

        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              "absolute right-0 lg:right-1 top-[42%] -translate-y-1/2 z-30 p-3 lg:p-3.5 rounded-full transition-all shadow-xl border flex items-center justify-center group/config",
              isConsensusMode
                ? "glass-liquid-convex border-gold-primary/35 text-black shadow-[0_0_20px_rgba(212,175,55,0.2)] scale-105"
                : "glass-prestige-platinum border-black/5 text-white/45 hover:text-white hover:scale-110",
            )}
            title={isConsensusMode ? "Skonfiguruj Konsylium" : "Wybierz Model"}
          >
            {isConsensusMode ? (
              <LexIcon name="chat" size={20} className="group-hover/config:rotate-12 transition-transform text-gold-deep" />
            ) : (
              <LexIcon name="ai" size={20} className="group-hover/config:rotate-12 transition-transform" />
            )}
          </motion.button>
        )}

        <div ref={scrollRef} className={CHAT_MESSAGES_SURFACE}>
          <div className={CHAT_MESSAGES_INNER}>
            {showChatThreadHeader && (
              <div className="sticky top-0 z-10 -mt-1 mb-2 pb-2 bg-gradient-to-b from-white via-white/95 to-transparent">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl glass-prestige border border-black/[0.06] shadow-sm">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gold-primary/10 border border-gold-primary/25 flex items-center justify-center shrink-0">
                      <LexIcon name="chat" size={15} />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black truncate font-outfit">
                        {activeSessionTitle}
                      </p>
                      <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest mt-0.5">
                        {isConsensusMode ? "Tryb konsylium MOA" : "Konsultacja indywidualna"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/35 shrink-0 tabular-nums">
                    {messages.length} {messages.length === 1 ? "wpis" : "wpisów"}
                  </span>
                </div>
              </div>
            )}

            {!messagesLoaded ? (
              <div className="flex flex-col items-center justify-center min-h-[min(100%,20rem)] gap-4">
                <div className="w-14 h-14 rounded-2xl glass-prestige animate-pulse flex items-center justify-center border border-gold-primary/20">
                  <LexIcon name="history" size={26} className="text-gold-primary/70" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-500 font-outfit">
                  Ładowanie archiwum…
                </p>
                <div className="w-48 h-1 rounded-full bg-stone-200 overflow-hidden">
                  <motion.div
                    className="h-full bg-gold-primary/60 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "70%" }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <WelcomeView onNavigate={goToTab} />
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={m.id ?? `msg-${i}`} className="message-bubble-row w-full">
                    <MessageBubble
                      msg={m as Message}
                      onPreviewDoc={(name, content) => setPreviewDoc({ name, content })}
                    />
                  </div>
                ))}
              </>
            )}

          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 w-full p-4 rounded-2xl glass-prestige border border-gold-primary/15 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border border-gold-primary/25 bg-gold-primary/10 relative overflow-hidden">
                <LexIcon name="chat" size={17} className="relative z-10 animate-pulse text-gold-deep" />
              </div>
              
              <div className="relative overflow-hidden flex-1 min-w-0">
                
                {isConsensusMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] italic flex items-center gap-2">
                         <LexIcon name="chat" size={12} className="animate-pulse" />
                         Konsylium Prawne MOA — Proces Myślowy...
                      </p>
                      <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest hidden sm:block">Legal Reasoning Pipeline</span>
                    </div>

                    {currentStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[11px] font-semibold text-gold-primary/95 flex items-center gap-2 pl-3 py-2 border-l border-gold-primary/30 bg-gold-primary/5 rounded-r-lg font-outfit"
                      >
                        <Loader2 className="w-3.5 h-3.5 text-gold-primary animate-spin shrink-0" />
                        <span>{currentStatus}</span>
                      </motion.div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      {/* Detailed Phases */}
                      {[
                        { label: "Baza Danych" },
                        { label: "Zespół Ekspertów" },
                        { label: "Synteza Końcowa" }
                      ].map((phase, idx) => {
                        const activeIdx = getActivePhaseIndex();
                        const isActive = activeIdx === idx;
                        const isCompleted = activeIdx > idx;
                        return (
                          <div key={idx} className="flex items-center gap-2 sm:gap-3">
                             <div className={cn(
                               "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300",
                               isActive 
                                 ? "bg-gold-primary/10 border-gold-primary/40 shadow-[0_0_12px_rgba(212,175,55,0.15)] scale-[1.03]"
                                 : isCompleted
                                   ? "bg-gold-primary/5 border-gold-primary/20 opacity-90"
                                   : "bg-stone-100 border-stone-200 opacity-40"
                             )}>
                               <div className={cn(
                                 "w-1 h-1 rounded-full transition-all duration-300",
                                 isActive 
                                   ? "bg-gold-primary animate-pulse" 
                                   : isCompleted 
                                     ? "bg-gold-primary" 
                                     : "bg-stone-300"
                               )} />
                               <span className={cn(
                                 "text-[8px] font-black uppercase tracking-wider transition-colors duration-300",
                                 isActive 
                                   ? "text-gold-primary" 
                                   : isCompleted 
                                     ? "text-gold-primary/70" 
                                     : "text-stone-400"
                               )}>
                                 {phase.label}
                               </span>
                             </div>
                             {idx < 2 && <div className={cn("hidden sm:block w-4 h-px transition-colors duration-300", isCompleted ? "bg-gold-primary/30" : "bg-stone-200")} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse" />
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] italic">
                        Generowanie strategii procesowej...
                      </p>
                    </div>

                    {currentStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[11px] font-semibold text-gold-primary/95 flex items-center gap-2 pl-3 py-2 border-l border-gold-primary/30 bg-gold-primary/5 rounded-r-lg font-outfit"
                      >
                        <Loader2 className="w-3.5 h-3.5 text-gold-primary animate-spin shrink-0" />
                        <span>{currentStatus}</span>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                       <div className="bg-stone-200/60 animate-pulse h-2.5 rounded-md w-[75%]" />
                       <div className="bg-stone-200/60 animate-pulse h-2.5 rounded-md w-[55%]" />
                       <div className="bg-stone-200/60 animate-pulse h-2.5 rounded-md w-[40%]" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          </div>

          {/* MODAL WYBORU AKTÓW */}
          <AnimatePresence>
            {isActSelectorOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                onClick={() => setIsActSelectorOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-xl bg-[#090b0f] border border-white/8 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                  style={{ maxHeight: '85vh' }}
                >
                  <div className="p-5 border-b border-white/8 flex items-center justify-between bg-white/1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gold-primary/10 flex items-center justify-center border border-gold-primary/20">
                        <LexIcon name="scale" size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">Zakres wyszukiwania RAG</h3>
                        <p className="text-[11px] text-white/40 mt-0.5">Wybierz konkretne dokumenty prawne lub własne pliki do przeszukania.</p>
                      </div>
                    </div>
                    <button onClick={() => setIsActSelectorOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {(() => {
                      // Helper do czyszczenia nazw plików na przyjazne dla użytkownika
                      const getCleanName = (name: string) => {
                        if (!name) return "";
                        let clean = name.replace(/\.pdf$/i, "").replace(/\.txt$/i, "").replace(/\.md$/i, "").replace(/\.docx$/i, "");
                        
                        const lower = clean.toLowerCase();
                        if (lower.includes("postpowania karnego") || lower.includes("postepowania karnego")) {
                          return "Kodeks Postępowania Karnego";
                        }
                        if (lower.includes("postepowania cywilnego") || lower.includes("postępowania cywilnego")) {
                          return "Kodeks Postępowania Cywilnego";
                        }
                        if (lower.includes("cywilny")) return "Kodeks Cywilny";
                        if (lower.includes("karny") && !lower.includes("skarbowy") && !lower.includes("wykonawczy")) return "Kodeks Karny";
                        if (lower.includes("pracy")) return "Kodeks Pracy";
                        if (lower.includes("spolek handlowych") || lower.includes("spółek handlowych")) return "Kodeks Spółek Handlowych";
                        if (lower.includes("wyborczy")) return "Kodeks Wyborczy";
                        if (lower.includes("skarbowy")) return "Kodeks Karny Skarbowy";
                        if (lower.includes("administracyjnego")) return "Kodeks Postępowania Administracyjnego";
                        if (lower.includes("wykroczenia")) return "Kodeks Postępowania w Sprawach o Wykroczenia";
                        if (lower.includes("ruchu drogowym") || lower.includes("ruch drogowym")) return "Prawo o Ruchu Drogowym";
                        if (lower.includes("morski")) return "Kodeks Morski";
                        
                        return clean
                          .split(/[\s_-]+/)
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ");
                      };

                      const legalDocs = (rag.documents || []).map((d: any) => d.name).filter(Boolean);
                      const userDocs = (userLibrary.documents || []).map((d: any) => d.title).filter(Boolean);

                      // Filtrujemy duplikaty
                      const uniqueLegalDocs = Array.from(new Set(legalDocs));
                      const uniqueUserDocs = Array.from(new Set(userDocs));

                      return (
                        <div className="space-y-6">
                          {/* SEKCJA 1: BAZA PRAWNA (KODEKSY GLOBALNE) */}
                          <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                              <div className="flex items-center gap-2">
                                <LexIcon name="database" size={14} className="opacity-80" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gold-primary opacity-90">Oficjalna Baza Prawna ({uniqueLegalDocs.length})</h4>
                              </div>
                              {uniqueLegalDocs.length > 0 && (
                                <div className="flex gap-2 text-[9px] font-bold uppercase tracking-wider text-white/40">
                                  <button 
                                    onClick={() => {
                                      const allSelected = uniqueLegalDocs.every(d => actTerms.includes(d));
                                      if (allSelected) {
                                        setActTerms(actTerms.filter(t => !uniqueLegalDocs.includes(t)));
                                      } else {
                                        const newTerms = Array.from(new Set([...actTerms, ...uniqueLegalDocs]));
                                        setActTerms(newTerms);
                                      }
                                    }}
                                    className="hover:text-gold-primary transition-colors"
                                  >
                                    {uniqueLegalDocs.every(d => actTerms.includes(d)) ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                                  </button>
                                </div>
                              )}
                            </div>

                            {uniqueLegalDocs.length === 0 ? (
                              <div className="text-center py-4 border border-dashed border-white/5 rounded-xl bg-white/1">
                                <p className="text-[11px] text-white/30">Brak dokumentów w oficjalnej bazie prawnej.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {uniqueLegalDocs.map((docName) => {
                                  const isSelected = actTerms.includes(docName);
                                  const cleanName = getCleanName(docName);
                                  return (
                                    <button
                                      key={docName}
                                      onClick={() => {
                                        if (isSelected) {
                                          setActTerms(actTerms.filter(a => a !== docName));
                                        } else {
                                          setActTerms([...actTerms, docName]);
                                        }
                                      }}
                                      className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl transition-all text-left border relative overflow-hidden group",
                                        isSelected 
                                          ? "bg-gold-primary/10 border-gold-primary/30 text-white shadow-[0_0_15px_rgba(212,175,55,0.05)]" 
                                          : "bg-white/2 border-white/5 text-white/60 hover:bg-white/5 hover:border-white/10 hover:text-white"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
                                        isSelected ? "bg-gold-primary border-gold-primary text-black" : "border-white/20 bg-black/20 group-hover:border-white/40"
                                      )}>
                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-black fill-current" />}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold leading-snug truncate">{cleanName}</span>
                                        <span className="text-[9px] text-white/30 truncate mt-0.5">{docName}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* SEKCJA 2: TWOJE DOKUMENTY (PLIKI UŻYTKOWNIKA) */}
                          <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                              <div className="flex items-center gap-2">
                                <LexIcon name="file" size={14} className="opacity-80" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 opacity-90">Twoje Wgrane Dokumenty ({uniqueUserDocs.length})</h4>
                              </div>
                              {uniqueUserDocs.length > 0 && (
                                <div className="flex gap-2 text-[9px] font-bold uppercase tracking-wider text-white/40">
                                  <button 
                                    onClick={() => {
                                      const allSelected = uniqueUserDocs.every(d => actTerms.includes(d));
                                      if (allSelected) {
                                        setActTerms(actTerms.filter(t => !uniqueUserDocs.includes(t)));
                                      } else {
                                        const newTerms = Array.from(new Set([...actTerms, ...uniqueUserDocs]));
                                        setActTerms(newTerms);
                                      }
                                    }}
                                    className="hover:text-blue-400 transition-colors"
                                  >
                                    {uniqueUserDocs.every(d => actTerms.includes(d)) ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                                  </button>
                                </div>
                              )}
                            </div>

                            {uniqueUserDocs.length === 0 ? (
                              <div className="text-center py-6 border border-dashed border-white/5 rounded-xl bg-white/1 px-4">
                                <p className="text-[11px] text-white/45">Brak własnych dokumentów.</p>
                                <p className="text-[10px] text-white/25 mt-1">Przejdź do zakładki Biblioteka / Pliki na pasku bocznym, aby dodać własne umowy, pisma lub skany i móc przeszukiwać je za pomocą RAG.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {uniqueUserDocs.map((docName) => {
                                  const isSelected = actTerms.includes(docName);
                                  const cleanName = getCleanName(docName);
                                  return (
                                    <button
                                      key={docName}
                                      onClick={() => {
                                        if (isSelected) {
                                          setActTerms(actTerms.filter(a => a !== docName));
                                        } else {
                                          setActTerms([...actTerms, docName]);
                                        }
                                      }}
                                      className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl transition-all text-left border relative overflow-hidden group",
                                        isSelected 
                                          ? "bg-blue-500/10 border-blue-500/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.05)]" 
                                          : "bg-white/2 border-white/5 text-white/60 hover:bg-white/5 hover:border-white/10 hover:text-white"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
                                        isSelected ? "bg-blue-500 border-blue-500 text-black" : "border-white/20 bg-black/20 group-hover:border-white/40"
                                      )}>
                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-black fill-current" />}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold leading-snug truncate">{cleanName}</span>
                                        <span className="text-[9px] text-white/30 truncate mt-0.5">{docName}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="p-4 border-t border-white/8 bg-white/1 flex items-center justify-between">
                    <button 
                      onClick={() => setActTerms([])}
                      className="text-[11px] text-white/40 hover:text-white transition-colors px-3 py-2"
                    >
                      Wyczyść wszystko
                    </button>
                    <button 
                      onClick={() => setIsActSelectorOpen(false)}
                      className="bg-gold-primary text-black font-bold text-[11px] px-6 py-2.5 rounded-xl hover:bg-gold-primary/90 transition-all border border-gold-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                    >
                      Zastosuj filtr ({actTerms.length})
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={CHAT_INPUT_DOCK}>
          <div className={CHAT_INPUT_DOCK_INNER}>
            <div className="flex flex-row items-center justify-center gap-2 sm:gap-2.5 px-1 mb-2 overflow-x-auto no-scrollbar">
              <FeatureCard icon={<LexIcon name="shield" size={14} className="opacity-80 text-black" />} title="Prywatność" bgColor="glass-prestige" textColor="text-black" />
              <FeatureCard icon={<LexIcon name="judgments" size={14} className="opacity-80 text-black" />} title="Precyzja" bgColor="glass-prestige" textColor="text-black" />
              <FeatureCard icon={<LexIcon name="chat" size={14} className="text-black" />} title="Szybkość" bgColor="glass-prestige-platinum" textColor="text-black" />
            </div>

            <ChatInput 
                  isLoading={chatMutation.isPending}
                  attachments={attachments}
                  addAttachment={addAttachment}
                  removeAttachment={removeAttachment}
                  onSend={handleSend}
                  stopGeneration={chatMutation.stopGeneration}
                  newChat={newChat}
                  imageInputRef={imageInputRef}
                  attachmentWarning={attachmentWarning}
                  useRagLegal={useRagLegal}
                  setUseRagLegal={setUseRagLegal}
                  useRagUser={useRagUser}
                  setUseRagUser={setUseRagUser}
                  actTerms={actTerms}
                  setActTerms={setActTerms}
                  setIsActSelectorOpen={setIsActSelectorOpen}
                  useSaos={useSaos}
                  setUseSaos={setUseSaos}
                  useEli={useEli}
                  setUseEli={setUseEli}
                  onOpenLibrary={(mode) => {
                    setLibraryMode(mode);
                    setIsLibraryOpen(true);
                  }}
                  onPreviewDoc={(att) => setPreviewDoc({ name: att.file.name, content: att.extractedText })}
               />

              {/* Archetypal File Controllers - Hidden but Essential */}
              {/* Jeden uniwersalny input - obsługuje obrazy + dokumenty (PDF, DOCX, TXT) */}
              <input 
                type="file" 
                multiple 
                ref={imageInputRef} 
                onChange={addAttachment} 
                className="hidden" 
                accept="image/*,.pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" 
              />
              {/* fileInputRef zachowany dla kompatybilności - przekierowany do głównego inputu */}
              <input type="file" multiple ref={fileInputRef} onChange={addAttachment} className="hidden" accept=".pdf,.doc,.docx,.txt" />

            <div className="flex justify-center items-center mt-2 pt-1 border-t border-black/[0.04]">
              <div className="flex items-center gap-2 group/verify cursor-default opacity-75 hover:opacity-100 transition-opacity">
                <div className="h-1 w-1 rounded-full bg-gold-primary shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                <p className="text-[7px] text-gold-primary font-black uppercase tracking-widest italic group-hover/verify:text-gold-bright transition-colors font-outfit">
                  Zweryfikowane przez węzeł LexMind Core Legal Network
                </p>
              </div>
            </div>
          </div>

          <LibrarySelectionModal 
            isOpen={isLibraryOpen}
            mode={libraryMode}
            onClose={() => setIsLibraryOpen(false)}
            onSelect={(docs) => {
              // 1. Przygotuj wszystkie nowe załączniki naraz
              const now = Date.now();
              const newItems: QueuedAttachment[] = docs.map((doc, idx) => {
                const id = `lib-${doc.id}-${now}-${idx}`;
                return {
                  id,
                  file: new File([], doc.name),
                  status: 'processing',
                  progress: 50,
                  previewUrl: undefined,
                  extractedText: ''
                };
              });

              // 2. Dodaj wszystkie do stanu jednym wywołaniem
              setAttachments(prev => [...prev, ...newItems]);

              // 3. Rozpocznij pobieranie treści dla każdego (równolegle)
              newItems.forEach(async (item, idx) => {
                const doc = docs[idx];
                try {
                  const res = await fetch(`${API_BASE}/documents/content/${encodeURIComponent(doc.name)}`);
                  const data = await res.json();
                  if (data.success) {
                    setAttachments(prev => prev.map(a => a.id === item.id ? { 
                      ...a, 
                      status: 'ready', 
                      progress: 100, 
                      extractedText: data.content 
                    } : a));
                  } else {
                    setAttachments(prev => prev.map(a => a.id === item.id ? { ...a, status: 'error', error: data.error } : a));
                  }
                } catch {
                  setAttachments(prev => prev.map(a => a.id === item.id ? { ...a, status: 'error', error: 'Błąd pobierania' } : a));
                }
              });

              setIsLibraryOpen(false);
              // RAG bazy użytkownika wyłączony przy generowaniu odpowiedzi (tylko załącznik w bieżącym czacie)
            }}
          />

          {/* Global Preview Overlay for Chat */}
          <AnimatePresence>
            {previewDoc && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-[var(--app-mobile-header-offset)] lg:top-0 bottom-0 right-0 w-full lg:w-80 2xl:w-[28rem] max-w-[100vw] glass-steel-monolith z-999999 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.8)]"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gold-primary/10 flex items-center justify-center border border-gold-primary/20">
                      <LexIcon name="documents" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                         <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Opina Eksperta AI</h3>
                         <button 
                           onClick={() => setPreviewDoc(null)} 
                           className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/50 pointer-events-auto shadow-lg"
                         >
                           <X size={16} strokeWidth={3} />
                           <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Zamknij</span>
                         </button>
                      </div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">Podgląd pełnej analizy</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-8 lg:p-10">
                   <h4 className="text-lg font-black text-gold-primary uppercase tracking-tight mb-6 leading-tight border-b border-white/10 pb-4">{previewDoc.name}</h4>
                   <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed font-outfit whitespace-pre-wrap">
                      {previewDoc.content || (
                        <div className="italic opacity-40 py-20 text-center text-white/60">
                           Treść dokumentu jest ładowana z bazy wiedzy... <br/>Możesz go użyć w rozmowie do pełnej analizy.
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ marginRight: -320, opacity: 0 }}
            animate={{ marginRight: 0, opacity: 1 }}
            exit={{ marginRight: -320, opacity: 0 }}
            transition={{ 
              type: "tween",
              duration: 0.35,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="z-50 shrink-0"
          >
            <QuickIntelligencePanel />
          </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
});
