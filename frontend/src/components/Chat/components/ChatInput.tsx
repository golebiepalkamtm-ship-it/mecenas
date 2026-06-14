import { motion, AnimatePresence } from "framer-motion";
import { Square, Send, X, Image as ImageIcon, AlertTriangle, CheckCircle2, Loader2, RefreshCcw, Mic, Paperclip, Plus, Filter, Gavel } from "lucide-react";
import { LexIcon } from "../../Layout/LexIcon";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useLayoutEffect, useCallback, useEffect, useRef } from "react";
import type { QueuedAttachment } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function FilePreview({ attachment, onRemove, onPreview }: { attachment: QueuedAttachment; onRemove: () => void; onPreview: () => void }) {
  const { file, status, progress } = attachment;
  const [imageUrl, setImageUrl] = useState<string>('');
  const isImage = file.type.startsWith('image/');
  const extension = file.name.split('.').pop()?.toLowerCase();

  useLayoutEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      Promise.resolve().then(() => setImageUrl(url));
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (extension === 'pdf' || extension === 'docx' || extension === 'doc' || extension === 'txt') {
      return <LexIcon name="file" size={20} />;
    }
    return <ImageIcon className="w-5 h-5 text-gold-primary" />;
  };

  const statusColors: Record<string, string> = {
    waiting: 'text-white/30',
    uploading: 'text-gold-primary',
    processing: 'text-amber-400',
    ready: 'text-gold-primary',
    error: 'text-red-400',
  };

  const borderColors: Record<string, string> = {
    waiting: 'rgba(255,255,255,0.05)',
    uploading: 'rgba(212,175,55,0.20)',
    processing: 'rgba(251,191,36,0.20)',
    ready: 'rgba(212,175,55,0.25)',
    error: 'rgba(248,113,113,0.25)',
  };

  return (
    <div className="relative group/wrapper">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -4 }}
        onClick={onPreview}
        className="relative flex items-center gap-2.5 rounded-xl overflow-hidden max-w-[200px] group/chip cursor-pointer hover:scale-[1.02] transition-transform"
        style={{
          background: "rgba(3, 3, 5, 0.90)",
          border: `1px solid ${borderColors[status] || "rgba(255,255,255,0.10)"}`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.50)",
        }}
      >
        {isImage && imageUrl ? (
          <div className="relative w-10 h-10 shrink-0">
            <img
              src={imageUrl}
              alt={file.name}
              className={cn("w-full h-full object-cover", status !== 'ready' && "opacity-40 grayscale")}
            />
            <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
            <div className="absolute right-0 inset-y-0 w-px bg-white/10" />
          </div>
        ) : (
          <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white/4">
            {getFileIcon()}
          </div>
        )}

        <div className="flex-1 min-w-0 py-2 pr-1">
          <div className="text-[10px] font-semibold text-white/75 truncate flex items-center gap-1">
            {file.name}
            {status === 'ready' && <CheckCircle2 className="w-3 h-3 text-gold-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] text-white/25">{formatFileSize(file.size)}</span>
            <span className={cn("text-[7px] uppercase tracking-wide font-bold", statusColors[status])}>
              {status === 'waiting' && <span className="flex items-center gap-0.5">Kolejka</span>}
              {status === 'uploading' && <span className="flex items-center gap-0.5"><Loader2 className="w-2 h-2 animate-spin inline" /> Upload</span>}
              {status === 'processing' && <span className="flex items-center gap-0.5"><RefreshCcw className="w-2 h-2 animate-spin inline" /> OCR</span>}
              {status === 'ready' && "Gotowy"}
              {status === 'error' && "Błąd"}
            </span>
          </div>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="w-5 h-5 mr-2 rounded-full flex items-center justify-center text-white/25 hover:text-white hover:bg-red-500/30 transition-all shrink-0 z-10"
        >
          <X size={10} />
        </button>

        {(status === 'uploading' || status === 'processing' || status === 'waiting') && (
          <div
            className="absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-700"
            style={{
              width: `${status === 'waiting' ? 5 : progress}%`,
              background: status === 'waiting' ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg, rgba(212,175,55,0.8), rgba(240,204,90,0.8))",
            }}
          />
        )}
      </motion.div>

      {status === 'ready' && attachment.extractedText && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[260px] p-3 rounded-2xl glass-prestige text-left opacity-0 translate-y-2 group-hover/wrapper:opacity-100 group-hover/wrapper:translate-y-0 pointer-events-none transition-all duration-300 z-50 shadow-2xl border border-white/10" style={{ background: "rgba(10, 12, 16, 0.95)" }}>
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
            <LexIcon name="file" size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Podgląd Oraz OCR</span>
          </div>
          <div className="text-[11px] text-white/80 leading-relaxed font-sans line-clamp-6 whitespace-pre-wrap break-all">
            {attachment.extractedText}
          </div>
        </div>
      )}
    </div>
  );
}

