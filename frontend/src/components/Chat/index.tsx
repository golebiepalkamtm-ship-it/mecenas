import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Cpu, Network, Shield, Target, Zap } from "lucide-react";

const MAX_ATTACHMENTS = 10;

// Context & Hooks
import { useSharedChat } from "../../context/useSharedChat";
import { useChatSettingsStore } from "../../store/useChatSettingsStore";
import { useChatMutation } from "../../hooks/useChatMutation";

// Internal Components
import { MessageBubble } from "./components/MessageBubble";
import { ChatSidebar } from "./components/ChatSidebar";
import { QuickIntelligencePanel } from "./components/QuickIntelligencePanel";
import { ChatInput } from "./components/ChatInput";
import { FeatureCard } from "./components/FeatureCard";
import { WelcomeView } from "./components/WelcomeView";

// Shared Tools
import type { Attachment, Message, QueuedAttachment } from "./types";
import { API_BASE } from "../../config";

import { cn } from "../../utils/cn";

export function ChatView({ 
  onNavigate 
}: { 
  onNavigate?: (tab: "chat" | "knowledge" | "prompts" | "drafter" | "documents" | "admin" | "settings") => void 
}) {
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
    fetchSessions
  } = useSharedChat();

  // Zustand Store
  const { mode, isOpen, setIsOpen, showHistory, setShowHistory } = useChatSettingsStore();
  const isConsensusMode = mode === 'consensus';

  const chatMutation = useChatMutation();

  // Component State
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<QueuedAttachment[]>([]);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  
  const processingQueue = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isPending: isLoading } = chatMutation;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const startOCRProcessing = async (id: string, file: File) => {
    if (processingQueue.current.has(id)) return;
    processingQueue.current.add(id);

    try {
      // Phase 1: Uploading
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'uploading', progress: 10 } : a));
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/upload-document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
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
        throw new Error(data.error || 'Błąd OCR');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieznany błąd OCR';
      console.error("OCR Error:", err);
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

    const isAnyProcessing = attachments.some(a => a.status === 'uploading' || a.status === 'processing');
    if (isAnyProcessing) {
      setAttachmentWarning("Poczekaj na zakończenie OCR dokumentów...");
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
    setMessages((prev: Message[]) => [...prev, userMsg]);
    
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
        setMessages((prev: Message[]) => [...prev, assistantMsg]);
        
        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("prawnik_session_id", data.sessionId);
        }
        
        fetchSessions();
      },
      onError: (error: Error) => {
        setMessages((prev: Message[]) => [
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
    if (activeOCRCount.current >= 3 || ocrQueue.current.length === 0) return;

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
      status: 'uploading',
      progress: 0
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    // Add to internal queue and start processing
    ocrQueue.current.push(...newAttachments.map(a => ({ id: a.id, file: a.file })));
    
    // Próbujemy odpalić proces dla całej dostępnej puli (max 3)
    for (let i = 0; i < 3; i++) {
      processNextInQueue();
    }
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
    <div className="h-full flex relative overflow-hidden bg-transparent">
      <ChatSidebar 
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        sessions={sessions}
        sessionId={sessionId}
        switchSession={switchSession}
        removeSession={removeSession}
      />

      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {!showHistory && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowHistory(true)}
            className="absolute left-1 lg:left-2 top-1/2 -translate-y-1/2 z-30 p-3 lg:p-4 glass-prestige-gold rounded-full text-white/40 hover:text-gold-primary hover:scale-110 transition-all shadow-xl group/hist"
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
                 ? "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white shadow-lg"
                 : "glass-prestige-gold border-white/5 text-white/40 hover:text-gold-primary hover:scale-110"
            )}
            title={isConsensusMode ? "Skonfiguruj Konsylium" : "Wybierz Model"}
          >
            {isConsensusMode ? <Network className="w-5 h-5 group-hover/config:rotate-12 transition-transform" /> : <Cpu className="w-5 h-5 group-hover/config:rotate-12 transition-transform" />}
          </motion.button>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 md:px-8 lg:px-12 xl:px-16 py-3 space-y-3 scroll-smooth custom-scrollbar"
        >
          {messages.length === 0 ? (
            <WelcomeView />
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === messages.length - 1 ? 0 : 0.05 }}
                >
                  <MessageBubble msg={m as Message} />
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
                <Zap className="w-4 h-4 text-white/50 relative z-10 animate-pulse" />
              </div>
              
              <div className="liquid-glass px-6 py-5 rounded-4xl relative overflow-hidden flex-1 border border-white/5 shadow-2xl">
                {/* Background Liquid Shimmer */}
                <div className="absolute inset-x-0 bottom-0 h-1 liquid-progress opacity-60" />
                
                {isConsensusMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic flex items-center gap-2">
                         <Network className="w-3 h-3 text-blue-400 animate-pulse" />
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
                             <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
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
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
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

        <div className="px-2 md:px-4 lg:px-6 pt-0 pb-8 bg-transparent relative z-20">
          <div className="w-full flex flex-col gap-2">
             <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 px-2 mb-1 overflow-x-auto no-scrollbar">
                <FeatureCard icon={<Shield size={14} className="text-white/60" />} title="Prywatność" bgColor="glass-prestige" />
                <FeatureCard icon={<Target size={14} className="text-white/60" />} title="Precyzja" bgColor="glass-prestige" />
                <FeatureCard icon={<Zap size={14} className="text-gold-primary" />} title="Szybkość" bgColor="glass-prestige-gold" />
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
                 onNavigateToDrafter={() => onNavigate?.("drafter")}
                 fileInputRef={fileInputRef}
                 attachmentWarning={attachmentWarning}
              />
          </div>
          
          <div className="flex justify-center items-center mt-2.5">
            <div className="flex items-center gap-2 group/verify cursor-default opacity-50 hover:opacity-100 transition-opacity">
              <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[7px] text-white/40 font-black uppercase tracking-widest italic group-hover/verify:text-green-400 transition-colors">
                Verified by LexMind Core Legal Network node
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 28,
              mass: 1.2,
              restDelta: 0.001
            }}
            className="fixed lg:relative inset-y-0 right-0 w-[450px] max-w-full h-full z-50 shadow-2xl border-l border-white/5"
          >
            <QuickIntelligencePanel onNavigate={onNavigate} />
          </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
}
