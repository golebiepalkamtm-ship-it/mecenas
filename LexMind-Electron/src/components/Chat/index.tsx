import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  Paperclip, 
  Send, 
  Sparkles, 
  User, 
  Search, 
  FileText, 
  X, 
  ExternalLink,
  Loader2,
  Lock,
  Gem,
  Square,
  Plus,
  RotateCcw,
  History,
  MessageSquare,
  Trash2,
  Cpu,
  Gavel,
  Building2,
  ChevronDown,
  Stamp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSharedChat } from '../../context/useSharedChat';
import { DrafterPanel } from '../Drafter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Attachment {
    name: string;
    type: string;
    content: string; // Base64
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    attachments?: Attachment[];
}

interface Model {
  id: string;
  name: string;
  active: boolean;
  provider: string;
  model_id?: string;
  vision?: boolean;
}

export function ChatView() {
  const { 
    messages, 
    setMessages,
    sendMessage, 
    isLoading, 
    setIsLoading,
    stopGeneration,
    availableModels, 
    selectedModel, 
    setSelectedModel,
    sessions,
    sessionId,
    newChat,
    switchSession,
    removeSession 
  } = useSharedChat();
  const [showHistory, setShowHistory] = useState(true);
  const [showModels, setShowModels] = useState(true);
  const [showDrafter, setShowDrafter] = useState(false);
  const [showMultiModel, setShowMultiModel] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [aggregatorModel, setAggregatorModel] = useState<string>('google/gemini-2.5-flash');
  const [multiModelResponses, setMultiModelResponses] = useState<Array<{model: string, response: string, sources: string[]}>>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [expandedChatGroups, setExpandedChatGroups] = useState<{ [key: string]: boolean }>({
    'OPENAI': true,
    'ANTHROPIC': true,
    'OPENROUTER': true
  });
  const [expandedAggregatorGroups, setExpandedAggregatorGroups] = useState<{ [key: string]: boolean }>({
    'OPENAI': true,
    'ANTHROPIC': true,
    'OPENROUTER': true
  });
  const [filterVendor, setFilterVendor] = useState<string>('all');
  const [filterVision, setFilterVision] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollOptions: ScrollToOptions = {
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      };
      // Brief delay to allow DOM to finish rendering new message
      setTimeout(() => {
        scrollRef.current?.scrollTo(scrollOptions);
      }, 100);
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (isLoading) {
        stopGeneration();
        return;
    }
    if (!input.trim() && attachments.length === 0) return;
    
    // If multi-model mode is active and at least 1 model is selected
    if (showMultiModel && selectedModels.length > 0) {
      handleMultiModelSend();
    } else {
      sendMessage(input, attachments);
    }
    
    setInput('');
    setAttachments([]);
  };

  const handleMultiModelSend = async () => {
    if (!input.trim() || selectedModels.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Convert files to base64 once
      const attachmentData: { name: string; type: string; content: string }[] = [];
      if (attachments && attachments.length > 0) {
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
            content: base64
          });
        }
      }
      
      // Use consensus endpoint with selected models and aggregator
      const res = await fetch('http://127.0.0.1:8001/chat-consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: [],
          attachments: attachmentData,
          use_full_history: false,
          selected_models: selectedModels,  // Expert models for analysis
          aggregator_model: aggregatorModel  // Model for summarization
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Add consensus response to messages
        const consensusMsg = {
          id: data.id || 'consensus-' + Date.now(),
          role: 'assistant',
          content: data.content,
          sources: data.sources || [],
          consensus_used: data.consensus_used || true,
          expert_analyses: data.expert_analyses || [],
          selected_models_count: selectedModels.length,
          aggregator_used: aggregatorModel,
          created_at: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, consensusMsg]);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Server Error");
      }
    } catch (error) {
      console.error("Consensus analysis error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: `Błąd analizy konsensusu: ${error instanceof Error ? error.message : "Nieznany błąd"}`, 
        sources: [],
        consensus_used: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length < 10) {  // Increased from 3 to 10
        return [...prev, modelId];
      }
      return prev; // Already have 10 models selected
    });
  };


  const addAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="h-full flex relative overflow-hidden bg-transparent">
      {/* Sessions Sidebar Overlay Background */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sessions Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="fixed lg:relative inset-y-0 left-0 w-[260px] h-full glass-prestige bg-(--bg-top) lg:rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-3xl"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
               <h3 className="text-[8px] font-black uppercase tracking-[0.4em] text-white flex items-center gap-2">
                 <History size={12} className="text-gold" /> Historia
               </h3>
               <button 
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/5"
               >
                  <X size={14} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {sessions.map((s: { id: string; title?: string }, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 100, damping: 20 }}
                  >
                    <div 
                      onClick={() => { switchSession(s.id); if (window.innerWidth < 1024) setShowHistory(false); }}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all duration-200 border",
                        sessionId === s.id 
                          ? "bg-gold-primary/10 border-gold-primary/20 shadow-sm" 
                          : "border-transparent hover:bg-white/5 opacity-70 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                        <MessageSquare size={12} className={cn("shrink-0", sessionId === s.id ? "text-gold" : "text-white/40 group-hover:text-white")} />
                        <span className="text-[11px] font-bold truncate">{s.title || "Nowa Sprawa"}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {sessions.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Brak zapisanych sesji</p>
                </div>
              )}
            </div>

            <div className="px-3 py-2.5 border-t border-white/5">
                <div className="px-3 py-2 rounded-xl bg-gold-primary/5 border border-gold-primary/10">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gold-primary/60 text-center">Archiwum Adwokackie</p>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Model Selection Panel */}
        <AnimatePresence>
          {showMultiModel && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 md:px-6 lg:px-10 pt-4 border-b border-gold-primary/20"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={16} className="text-gold-primary" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-gold-primary">
                    Analiza 3 Modeli AI
                  </span>
                  <span className="text-[8px] text-slate-400">
                    Wybierz 1-3 modele
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  {availableModels.slice(0, 9).map((model) => (
                    <motion.button
                      key={model.id}
                      onClick={() => toggleModelSelection(model.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "p-3 rounded-xl border transition-all text-left",
                        selectedModels.includes(model.id)
                          ? "bg-gold-primary/20 border-gold-primary/30"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold truncate">
                            {model.name.includes(':') ? model.name.split(':').pop()?.trim() : model.name}
                          </div>
                          <div className="text-[7px] text-slate-400 uppercase">
                            {model.id.split('/')[0]}
                          </div>
                        </div>
                        {selectedModels.includes(model.id) && (
                          <Sparkles size={12} className="text-gold-primary animate-pulse" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-[8px] text-slate-400 mb-3">
                  <span>Wybrane modele:</span>
                  <span className="font-bold text-gold-primary">
                    {selectedModels.length}/3
                  </span>
                  {selectedModels.length >= 1 && (
                    <span className="text-emerald-400">✓ Gotowe do analizy</span>
                  )}
                </div>

                {/* Selected Models Display */}
                {selectedModels.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[8px] font-bold text-slate-300 uppercase">Eksperci (analiza):</div>
                    <div className="space-y-1">
                      {selectedModels.map((modelId, index) => {
                        const model = availableModels.find(m => m.id === modelId);
                        return (
                          <div key={modelId} className="flex items-center gap-2 p-2 bg-gold-primary/10 border border-gold-primary/20 rounded-lg">
                            <span className="text-[8px] font-bold text-gold-primary">E{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[9px] font-bold truncate">
                                {model?.name.includes(':') ? model.name.split(':').pop()?.trim() : model?.name}
                              </div>
                              <div className="text-[6px] text-slate-400 uppercase">
                                {modelId.split('/')[0]}
                              </div>
                            </div>
                            <Sparkles size={10} className="text-gold-primary" />
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="text-[8px] font-bold text-slate-300 uppercase pt-2">Arbiter (synteza):</div>
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="text-[8px] font-bold text-emerald-400">A</span>
                      <div className="flex-1">
                        <div className="text-[9px] font-bold">GPT-4o Mini</div>
                        <div className="text-[6px] text-slate-400 uppercase">OPENAI</div>
                      </div>
                      <Cpu size={10} className="text-emerald-400" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* History Toggle Button (Desktop & Mobile) */}
        {!showHistory && (
          <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowHistory(true)}
            className="absolute left-2 lg:left-6 top-1/3 lg:top-1/2 -translate-y-1/2 z-30 p-3 lg:p-4 glass-prestige bg-(--bg-top) rounded-2xl text-(--gold-primary) hover:scale-110 transition-all shadow-2xl border-(--gold-muted)"
            title="Rozwiń Historię"
          >
            <History className="w-5 h-5" />
          </motion.button>
        )}

        {/* Models Toggle Button */}
        {!showModels && !showDrafter && (
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowModels(true)}
            className="absolute right-2 lg:right-6 top-1/3 lg:top-1/2 -translate-y-1/2 z-30 p-3 lg:p-4 glass-prestige bg-(--bg-top) rounded-2xl text-(--gold-primary) hover:scale-110 transition-all shadow-2xl border-(--gold-muted)"
            title="Rozwiń Narzędzia"
          >
            <Cpu className="w-5 h-5" />
          </motion.button>
        )}

        {/* Multi-Model Responses */}
          {multiModelResponses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 mb-6"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-gold-primary/10 border border-gold-primary/30 rounded-xl">
                <Cpu size={16} className="text-gold-primary" />
                <span className="text-[10px] font-black uppercase tracking-wider text-gold-primary">
                  Analiza Wielomodelowa
                </span>
                <span className="text-[8px] text-slate-400">
                  {multiModelResponses.length} odpowiedzi
                </span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {multiModelResponses.map((response, index) => (
                  <motion.div
                    key={response.model}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-(--bg-top)/40 border border-gold-primary/20 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-gold-primary" />
                      <span className="text-[9px] font-bold text-gold-primary">
                        {response.model.split('/')[0].toUpperCase()}
                      </span>
                      <span className="text-[7px] text-slate-400">
                        {response.model.split('/').pop()?.substring(0, 12)}
                      </span>
                    </div>
                    
                    <div className="text-[10px] text-(--text-primary) leading-relaxed mb-3">
                      {response.response}
                    </div>
                    
                    {response.sources && response.sources.length > 0 && (
                      <div className="border-t border-gold-primary/10 pt-2">
                        <div className="text-[7px] text-slate-400 mb-1">Źródła:</div>
                        <div className="flex flex-wrap gap-1">
                          {response.sources.slice(0, 3).map((source, idx) => (
                            <span key={idx} className="text-[6px] px-2 py-1 bg-gold-primary/10 text-gold-primary rounded">
                              📄 {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Regular Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-8 lg:px-12 xl:px-16 py-3 space-y-3 scroll-smooth custom-scrollbar">
          {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full text-center p-4 xs:p-6 lg:p-20 relative">
               <motion.div 
                 initial={{ opacity: 0, y: 15 }} 
                 animate={{ opacity: 1, y: 0 }} 
                 transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                 className="space-y-3 xs:space-y-4 lg:space-y-6 relative z-10 w-full"
               >
                  <div className="flex flex-col items-center">
                      <div className="relative group mb-4 sm:mb-6 lg:mb-10">
                          <div className="w-12 h-12 xs:w-16 xs:h-16 lg:w-24 lg:h-24 rounded-2xl xs:rounded-3xl lg:rounded-[2.5rem] bg-linear-to-br from-(--bg-deep) to-(--bg-sea) shadow-[0_0_80px_rgba(255,215,128,0.2)] flex items-center justify-center border border-(--gold-muted)/30 group-hover:rotate-6 transition-transform duration-1000 relative z-10">
                              <Scale className="w-5 h-5 xs:w-8 xs:h-8 lg:w-12 lg:h-12 text-(--gold-primary)" fill="currentColor" fillOpacity={0.2} strokeWidth={1} />
                          </div>
                          <motion.div 
                              animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }}
                              transition={{ duration: 4, repeat: Infinity }}
                              className="absolute -right-2 -bottom-1 xs:-right-4 xs:-bottom-1 lg:-right-6 lg:-bottom-2 z-20 w-6 h-6 xs:w-8 xs:h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-(--bg-top) border border-(--gold-muted)/30 flex items-center justify-center text-gold-primary shadow-2xl backdrop-blur-xl"
                          >
                              <Gavel className="w-3 h-3 xs:w-4 xs:h-4 lg:w-5 lg:h-5" />
                          </motion.div>
                      </div>
                      <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-7xl font-black tracking-tighter text-(--text-primary) mb-1 lg:mb-4 italic leading-none">
                          LexMind <span className="text-accent">AI</span>
                      </h1>
                      <p className="text-xs xs:text-sm lg:text-xl text-(--text-secondary) font-black tracking-tight opacity-80 mb-4 sm:mb-6 lg:mb-8 italic leading-none">
                          Legal Excellence
                      </p>
                      <div className="flex items-center justify-center gap-2 xs:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
                          <div className="h-px w-6 xs:w-8 lg:w-12 bg-accent opacity-40 rounded-full" />
                          <span className="text-[8px] xs:text-[10px] lg:text-xs font-black tracking-widest text-gold-primary">System analizy przepisów</span>
                          <div className="h-px w-6 xs:w-8 lg:w-12 bg-accent opacity-40 rounded-full" />
                      </div>
                      <p className="max-w-[240px] xs:max-w-[280px] lg:max-w-md mx-auto text-[7px] xs:text-[8px] lg:text-[10px] font-bold text-gold-primary/50 tracking-widest leading-relaxed opacity-60">
                          Serwis ma charakter wyłącznie informacyjny. Wygenerowane treści nie stanowią porady prawnej.
                      </p>
                  </div>
               </motion.div>
               <div className="absolute inset-0 bg-radial-to-c from-(--primary)/20 to-transparent" />
          </div>
          )}

          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                        type: 'spring',
                        stiffness: 180,
                        damping: 20,
                        delay: i === messages.length - 1 ? 0 : 0.05 
                    }}
                  >
                    <MessageBubble msg={m as Message} />
                  </motion.div>
                ))}
            </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 max-w-[85%] pr-4">
               <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/20 shrink-0 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
               </div>
               <div className="bg-(--bg-top)/40 px-4 py-3 rounded-2xl animate-pulse relative overflow-hidden flex-1">
                  <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-accent/30 to-transparent" />
                  <p className="text-[8px] font-black text-accent mb-2 uppercase tracking-[0.2em]">Generowanie...</p>
                  <div className="space-y-1.5">
                     <div className="h-1.5 w-[200px] bg-slate-800/20 rounded-full" />
                     <div className="h-1.5 w-[150px] bg-slate-800/20 rounded-full" />
                     <div className="h-1.5 w-[120px] bg-slate-800/20 rounded-full opacity-50" />
                  </div>
               </div>
            </motion.div>
          )}
        </div>

        {/* Input section */}
        <div className="px-3 md:px-6 lg:px-10 pt-0 pb-12 bg-transparent relative z-20">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
              
              {/* Feature Cards Above Input */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 px-4 max-w-2xl mx-auto mb-2">
                  <FeatureCard icon={<Lock size={18} className="text-emerald-400" />} title="Prywatność" desc="AES-256" />
                  <FeatureCard icon={<Gem size={18} className="text-gold-primary" />} title="Precyzja" desc="Baza v3" />
                  <FeatureCard icon={<Sparkles size={18} className="text-purple-400" />} title="Szybkość" desc="Fast Core" />
              </div>
              <AnimatePresence>
                  {attachments.length > 0 && (
                      <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }} 
                          className="flex flex-wrap gap-2 lg:gap-3 overflow-hidden"
                      >
                          {attachments.map((file, idx) => (
                              <div key={idx} className="bg-(--bg-top)/40 px-3 lg:px-4 py-2 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-3 text-[10px] lg:text-xs font-bold group cursor-default border-accent/10 shadow-xl">
                                  <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-accent" />
                                  <span className="text-(--text-primary) truncate max-w-[120px] lg:max-w-[150px] uppercase tracking-tighter">{file.name}</span>
                                  <button onClick={() => removeAttachment(idx)} className="w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500/20 transition-all">
                                      <X size={14} />
                                  </button>
                              </div>
                          ))}
                      </motion.div>
                  )}
              </AnimatePresence>
                <div className="relative glass-prestige p-1 rounded-2xl bg-(--bg-top) border-(--gold-muted) shadow-xl flex items-end gap-1.5 group/input transition-all">
                  {/* Left Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Multi-Model Toggle */}
                    <motion.button
                      onClick={() => setShowMultiModel(!showMultiModel)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "h-8 w-8 rounded-xl border-prestige flex items-center justify-center transition-all shrink-0 mb-0.5",
                        showMultiModel 
                          ? "bg-gold-primary/20 text-gold-primary border-gold-primary/30" 
                          : "bg-white/5 text-slate-400 hover:text-gold-primary hover:bg-gold-primary/10"
                      )}
                      title="Analiza wielomodelowa (do 10 ekspertów)"
                    >
                      <Cpu className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
                    </motion.button>
                    
                    {/* New Chat */}
                    <motion.button
                      onClick={() => { newChat(); setInput(''); setAttachments([]); setSelectedModels([]); setMultiModelResponses([]); }}
                      whileHover={{ scale: 1.05, rotate: 90 }}
                      whileTap={{ scale: 0.95 }}
                      className="h-8 w-8 rounded-xl bg-white/5 border-prestige flex items-center justify-center text-slate-400 hover:text-gold-primary hover:bg-gold-primary/10 transition-all shrink-0 mb-0.5"
                      title="Nowa sprawa"
                    >
                      <Plus className="w-4.5 h-4.5 lg:w-5 lg:h-5" />
                    </motion.button>
                  </div>

                  {/* Center: Input Field */}
                  <div className="flex-1 relative bg-black/20 rounded-xl lg:rounded-2xl border border-(--gold-muted)">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={showMultiModel ? "Zadaj pytanie dla wielu modeli AI..." : "Zadaj pytanie prawne..."}
                      className="w-full bg-transparent px-3 py-2.5 pr-8 text-[13px] text-(--text-primary) focus:outline-hidden min-h-[40px] max-h-[140px] resize-none overflow-hidden placeholder:text-(--text-secondary) font-medium"
                      rows={1}
                    />
                    <div className="absolute right-1 lg:right-2 bottom-1.5 lg:bottom-2.5">
                      <motion.button
                         onClick={() => fileInputRef.current?.click()}
                         whileHover={{ scale: 1.1, y: -2 }}
                         whileTap={{ scale: 0.9 }}
                         className="p-1.5 lg:p-2 text-slate-500 hover:text-gold-primary transition-colors"
                      >
                        <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
                      </motion.button>
                      <input 
                          type="file" 
                          multiple 
                          className="hidden" 
                          ref={fileInputRef} 
                          onChange={addAttachment} 
                      />
                    </div>
                  </div>

                  {/* Right Actions: Stop & Send */}
                  <div className="flex items-center gap-1.5 lg:gap-2 mb-1 pr-0.5 lg:pr-1">
                    <AnimatePresence>
                      {isLoading && (
                        <motion.button
                            initial={{ width: 0, opacity: 0, scale: 0.8 }}
                            animate={{ width: 'auto', opacity: 1, scale: 1 }}
                            exit={{ width: 0, opacity: 0, scale: 0.8 }}
                            onClick={stopGeneration}
                            className="h-10 lg:h-12 px-3 lg:px-4 rounded-lg lg:rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 flex items-center gap-2 transition-all shadow-xl font-black text-[8px] lg:text-[9px] tracking-widest uppercase overflow-hidden"
                        >
                            <Square className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" />
                            STOP
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <motion.button
                      onClick={handleSend}
                      disabled={isLoading}
                      whileHover={isLoading ? {} : { scale: 1.05, x: 2 }}
                      whileTap={isLoading ? {} : { scale: 0.95 }}
                      className={cn(
                        "h-9 px-4 rounded-xl border flex items-center gap-2 font-black uppercase text-[9px] tracking-widest transition-all shadow-lg duration-300",
                        isLoading
                          ? "opacity-30 cursor-wait grayscale border-white/5 bg-white/5 text-slate-500" 
                          : (!input.trim() && attachments.length === 0)
                            ? "bg-gold-primary/30 text-black/40 border-gold-primary/20 hover:bg-gold-primary/50"
                            : "bg-gold-primary text-black border-gold-primary shadow-[0_0_30px_rgba(255,215,128,0.4)] hover:shadow-gold"
                      )}
                    >
                      <Send size={14} fill="currentColor" />
                      <span className="hidden lg:inline">WYŚLIJ</span>
                    </motion.button>

                    {/* Draft Document Button */}
                    <motion.button
                      onClick={() => { setShowDrafter(!showDrafter); if (showDrafter === false) setShowModels(false); }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "h-10 lg:h-12 px-3 lg:px-4 rounded-lg lg:rounded-xl border flex items-center gap-2 font-black uppercase text-[8px] lg:text-[9px] tracking-widest transition-all shadow-xl duration-500",
                        showDrafter
                          ? "bg-blue-500 text-white border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40"
                      )}
                      title="Kreator Pism Procesowych"
                    >
                      <Stamp size={14} />
                      <span className="hidden lg:inline">PISMO</span>
                    </motion.button>
                  </div>
                </div>
              </div>
          <div className="flex justify-center items-center mt-1.5">
              <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[7px] text-white/30 font-bold uppercase tracking-widest italic">Verified by LexMind Core</p>
              </div>
          </div>
        </div>
      </div>

      {/* Models Sidebar Overlay Background */}
      <AnimatePresence>
        {showModels && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModels(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
          />
        )}
      </AnimatePresence>

      {/* Models Sidebar */}
      <AnimatePresence>
        {showModels && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="fixed lg:relative inset-y-0 right-0 w-[260px] h-full glass-prestige bg-(--bg-top) lg:rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-3xl"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
               <h3 className="text-[8px] font-black uppercase tracking-[0.4em] text-white flex items-center gap-2">
                 <Cpu size={12} className="text-gold" /> Silnik AI
               </h3>
               <div className="flex items-center gap-1">
                 <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('prawnik_models_updated'))}
                    className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/5 active:scale-95 transition-all"
                    title="Odśwież"
                 >
                    <RotateCcw size={12} />
                 </button>
                 <button 
                    onClick={() => setShowModels(false)}
                    className="p-1.5 text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/5"
                 >
                    <X size={14} />
                 </button>
               </div>
            </div>
            {/* Filter Controls */}
            <div className="px-3 py-2 border-b border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Firma:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterVendor('all')}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all",
                    filterVendor === 'all' 
                      ? "bg-gold-primary/20 text-gold-primary border border-gold-primary/30" 
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  Wszystkie
                </button>
                {(() => {
                  const vendors = [...new Set(availableModels.map((m: Model) => 
                    (m.name.includes(':') ? m.name.split(':')[0].trim() : (m.model_id?.includes('/') ? m.model_id.split('/')[0].trim() : m.provider)).toUpperCase()
                  ))].sort();
                  
                  return vendors.map(vendor => (
                    <button
                      key={vendor}
                      onClick={() => setFilterVendor(vendor)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all",
                        filterVendor === vendor 
                          ? "bg-gold-primary/20 text-gold-primary border border-gold-primary/30" 
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      )}
                    >
                      {vendor}
                    </button>
                  ));
                })()}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Funkcje:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterVision(!filterVision)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                    filterVision 
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  <Sparkles size={10} />
                  Vision
                </button>
              </div>
            </div>

            {/* Multi-Model Selection */}
            <div className="px-3 py-2 border-b border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Modele do analizy:</span>
                <span className="text-[7px] text-gold-primary">({selectedModels.length}/10)</span>
              </div>
              <div className="space-y-1">
                {(() => {
                  // Show only selected analysis models
                  const selectedAnalysisModels = availableModels.filter((m: Model) => selectedModels.includes(m.id));
                  
                  if (selectedAnalysisModels.length === 0) {
                    return (
                      <div className="px-3 py-2 text-center">
                        <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Nie wybrano modeli</p>
                        <p className="text-[6px] text-white/30 mt-1">Wybierz modele z listy poniżej</p>
                      </div>
                    );
                  }
                  
                  return selectedAnalysisModels.map((m: Model) => (
                    <button
                      key={m.id}
                      onClick={() => toggleModelSelection(m.id)}
                      className={cn(
                        "group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-300 border",
                        selectedModels.includes(m.id)
                          ? "bg-gold-primary/20 text-gold-primary border-gold-primary/30"
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                        <span className="text-[7px] font-bold uppercase tracking-tight truncate">
                          {m.name.includes(':') ? m.name.split(':').pop()?.trim() : m.name}
                        </span>
                        {m.vision && (
                          <span className="px-1 py-0.5 rounded bg-purple-500/20 text-[5px] font-black text-purple-400">V</span>
                        )}
                      </div>
                      {selectedModels.includes(m.id) && <Sparkles size={8} className="text-gold animate-pulse" />}
                    </button>
                  ));
                })()}
              </div>
              
              {/* Full Model Selection List */}
              <div className="mt-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[7px] font-black uppercase tracking-widest text-white/30">Wybierz modele:</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                  {(() => {
                    const filteredModels = availableModels.filter((m: Model) => {
                      if (filterVision && !m.vision) return false;
                      if (filterVendor !== 'all') {
                        const vendor = (m.name.includes(':') ? m.name.split(':')[0].trim() : (m.model_id?.includes('/') ? m.model_id.split('/')[0].trim() : m.provider)).toUpperCase();
                        if (vendor !== filterVendor) return false;
                      }
                      return true;
                    });
                    
                    const grouped = filteredModels.reduce((acc: Record<string, Model[]>, m: Model) => {
                      const vendor = (m.name.includes(':') ? m.name.split(':')[0].trim() : (m.model_id?.includes('/') ? m.model_id.split('/')[0].trim() : m.provider)).toUpperCase();
                      if (!acc[vendor]) acc[vendor] = [];
                      acc[vendor].push(m);
                      return acc;
                    }, {});
                    
                    const entries = Object.entries(grouped) as [string, Model[]][];
                    
                    if (entries.length === 0) {
                      return (
                        <div className="px-3 py-2 text-center">
                          <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Brak modeli</p>
                        </div>
                      );
                    }
                    
                    return entries.map(([vendor, models]) => {
                      const isExpanded = expandedChatGroups[vendor];
                      return (
                        <div key={vendor} className="flex flex-col">
                          <button 
                            onClick={() => setExpandedChatGroups(prev => ({ ...prev, [vendor]: !prev[vendor] }))}
                            className={cn(
                              "w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-left",
                              isExpanded && "text-gold-primary"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 size={11} className={cn("transition-colors", isExpanded ? "text-gold-primary" : "text-white/30")} />
                              <span className="text-[8px] font-black uppercase tracking-widest">{vendor}</span>
                              <span className="text-[6px] opacity-30">[{models.length}]</span>
                            </div>
                            <ChevronDown size={12} className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "opacity-40")} />
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden flex flex-col gap-1 pl-3 mt-1"
                              >
                                {models.map((m: Model) => (
                                  <button
                                    key={m.id}
                                    onClick={() => toggleModelSelection(m.id)}
                                    className={cn(
                                      "group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-300 border",
                                      selectedModels.includes(m.id)
                                        ? "bg-gold-primary/20 text-gold-primary border-gold-primary/30"
                                        : "border-transparent hover:bg-white/5 opacity-70 hover:opacity-100"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                                      <span className="text-[7px] font-bold uppercase tracking-tight truncate">
                                        {m.name.includes(':') ? m.name.split(':').pop()?.trim() : m.name}
                                      </span>
                                      {m.vision && (
                                        <span className="px-1 py-0.5 rounded bg-purple-500/20 text-[5px] font-black text-purple-400">V</span>
                                      )}
                                    </div>
                                    {selectedModels.includes(m.id) && <Sparkles size={8} className="text-gold animate-pulse" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Aggregator Model Selection */}
            <div className="px-3 py-2 border-b border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Model do podsumowania:</span>
              </div>
              <div className="space-y-1">
                {(() => {
                  // Show only selected models for aggregator
                  const selectedAggregatorModels = availableModels.filter((m: Model) => m.id === aggregatorModel);
                  
                  if (selectedAggregatorModels.length === 0) {
                    return (
                      <div className="px-3 py-2 text-center">
                        <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Nie wybrano modelu</p>
                        <p className="text-[6px] text-white/30 mt-1">Wybierz model z listy poniżej</p>
                      </div>
                    );
                  }
                  
                  return selectedAggregatorModels.map((m: Model) => (
                    <button
                      key={`agg-${m.id}`}
                      onClick={() => setAggregatorModel(m.id)}
                      className={cn(
                        "group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-300 border",
                        aggregatorModel === m.id
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                        <span className="text-[7px] font-bold uppercase tracking-tight truncate">
                          {m.name.includes(':') ? m.name.split(':').pop()?.trim() : m.name}
                        </span>
                        {m.vision && (
                          <span className="px-1 py-0.5 rounded bg-purple-500/20 text-[5px] font-black text-purple-400">V</span>
                        )}
                      </div>
                      {aggregatorModel === m.id && <Sparkles size={8} className="text-blue-400 animate-pulse" />}
                    </button>
                  ));
                })()}
              </div>
              
              {/* Full Aggregator Model Selection List */}
              <div className="mt-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[7px] font-black uppercase tracking-widest text-white/30">Wybierz model:</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                  {(() => {
                    const filteredModels = availableModels.filter((m: Model) => {
                      if (filterVision && !m.vision) return false;
                      if (filterVendor !== 'all') {
                        const vendor = (m.name.includes(':') ? m.name.split(':')[0].trim() : (m.model_id?.includes('/') ? m.model_id.split('/')[0].trim() : m.provider)).toUpperCase();
                        if (vendor !== filterVendor) return false;
                      }
                      return true;
                    });
                    
                    const grouped = filteredModels.reduce((acc: Record<string, Model[]>, m: Model) => {
                      const vendor = (m.name.includes(':') ? m.name.split(':')[0].trim() : (m.model_id?.includes('/') ? m.model_id.split('/')[0].trim() : m.provider)).toUpperCase();
                      if (!acc[vendor]) acc[vendor] = [];
                      acc[vendor].push(m);
                      return acc;
                    }, {});
                    
                    const entries = Object.entries(grouped) as [string, Model[]][];
                    
                    return entries.map(([vendor, models]) => {
                      const isExpanded = expandedAggregatorGroups[vendor];
                      return (
                        <div key={`agg-${vendor}`} className="flex flex-col">
                          <button 
                            onClick={() => setExpandedAggregatorGroups(prev => ({ ...prev, [vendor]: !prev[vendor] }))}
                            className={cn(
                              "w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-left",
                              isExpanded && "text-blue-400"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 size={11} className={cn("transition-colors", isExpanded ? "text-blue-400" : "text-white/30")} />
                              <span className="text-[8px] font-black uppercase tracking-widest">{vendor}</span>
                              <span className="text-[6px] opacity-30">[{models.length}]</span>
                            </div>
                            <ChevronDown size={12} className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "opacity-40")} />
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden flex flex-col gap-1 pl-3 mt-1"
                              >
                                {models.map((m: Model) => (
                                  <button
                                    key={`agg-${m.id}`}
                                    onClick={() => setAggregatorModel(m.id)}
                                    className={cn(
                                      "group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-300 border",
                                      aggregatorModel === m.id
                                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                        : "border-transparent hover:bg-white/5 opacity-70 hover:opacity-100"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                                      <span className="text-[7px] font-bold uppercase tracking-tight truncate">
                                        {m.name.includes(':') ? m.name.split(':').pop()?.trim() : m.name}
                                      </span>
                                      {m.vision && (
                                        <span className="px-1 py-0.5 rounded bg-purple-500/20 text-[5px] font-black text-purple-400">V</span>
                                      )}
                                    </div>
                                    {aggregatorModel === m.id && <Sparkles size={8} className="text-blue-400 animate-pulse" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 py-2 custom-scrollbar">
              {(() => {
                // Filter models
                const filteredModels = availableModels.filter((m: Model) => {
                  // Vision filter - use vision field from API
                  if (filterVision && !m.vision) {
                    return false;
                  }
                  // Vendor filter
                  if (filterVendor !== 'all') {
                    const vendor = (m.name.includes(':') ? m.name.split(':')[0].trim() : (m.model_id?.includes('/') ? m.model_id.split('/')[0].trim() : m.provider)).toUpperCase();
                    if (vendor !== filterVendor) return false;
                  }
                  return true;
                });

                const grouped = filteredModels.reduce((acc: Record<string, Model[]>, m: Model) => {
                  const vendor = (m.name.includes(':') ? m.name.split(':')[0].trim() : (m.model_id?.includes('/') ? m.model_id.split('/')[0].trim() : m.provider)).toUpperCase();
                  if (!acc[vendor]) acc[vendor] = [];
                  acc[vendor].push(m);
                  return acc;
                }, {});

                const entries = Object.entries(grouped) as [string, Model[]][];
                
                if (entries.length === 0) {
                  return (
                    <div className="px-4 py-8 text-center">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Brak modeli</p>
                      <p className="text-[8px] text-white/30 mt-1">Zmień filtry</p>
                    </div>
                  );
                }

                return entries.map(([vendor, models]) => {
                  const isExpanded = expandedChatGroups[vendor];
                  return (
                    <div key={vendor} className="flex flex-col">
                      <button 
                        onClick={() => setExpandedChatGroups(prev => ({ ...prev, [vendor]: !prev[vendor] }))}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-left group/v",
                          isExpanded && "text-gold-primary"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 size={13} className={cn("transition-colors", isExpanded ? "text-gold-primary" : "text-white/30 group-hover/v:text-white")} />
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none translate-y-px">{vendor}</span>
                          <span className="text-[8px] opacity-30">[{models.length}]</span>
                        </div>
                        <ChevronDown size={14} className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "opacity-40")} />
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden flex flex-col gap-1 pl-4 mt-1"
                          >
                            {models.map((m: Model) => {
                              return (
                                <div 
                                  key={m.id}
                                  onClick={() => setSelectedModel(m.id)}
                                  className={cn(
                                    "group relative flex items-center justify-between p-3 cursor-pointer rounded-xl transition-all duration-300 border",
                                    selectedModel === m.id 
                                      ? "bg-gold/10 border-gold-primary/30 shadow-lg" 
                                      : "border-transparent hover:bg-white/5 opacity-70 hover:opacity-100"
                                  )}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                                        {m.name.includes(':') ? m.name.split(':').pop()?.trim() : m.name}
                                      </span>
                                      {m.vision && (
                                        <span className="px-1 py-0.5 rounded bg-purple-500/20 text-[6px] font-black text-purple-400 uppercase">Vision</span>
                                      )}
                                    </div>
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest truncate">{m.id.split('-').pop()?.substring(0, 10)}</span>
                                  </div>
                                  {selectedModel === m.id && <Sparkles size={10} className="text-gold animate-pulse shrink-0 ml-2" />}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                });
              })()}
            </div>
            
            <div className="px-3 py-3 space-y-2">
                <div className="p-2.5 rounded-xl bg-(--bg-top) border border-gold-primary/20 flex items-center gap-2">
                   <Lock size={11} className="text-(--gold-primary)" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-gold-primary">AES-256 AKTYWNY</span>
                </div>
                <button 
                  onClick={() => setShowModels(false)}
                  className="w-full py-2 text-[8px] font-black uppercase tracking-widest text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  Zwiń
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drafter Panel Overlay Background (Mobile) */}
      <AnimatePresence>
        {showDrafter && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDrafter(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
          />
        )}
      </AnimatePresence>

      {/* Drafter Panel */}
      <DrafterPanel 
        isOpen={showDrafter}
        onClose={() => setShowDrafter(false)}
        chatMessages={messages.map((m: Message) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }))}
      />
    </div>
  );
}


function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="bg-(--bg-top)/50 p-3 lg:p-4 rounded-xl lg:rounded-2xl border-prestige hover:border-gold-small transition-all group flex flex-col items-center gap-1.5 hover:bg-(--bg-top)/70 shadow-lg cursor-default">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-white/5 flex items-center justify-center border-gold-small group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-(--text-primary)">{title}</p>
            <p className="text-[7px] lg:text-[8px] font-bold text-(--text-secondary) uppercase tracking-tighter">{desc}</p>
        </div>
    );
}

function MessageBubble({ msg }: { msg: Message }) {
    const isUser = msg.role === 'user';
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className={cn(
                "flex gap-2 group w-full",
                isUser ? "flex-row-reverse pl-4 md:pl-8" : "pr-4 md:pr-8"
            )}
        >
            <div className={cn(
                "w-7 h-7 rounded-xl shrink-0 flex items-center justify-center border transition-all shadow-lg relative overflow-hidden",
                isUser 
                    ? "bg-(--bg-top) border-(--gold-muted) text-(--gold-primary)" 
                    : "bg-(--bg-top) border-(--gold-muted) text-(--text-primary)"
            )}>
                {isUser ? <User size={14} /> : <Scale size={14} />}
                {/* Glow Overlay */}
                <div className={cn(
                    "absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity",
                    isUser ? "bg-(--bg-top)" : "bg-(--gold-primary)"
                )} />
            </div>

            <div className={cn(
                "flex flex-col gap-1.5 max-w-[90%]",
                isUser ? "items-end" : "items-start"
            )}>
                <div className={cn(
                    "relative px-4 py-3 rounded-2xl overflow-hidden bg-(--bg-top) transition-all hover:shadow-xl border-prestige",
                    isUser ? "rounded-tr-none" : "rounded-tl-none"
                )}>
                    {/* Visual Accents */}
                    <div className={cn(
                        "absolute top-0 w-32 h-1",
                        isUser ? "right-0 bg-(--bg-top)" : "left-0 bg-(--gold-primary)"
                    )} />

                    {!isUser && (
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={10} className="text-accent" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Kancelaria AI Core</span>
                        </div>
                    )}

                    <div className="text-[13px] leading-[1.65] font-medium text-text-primary prose dark:prose-invert max-w-none prose-p:mb-3 prose-strong:text-accent prose-strong:font-black prose-headings:text-text-primary prose-headings:font-black prose-headings:tracking-tighter prose-ul:list-disc prose-li:marker:text-accent">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                        </ReactMarkdown>
                    </div>

                    {/* Attachments Display */}
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-4">
                            {msg.attachments.map((att, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative group/att overflow-hidden rounded-2xl border-gold-gradient shadow-xl w-full max-w-[260px] xs:max-w-[300px] sm:max-w-[400px]"
                                >
                                    {att.type?.startsWith('image/') ? (
                                        <img 
                                            src={att.content} 
                                            alt={att.name} 
                                            className="w-full h-auto object-cover transition-transform duration-500 group-hover/att:scale-105"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 bg-slate-400/10 dark:bg-white/5">
                                            <FileText size={20} className="text-accent" />
                                            <span className="text-xs font-bold uppercase tracking-tighter truncate max-w-[150px]">{att.name}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center">
                                         <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all">
                                            <ExternalLink size={16} />
                                         </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-1.5">
                                <Search size={10} className="text-accent" /> Źródła
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {msg.sources.map((src, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg text-[9px] font-bold text-(--text-primary) border border-white/5 cursor-default">
                                        <FileText size={10} className="text-accent/60" />
                                        <span className="truncate max-w-[150px] uppercase tracking-tighter text-[8px]">{src}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2 px-2 opacity-30 group-hover:opacity-60 transition-opacity">
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                        {isUser ? 'Klient' : 'LexMind AI'}
                    </span>
                    <div className="h-1 w-1 rounded-full bg-slate-800" />
                    <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">
                        {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