interface ChatInputProps {
  isLoading: boolean;
  attachments: QueuedAttachment[];
  addAttachment?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (idx: number) => void;
  onSend: (message: string) => void;
  stopGeneration: () => void;
  newChat: () => void;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  attachmentWarning?: string | null;
  useRagLegal: boolean;
  setUseRagLegal: (val: boolean) => void;
  useRagUser: boolean;
  setUseRagUser: (val: boolean) => void;
  actTerms: string[];
  setActTerms: React.Dispatch<React.SetStateAction<string[]>>;
  setIsActSelectorOpen: (v: boolean) => void;
  useSaos: boolean;
  setUseSaos: (val: boolean) => void;
  useEli: boolean;
  setUseEli: (val: boolean) => void;
  onOpenLibrary: (mode: 'all' | 'documents' | 'images') => void;
  onPreviewDoc: (att: QueuedAttachment) => void;
  onOpenTrialRoom?: () => void;
  canOpenTrialRoom?: boolean;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart?: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function ChatInput({
  isLoading,
  attachments,
  removeAttachment,
  onSend,
  stopGeneration,
  imageInputRef,
  attachmentWarning,
  onOpenLibrary,
  useRagLegal,
  setUseRagLegal,
  useRagUser,
  setUseRagUser,
  actTerms,
  setIsActSelectorOpen,
  useSaos,
  setUseSaos,
  useEli,
  setUseEli,
  newChat,
  onPreviewDoc,
  onOpenTrialRoom,
  canOpenTrialRoom = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(() => Array.from({ length: 12 }, () => 0.12));
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const stopVisualizer = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    if (mountedRef.current) {
      setAudioLevels(Array.from({ length: 12 }, () => 0.12));
    }
  }, []);

  const stopListeningSession = useCallback(() => {
    recognitionRef.current?.stop();
    stopVisualizer();
    if (mountedRef.current) {
      setIsListening(false);
    }
  }, [stopVisualizer]);

