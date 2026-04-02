import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, History, Cpu, Network, Shield, Target, Zap } from "lucide-react";

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
import type { Attachment, Message } from "./types";

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isPending: isLoading } = chatMutation;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Actions
  const handleSend = async () => {
    if (chatMutation.isPending) {
      stopGeneration();
      return;
    }
    if (!input.trim() && attachments.length === 0) return;

    // Convert files to base64
    const attachmentData: Attachment[] = [];
    if (attachments.length > 0) {
      for (const file of attachments) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        attachmentData.push({
          name: file.name,
          type: file.type,
          content: base64,
        });
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
      attachments: attachmentData
    }, {
      onSuccess: (data) => {
        const assistantMsg: Message = {
          id: data.id,
          role: "assistant", // Always assistant in response
          content: data.content,
          sources: data.sources || [],
          consensus_used: isConsensusMode,
          expert_analyses: data.expert_analyses || [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev: Message[]) => [...prev, assistantMsg]);
        
        // Update sessionId if we didn't have one
        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("prawnik_session_id", data.sessionId);
        }
        
        fetchSessions(); // Refresh sessions list to show new session if it was just created
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
    
    // Ogranicz rozmiar plików do 15MB
    const validSizeFiles = validFiles.filter(file => file.size <= 15 * 1024 * 1024);
    
    if (validSizeFiles.length !== validFiles.length) {
      setAttachmentWarning('Niektóre pliki zostały odrzucone - przekroczenie rozmiaru 15MB');
    }

    if (validSizeFiles.length === 0) return;

    setAttachments((prev) => {
      const remainingSlots = MAX_ATTACHMENTS - prev.length;
      if (remainingSlots <= 0) {
        setAttachmentWarning(`Osiągnięto limit ${MAX_ATTACHMENTS} załączników`);
        return prev;
      }
      const filesToAdd = validSizeFiles.slice(0, remainingSlots);
      if (filesToAdd.length < validSizeFiles.length) {
        setAttachmentWarning(`Dodano ${filesToAdd.length} z ${validSizeFiles.length} plików — limit ${MAX_ATTACHMENTS} załączników`);
      }
      return [...prev, ...filesToAdd];
    });
  }, []);

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
      {/* Sessions History Sidebar on the Left */}
      <ChatSidebar 
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        sessions={sessions}
        sessionId={sessionId}
        switchSession={switchSession}
        removeSession={removeSession}
      />

      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Toggle Controls */}
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

        {/* Message Area */}
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
              className="flex gap-3 max-w-[85%] pr-4"
            >
              <div className="w-8 h-8 rounded-xl glass-prestige shrink-0 flex items-center justify-center border border-white/10">
                <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />
              </div>
              <div className="liquid-glass px-5 py-4 rounded-2xl relative overflow-hidden flex-1">
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
                
                {isConsensusMode ? (
                  <>
                    <p className="text-[9px] font-black text-white/40 mb-3 uppercase tracking-[0.2em]">
                      Konsylium MOA — Analiza w toku...
                    </p>
                    <div className="flex items-center gap-3">
                      {/* Phase 1: Retrieval */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                        <span className="text-[7px] font-bold text-white/40 uppercase tracking-wider">Baza</span>
                      </div>
                      <div className="w-4 h-px bg-white/10" />
                      {/* Phase 2: Experts */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <Network className="w-3 h-3 text-white/30" />
                        <span className="text-[7px] font-bold text-white/30 uppercase tracking-wider">Eksperci</span>
                      </div>
                      <div className="w-4 h-px bg-white/10" />
                      {/* Phase 3: Judge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider">Synteza</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[8px] font-black text-white/40 mb-2 uppercase tracking-[0.2em] italic">
                      Analiza prawna w toku...
                    </p>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-[200px] bg-white/5 rounded-full" />
                      <div className="h-1.5 w-[150px] bg-white/5 rounded-full" />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Bar Section */}
        <div className="px-2 md:px-4 lg:px-6 pt-0 pb-8 bg-transparent relative z-20">
          <div className="w-full flex flex-col gap-2">
             {/* Feature Badges */}
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

      {/* Unified Model Configurator on the Right */}
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
