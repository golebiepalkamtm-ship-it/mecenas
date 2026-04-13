import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Cpu, Network, Shield, Target, Zap, FileSearch, X } from "lucide-react";

const MAX_ATTACHMENTS = 20;

// Context & Hooks
import { useSharedChat } from "../../context/useSharedChat";
import { useChatSettingsStore } from "../../store/useChatSettingsStore";
import { useChatMutation } from "../../hooks/useChatMutation";
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

export interface ChatViewProps {
  onNavigate?: (tab: Tab) => void;
}

export function ChatView({ onNavigate }: ChatViewProps = {}) {
  // Navigation helper
  const goToTab = useCallback((tab: Tab) => {
    onNavigate?.(tab);
  }, [onNavigate]);

  const {
    messages,
    setMessages,
    stopGeneration,
    sessions,
    sessionId,
    setSessionId,
    newChat,
    switchSession,
    removeSession,
    fetchSessions,
    messagesLoaded
  } = useSharedChat();

  // Zustand Store
  const { mode, isOpen, setIsOpen, showHistory, setShowHistory } = useChatSettingsStore();
  const isConsensusMode = mode === 'consensus' || mode === 'moa';

  const chatMutation = useChatMutation();

  // Component State
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<QueuedAttachment[]>([]);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryMode, setLibraryMode] = useState<'all' | 'documents' | 'images'>('all');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content?: string } | null>(null);
  const [useRag, setUseRag] = useState(true);
  const [dismissedExpertPanelMsgId, setDismissedExpertPanelMsgId] = useState<string | null>(null);
  
  const processingQueue = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null); // Używany przez przycisk 📎 - akceptuje WSZYSTKIE typy

  const { isPending: isLoading } = chatMutation;

  const isFirstLoadAfterSwitch = useRef(true);

  useEffect(() => {
    isFirstLoadAfterSwitch.current = true;
  }, [sessionId]);

  useEffect(() => {
    if (!messagesLoaded) return;
    
    // Use 'auto' (instant) for the first scroll after loading a new session 
    // to prevent janky 'smooth' transitions over hundreds of messages
    const behavior = isFirstLoadAfterSwitch.current ? 'auto' : 'smooth';
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    
    if (isFirstLoadAfterSwitch.current) {
      isFirstLoadAfterSwitch.current = false;
    }
  }, [messages, isLoading, messagesLoaded]);

  const startOCRProcessing = async (id: string, file: File) => {
    if (processingQueue.current.has(id)) return;
    processingQueue.current.add(id);

    try {
      // Phase 1: Uploading
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'uploading', progress: 10 } : a));
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/documents/upload-document`, {
        method: 'POST',
        body: formData,
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
      } else {
        throw new Error(data.error || 'Błąd przetwarzania dokumentu (pusty wynik)');
      }
    } catch (err: unknown) {
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
  };

  // Actions
  const handleSend = async () => {
    if (chatMutation.isPending) {
      stopGeneration();
      return;
    }

    const isAnyProcessing = attachments.some(a => ['waiting', 'uploading', 'processing'].includes(a.status));
    if (isAnyProcessing) {
      setAttachmentWarning("Poczekaj na zakończenie przetwarzania dokumentów...");
      return;
    }

    if (!input.trim() && attachments.length === 0) return;

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
      content: input,
      attachments: attachmentData,
      created_at: new Date().toISOString(),
    };
    setMessages((prev: ChatMessage[]) => [...prev, userMsg as ChatMessage]);
    
    const currentInput = input;
    setInput("");
    setAttachments([]);

    chatMutation.mutate({
      message: currentInput,
      history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      sessionId: sessionId || undefined,
      attachments: attachmentData,
      document_text: combinedDocText
    }, {
      onSuccess: (data) => {
        const assistantMsg: Message = {
          id: data.id,
          role: "assistant",
          content: data.content,
          sources: data.sources || [],
          consensus_used: isConsensusMode,
          expert_analyses: data.expert_analyses || [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev: ChatMessage[]) => [...prev, assistantMsg as ChatMessage]);
        
        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("prawnik_session_id", data.sessionId);
        }
        
        fetchSessions();
      },
      onError: (error: Error) => {
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `❌ Błąd: ${error.message}`,
          }
        ]);
      }
    });
  };

  const activeOCRCount = useRef(0);
  const ocrQueue = useRef<Array<{id: string, file: File}>>([]);

  const processNextInQueue = useCallback(async () => {
    if (activeOCRCount.current >= 1 || ocrQueue.current.length === 0) return;

    const next = ocrQueue.current.shift();
    if (!next) return;

    activeOCRCount.current++;
    try {
      await startOCRProcessing(next.id, next.file);
    } finally {
      activeOCRCount.current--;
      processNextInQueue(); // Pick up next
    }
  }, []);

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

  useEffect(() => {
    if (!attachmentWarning) return;
    const timer = setTimeout(() => setAttachmentWarning(null), 4000);
    return () => clearTimeout(timer);
  }, [attachmentWarning]);

  return (
    <div className="h-full flex relative overflow-visible bg-transparent">
      <ChatSidebar 
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        sessions={sessions}
        sessionId={sessionId}
        switchSession={switchSession}
        removeSession={removeSession}
        newChat={newChat}
      />

      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {!showHistory && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowHistory(true)}
            className="absolute left-1 lg:left-2 top-1/2 -translate-y-1/2 z-30 p-3 lg:p-4 glass-prestige-platinum rounded-full text-black/40 hover:text-black hover:scale-110 transition-all shadow-xl group/hist"
            title="Pokaż Historię"
          >
            <History className="w-5 h-5 group-hover/hist:rotate-12 transition-transform" />
          </motion.button>
        )}

        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsOpen(true)}
            className={cn(
               "absolute right-1 lg:right-2 top-1/2 -translate-y-1/2 z-30 p-3 lg:p-4 rounded-full transition-all shadow-xl border flex items-center justify-center group/config",
               isConsensusMode 
                 ? "bg-white text-black border-black hover:bg-black/5 hover:text-black shadow-lg"
                 : "glass-prestige-platinum border-black/5 text-black/40 hover:text-black hover:scale-110"
            )}
            title={isConsensusMode ? "Skonfiguruj Konsylium" : "Wybierz Model"}
          >
            {isConsensusMode ? <Network className="w-5 h-5 group-hover/config:rotate-12 transition-transform" /> : <Cpu className="w-5 h-5 group-hover/config:rotate-12 transition-transform" />}
          </motion.button>
        )}

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 md:px-8 lg:px-12 xl:px-16 py-3 space-y-3 scroll-smooth custom-scrollbar"
        >
          {!messagesLoaded ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
              <div className="w-12 h-12 rounded-2xl glass-prestige animate-pulse flex items-center justify-center">
                <History className="w-6 h-6 text-gold-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ładowanie Archiwum...</p>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeView onNavigate={goToTab} />
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === messages.length - 1 ? 0 : 0.05 }}
                >
                  <MessageBubble 
                    msg={m as Message} 
                    onPreviewDoc={(name, content) => setPreviewDoc({ name, content })} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 max-w-[90%] pr-4"
            >
              <div className="w-10 h-10 rounded-2xl glass-prestige shrink-0 flex items-center justify-center border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 neural-orb opacity-40" />
                <Zap className="w-4 h-4 text-white/50 relative z-10" />
              </div>
              
              <div className="liquid-glass px-6 py-5 rounded-2xl relative overflow-hidden flex-1 border border-white/5 shadow-2xl">
                {/* Background Liquid Shimmer */}
                <div className="absolute inset-x-0 bottom-0 h-1 liquid-progress opacity-60" />
                
                {isConsensusMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic flex items-center gap-2">
                         <Network className="w-3 h-3 text-gold-primary animate-pulse" />
                         Konsylium Prawne MOA — Proces Myślowy...
                      </p>
                      <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest hidden sm:block">Legal Reasoning Pipeline</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      {/* Detailed Phases */}
                      {[
                        { label: "Baza Danych" },
                        { label: "Zespół Ekspertów" },
                        { label: "Synteza Końcowa" }
                      ].map((phase, idx) => (
                        <div key={idx} className="flex items-center gap-2 sm:gap-3">
                           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 glass-prestige">
                             <div className="w-1 h-1 rounded-full bg-gold-primary" />
                             <span className="text-[8px] font-black text-white/60 uppercase tracking-wider">{phase.label}</span>
                           </div>
                           {idx < 2 && <div className="hidden sm:block w-4 h-px bg-white/10" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold-primary" />
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] italic">
                        Generowanie strategii procesowej...
                      </p>
                    </div>
                    <div className="space-y-2">
                       <div className="skeleton-legal w-[75%]" />
                       <div className="skeleton-legal w-[55%]" />
                       <div className="skeleton-legal w-[40%]" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Active Consensus Summary Results (Shown if last message has experts) */}
        {!chatMutation.isPending && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].expert_analyses && messages[messages.length - 1].expert_analyses!.length > 0 && messages[messages.length - 1].id !== dismissedExpertPanelMsgId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 mb-4 px-4 max-w-[1400px] mx-auto"
          >
            <div className="glass-prestige-platinum rounded-3xl p-6 border-4 border-black shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gold-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center">
                    <History size={20} className="text-gold-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic">Opinie Pozostałych Ekspertów</h3>
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Niezależne Analizy Agentów AI</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-[9px] font-black text-gold-primary uppercase tracking-widest hidden sm:block">
                    {messages[messages.length - 1].expert_analyses?.length} Agentów Zsynchronizowanych
                  </div>
                  <button 
                    onClick={() => setDismissedExpertPanelMsgId(messages[messages.length - 1].id ?? null)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 border border-white/5 hover:border-red-500/30 transition-all hover:scale-110"
                    title="Zamknij panel ekspertów dla tej odpowiedzi"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-row overflow-x-auto gap-3 pb-2 no-scrollbar relative z-10">
                {messages[messages.length - 1].expert_analyses?.map((expert: ExpertAnalysis, idx: number) => {
                  const modelStr = String(expert.model || "");
                  const vendor = modelStr.split("/")[0]?.toUpperCase() || "AI";
                  const modelName = modelStr.split("/")[1] || modelStr;
                  return (
                    <div key={idx} className="min-w-[220px] max-w-[280px] p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-gold-primary/30 transition-all group/card shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[8px] font-black text-gold-primary uppercase tracking-widest opacity-60">{vendor}</span>
                        <div className={cn("w-2 h-2 rounded-full", expert.success !== false ? "bg-gold-primary shadow-[0_0_8px_rgba(var(--gold-rgb),0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
                      </div>
                      <p className="text-[11px] font-black text-white/80 mb-4 truncate italic font-outfit uppercase tracking-tighter">{modelName}</p>
                      <button 
                        onClick={() => setPreviewDoc({ name: `Analiza: ${modelName}`, content: String(expert.response || "") })}
                        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-gold-primary/10 text-[8px] font-black text-white/30 hover:text-gold-primary uppercase tracking-widest transition-all border border-white/5 hover:border-gold-primary/30"
                      >
                        Zobacz Pełną Opinię
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        <div className="px-2 md:px-4 lg:px-6 pt-0 pb-8 bg-transparent relative z-20">
          <div className="w-full flex flex-col gap-2">
             <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 px-2 mb-1 overflow-x-auto no-scrollbar">
                <FeatureCard icon={<Shield size={14} className="text-white/60" />} title="Prywatność" bgColor="glass-prestige" />
                <FeatureCard icon={<Target size={14} className="text-white/60" />} title="Precyzja" bgColor="glass-prestige" />
                <FeatureCard icon={<Zap size={14} className="text-black" />} title="Szybkość" bgColor="glass-prestige-platinum" />
             </div>

             <ChatInput 
                  input={input}
                  setInput={setInput}
                  isLoading={chatMutation.isPending}
                  attachments={attachments}
                  addAttachment={addAttachment}
                  removeAttachment={removeAttachment}
                  handleSend={handleSend}
                  stopGeneration={stopGeneration}
                  newChat={newChat}
                  imageInputRef={imageInputRef}
                  attachmentWarning={attachmentWarning}
                  useRag={useRag}
                  setUseRag={setUseRag}
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
          </div>

           <LibrarySelectionModal 
            isOpen={isLibraryOpen}
            mode={libraryMode}
            onClose={() => setIsLibraryOpen(false)}
            onSelect={(docs: { id: string; name: string; chunks: number; created_at: string }[]) => {
              docs.forEach(async (doc) => {
                 const id = `lib-${doc.id}-${Date.now()}`;
                 const newAttachment: QueuedAttachment = {
                   id,
                   file: new File([], doc.name),
                   status: 'processing',
                   progress: 50,
                   previewUrl: undefined,
                   extractedText: ''
                 };
                 setAttachments(prev => [...prev, newAttachment]);
                 
                 try {
                   const res = await fetch(`${API_BASE}/documents/content/${encodeURIComponent(doc.name)}`);
                   const data = await res.json();
                   if (data.success) {
                     setAttachments(prev => prev.map(a => a.id === id ? { 
                       ...a, 
                       status: 'ready', 
                       progress: 100, 
                       extractedText: data.content 
                     } : a));
                   } else {
                     setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', error: data.error } : a));
                   }
                 } catch {
                   setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', error: 'Błąd pobierania' } : a));
                 }
              });
              setIsLibraryOpen(false);
              setUseRag(true);
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
                className="fixed top-0 right-0 w-[450px] max-w-full h-full glass-steel-monolith z-999999 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.8)]"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gold-primary/10 flex items-center justify-center border border-gold-primary/20">
                      <FileSearch className="text-gold-primary" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                         <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Opina Eksperta AI</h3>
                         {/* PRZYCISK ZAMYKANIA BEZPOŚREDNIO OBOK NAGŁÓWKA */}
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
          
          <div className="flex justify-center items-center mt-2.5">
            <div className="flex items-center gap-2 group/verify cursor-default opacity-50 hover:opacity-100 transition-opacity">
              <div className="h-1 w-1 rounded-full bg-gold-primary" />
              <p className="text-[7px] text-white/40 font-black uppercase tracking-widest italic group-hover/verify:text-gold-bright transition-colors">
                Verified by LexMind Core Legal Network node
              </p>
            </div>
          </div>
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
}