  const startVisualizer = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Ta przeglądarka nie udostępnia mikrofonu dla wizualizatora.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('Ta przeglądarka nie wspiera Web Audio API.');
    }

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const bars = 12;

    streamRef.current = stream;
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const tick = () => {
      if (!mountedRef.current || !analyserRef.current) {
        return;
      }

      analyserRef.current.getByteFrequencyData(buffer);
      const bucketSize = Math.max(1, Math.floor(buffer.length / bars));
      const nextLevels = Array.from({ length: bars }, (_, index) => {
        const start = index * bucketSize;
        const end = Math.min(buffer.length, start + bucketSize);
        let sum = 0;
        for (let i = start; i < end; i += 1) {
          sum += buffer[i];
        }
        const average = end > start ? sum / (end - start) : 0;
        return Math.max(0.12, average / 255);
      });

      setAudioLevels(nextLevels);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (typeof window !== 'undefined') {
      const win = window as unknown as { SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
      const SpeechRecognitionConstructor = (win.SpeechRecognition || win.webkitSpeechRecognition) as { new(): SpeechRecognition } | undefined;
      if (SpeechRecognitionConstructor && !recognitionRef.current) {
        const reco = new SpeechRecognitionConstructor();
        reco.continuous = true;
        reco.interimResults = true;
        reco.lang = 'pl-PL';
        reco.onstart = () => {
          if (mountedRef.current) {
            setIsListening(true);
            setVoiceError(null);
          }
        };

        reco.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setValue((prev: string) => (prev ? prev + ' ' : '') + finalTranscript);
          }
        };

        reco.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error', event.error);
          const messageMap: Record<string, string> = {
            'not-allowed': 'Brak zgody na użycie mikrofonu.',
            'service-not-allowed': 'Rozpoznawanie mowy jest zablokowane w tej przeglądarce.',
            'audio-capture': 'Nie udało się pobrać dźwięku z mikrofonu.',
            'network': 'Usługa rozpoznawania mowy nie odpowiedziała.',
            'no-speech': 'Nie wykryto mowy. Spróbuj ponownie.',
          };
          setVoiceError(messageMap[event.error] || 'Nie udało się uruchomić dyktowania.');
          stopVisualizer();
          setIsListening(false);
        };

        reco.onend = () => {
          stopVisualizer();
          setIsListening(false);
        };

        recognitionRef.current = reco;
      }
    }

    return () => {
      mountedRef.current = false;
      recognitionRef.current?.stop();
      stopVisualizer();
    };
  }, [stopVisualizer]);

  const toggleListen = useCallback(async () => {
    if (isListening) {
      stopListeningSession();
      return;
    }

    if (!recognitionRef.current) {
      setVoiceError('Ta przeglądarka nie wspiera rozmów głosowych.');
      return;
    }

    try {
      setVoiceError(null);
      await startVisualizer();
      recognitionRef.current.start();
    } catch (error) {
      stopVisualizer();
      const message = error instanceof Error ? error.message : 'Nie udało się włączyć mikrofonu.';
      setVoiceError(message);
      setIsListening(false);
    }
  }, [isListening, startVisualizer, stopListeningSession, stopVisualizer]);

  const handleInternalSend = useCallback(() => {
    if (!value.trim() && attachments.length === 0) return;
    onSend(value);
    setValue("");
  }, [value, attachments.length, onSend]);

  const handleNewChat = useCallback(() => {
    setValue("");
    newChat();
  }, [newChat]);

  return (
    <div className="w-full flex flex-col gap-3 px-0">
      <AnimatePresence>
        {voiceError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl mx-2 border text-[11px] font-medium"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.18)',
              color: 'rgba(252,165,165,0.95)',
            }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            {voiceError}
          </motion.div>
        )}

        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-2 px-2 overflow-hidden"
          >
            {attachments.map((att, idx) => (
              <FilePreview
                key={att.id ? String(att.id) : `attachment-${idx}`}
                attachment={att}
                onRemove={() => removeAttachment(idx)}
                onPreview={() => onPreviewDoc(att)}
              />
            ))}
            <span className="text-[9px] text-white/25 font-bold uppercase tracking-wider self-center ml-1">
              Plików: {attachments.length}
            </span>
          </motion.div>
        )}

        {attachmentWarning && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl mx-2 border text-[11px] font-medium"
            style={{
              background: 'rgba(245,158,11,0.08)',
              borderColor: 'rgba(245,158,11,0.20)',
              color: 'rgba(252,211,77,0.9)',
            }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            {attachmentWarning}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full rounded-[2.5rem] border p-3 md:p-4 transition-all glass-liquid-convex shadow-2xl">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch min-h-[96px] md:min-h-[108px]">
          <div
            className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-2 md:p-2.5"
            aria-label="Narzędzia czatu"
          >
            <div className="flex flex-col justify-center gap-1.5 text-white/40 min-h-[72px] md:min-h-[80px]">
              <div className="flex flex-row items-center justify-start gap-1">
                <button 
                  onMouseEnter={() => setHoveredAction('new_chat')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={handleNewChat} 
                  className="p-2 hover:bg-cyan-500/10 rounded-xl transition-all group/btn-new"
                >
                  <Plus size={18} className="group-hover/btn-new:scale-110 transition-transform text-black group-hover/btn-new:text-cyan-400" style={{ filter: 'var(--neon-cyan)' }} />
                </button>
                {onOpenTrialRoom && (
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredAction('trial')} 
                    onMouseLeave={() => setHoveredAction(null)} 
                    onClick={onOpenTrialRoom}
                    disabled={!canOpenTrialRoom}
                    className={cn(
                      'p-2 rounded-xl transition-all group/btn-trial',
                      canOpenTrialRoom ? 'hover:bg-amber-500/15' : 'opacity-35 cursor-not-allowed',
                    )}
                  >
                    <Gavel
                      size={18}
                      className={cn(
                        'transition-transform text-black group-hover/btn-trial:scale-110',
                        canOpenTrialRoom && 'text-amber-700',
                      )}
                    />
                  </button>
                )}
                <button 
                  onMouseEnter={() => setHoveredAction('attach')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={() => imageInputRef.current?.click()} 
                  className="p-2 hover:bg-fuchsia-500/10 rounded-xl transition-all group/btn-attach"
                >
                  <Paperclip size={18} className="group-hover/btn-attach:scale-110 transition-transform text-black group-hover/btn-attach:text-fuchsia-400" style={{ filter: 'var(--neon-fuchsia)' }} />
                </button>
                <button 
                  onMouseEnter={() => setHoveredAction('docs')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={() => onOpenLibrary('documents')} 
                  className="p-2 hover:bg-green-500/10 rounded-xl transition-all group/btn-doc"
                >
                  <LexIcon name="documents" size={18} className="group-hover/btn-doc:scale-110 transition-transform" style={{ filter: 'var(--neon-green)' }} />
                </button>
                <button
                  onMouseEnter={() => setHoveredAction('raglegal')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={(e) => { e.stopPropagation(); setUseRagLegal(!useRagLegal); }}
                  className={cn('p-2 rounded-xl transition-all flex items-center justify-center relative group/btn-raglegal', useRagLegal ? 'text-gold-primary bg-gold-primary/5 border border-gold-primary/10 shadow-lg' : 'text-white/15 hover:bg-white/5')}
                >
                  <LexIcon name="knowledge" size={18} className={cn('transition-transform group-hover/btn-raglegal:scale-110', useRagLegal ? 'animate-pulse' : '')} style={{ filter: useRagLegal ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.8))' : 'none' }} />
                  <div className={cn('absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black z-20', useRagLegal ? 'bg-gold-primary' : 'bg-white/10')} />
                </button>
                <AnimatePresence>
                  {(useRagLegal || useRagUser) && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onMouseEnter={() => setHoveredAction('filter')} 
                      onMouseLeave={() => setHoveredAction(null)} 
                      onClick={(e) => { e.stopPropagation(); setIsActSelectorOpen(true); }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center relative"
                    >
                      <Filter size={16} className={actTerms.length > 0 ? 'text-gold-primary' : 'text-white/40'} />
                      {actTerms.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-gold-primary text-[8px] font-black text-black flex items-center justify-center">{actTerms.length}</span>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-row items-center justify-start gap-1">
                <button
                  onMouseEnter={() => setHoveredAction('raguser')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={(e) => { e.stopPropagation(); setUseRagUser(!useRagUser); }}
                  className={cn('p-2 rounded-xl transition-all flex items-center justify-center relative group/btn-raguser', useRagUser ? 'text-gold-primary bg-gold-primary/5 border border-gold-primary/10 shadow-lg' : 'text-white/15 hover:bg-white/5')}
                >
                  <LexIcon name="documents" size={18} className={cn('transition-transform group-hover/btn-raguser:scale-110', useRagUser ? 'animate-pulse' : '')} style={{ filter: useRagUser ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.8))' : 'none' }} />
                  <div className={cn('absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black z-20', useRagUser ? 'bg-gold-primary' : 'bg-white/10')} />
                </button>
                <button
                  onMouseEnter={() => setHoveredAction('saos')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={(e) => { e.stopPropagation(); setUseSaos(!useSaos); }}
                  className={cn('p-2 rounded-xl transition-all flex items-center justify-center relative group/btn-saos', useSaos ? 'text-gold-primary bg-gold-primary/5 border border-gold-primary/10 shadow-lg' : 'text-white/15 hover:bg-white/5')}
                >
                  <LexIcon name="judgments" size={18} className={cn('transition-transform group-hover/btn-saos:scale-110', useSaos ? 'animate-pulse' : '')} style={{ filter: useSaos ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.8))' : 'none' }} />
                  <div className={cn('absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black z-20', useSaos ? 'bg-gold-primary' : 'bg-white/10')} />
                </button>
                <button
                  onMouseEnter={() => setHoveredAction('eli')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={(e) => { e.stopPropagation(); setUseEli(!useEli); }}
                  className={cn('p-2 rounded-xl transition-all flex items-center justify-center relative group/btn-eli', useEli ? 'text-gold-primary bg-gold-primary/5 border border-gold-primary/10 shadow-lg' : 'text-white/15 hover:bg-white/5')}
                >
                  <LexIcon name="book" size={18} className={cn('transition-transform group-hover/btn-eli:scale-110', useEli ? 'animate-pulse' : '')} style={{ filter: useEli ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.8))' : 'none' }} />
                  <div className={cn('absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black z-20', useEli ? 'bg-gold-primary' : 'bg-white/10')} />
                </button>
                <button
                  onMouseEnter={() => setHoveredAction('mic')} 
                  onMouseLeave={() => setHoveredAction(null)} 
                  onClick={toggleListen}
                  className={cn('p-2 rounded-xl transition-all flex items-center justify-center relative shadow-xs group/btn-mic', isListening ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'hover:bg-red-500/10')}
                >
                  {isListening && (
                    <motion.div layoutId="mic-pulse" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.6, 1], opacity: [0, 0.4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 bg-red-500 rounded-xl" />
                  )}
                  <Mic size={18} className={cn('relative z-10 text-black group-hover/btn-mic:text-red-400', isListening && 'text-red-400')} style={{ filter: isListening ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : 'none' }} />
                </button>
                <AnimatePresence>
                  {isListening && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-end justify-start gap-0.5 h-9 px-1.5 rounded-xl border border-red-500/15 bg-red-500/5 overflow-hidden"
                      aria-label="Wizualizator mikrofonu"
                    >
                      {audioLevels.map((level, index) => (
                        <motion.span key={index} animate={{ height: `${Math.max(20, Math.round(level * 100))}%` }} transition={{ duration: 0.12, ease: 'easeOut' }} className="w-1 rounded-full bg-linear-to-t from-red-500/70 via-red-400 to-white" style={{ minHeight: 6 }} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {hoveredAction && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute bottom-full left-4 mb-2 w-64 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">
                      {hoveredAction === 'new_chat' ? 'Nowa Konsultacja' :
                       hoveredAction === 'attach' ? 'Załącz Plik' :
                       hoveredAction === 'docs' ? 'Biblioteka Dokumentów' :
                       hoveredAction === 'raglegal' ? 'Baza Prawna LexMind' :
                       hoveredAction === 'filter' ? 'Filtrowanie Bazy' :
                       hoveredAction === 'raguser' ? 'Twoja Prywatna Baza' :
                       hoveredAction === 'saos' ? 'Orzecznictwo (SAOS)' :
                       hoveredAction === 'eli' ? 'Akty Prawne (ELI)' :
                       hoveredAction === 'mic' ? 'Wprowadzanie Głosowe' :
                       hoveredAction === 'trial' ? 'Sala Rozpraw' :
                       hoveredAction === 'send' ? 'Wyślij Wiadomość' : ''}
                    </p>
                    <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider mb-1.5">
                      {hoveredAction === 'new_chat' ? 'Rozpoczyna nowy wątek analizy prawnej od zera.' :
                       hoveredAction === 'attach' ? 'Pozwala wgrać dokumenty (PDF, DOCX) lub zdjęcia, by sztuczna inteligencja mogła je przeanalizować.' :
                       hoveredAction === 'docs' ? 'Otwiera bibliotekę zapisanych plików przypisanych do Twojej sprawy/kancelarii.' :
                       hoveredAction === 'raglegal' ? 'Włącza wyszukiwanie kontekstowe w wbudowanej bazie wiedzy.' :
                       hoveredAction === 'filter' ? 'Pozwala zawęzić wyszukiwanie do konkretnych ustaw, aktów lub tagów.' :
                       hoveredAction === 'raguser' ? 'Włącza uwzględnianie w odpowiedziach wszystkich wgranych przez Ciebie dokumentów i notatek.' :
                       hoveredAction === 'saos' ? 'Nakazuje systemowi przeszukać bazę orzeczeń Sądów (SN, NSA, SA) w poszukiwaniu podobnych spraw.' :
                       hoveredAction === 'eli' ? 'Włącza wyszukiwanie konkretnych przepisów i definicji bezpośrednio w Dziennikach Ustaw.' :
                       hoveredAction === 'mic' ? 'Umożliwia podyktowanie zapytania przez mikrofon zamiast pisania na klawiaturze.' :
                       hoveredAction === 'trial' ? 'Przenosi sprawę do wirtualnej sali sądowej, jeśli zgromadzono wystarczający materiał dowodowy.' :
                       hoveredAction === 'send' ? 'Przesyła zapytanie i dokumenty do analizy przez wybranych ekspertów AI.' : ''}
                    </p>
                    <div className="absolute top-full left-6 -mt-px w-2 h-2 bg-white border-r border-b border-black/10 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div
            className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-white/5 p-2 md:p-2.5 flex items-end gap-2 transition-all group/input min-h-[72px] md:min-h-[80px]"
            aria-label="Pole wiadomości"
          >
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleInternalSend();
              }
            }}
            placeholder={isListening ? 'Słucham...' : 'Opisz swój problem prawny...'}
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none px-3 py-3 text-sm md:text-base text-white placeholder-white/40 min-h-[72px] md:min-h-[80px] max-h-[240px] overflow-y-auto leading-relaxed"
            rows={3}
            style={{ caretColor: '#d4af37' }}
          />

          <div className="shrink-0 self-end pb-0.5 relative">
            <motion.button
              onMouseEnter={() => setHoveredAction('send')} 
              onMouseLeave={() => setHoveredAction(null)} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading || (!value.trim() && attachments.length === 0)}
              onClick={isLoading ? stopGeneration : handleInternalSend}
              className={cn(
                'h-12 w-12 flex items-center justify-center rounded-2xl transition-all group/btn-send',
                isLoading
                  ? 'bg-gold-primary/10 text-gold-primary border border-gold-primary/20'
                  : (!value.trim() && attachments.length === 0)
                    ? 'bg-black/10 text-stone-400 cursor-not-allowed'
                    : 'bg-gold-primary/15 text-gold-primary border border-gold-primary/35 hover:bg-gold-primary hover:text-white hover:border-gold-primary/50 shadow-[0_0_14px_rgba(212,175,55,0.4)]'
              )}
              style={
                isLoading || value.trim() || attachments.length > 0
                  ? { filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.65))' }
                  : undefined
              }
            >
              {isLoading ? (
                <Square size={16} fill="currentColor" />
              ) : (
                <Send
                  size={16}
                  fill="currentColor"
                  className="-mt-1 mr-0.5 transition-colors group-hover/btn-send:text-white"
                />
              )}
            </motion.button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
