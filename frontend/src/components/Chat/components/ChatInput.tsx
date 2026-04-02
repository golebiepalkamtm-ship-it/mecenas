import { motion, AnimatePresence } from "framer-motion";
import { Plus, Paperclip, Square, Send, Stamp, X, Image as ImageIcon, FileText, AlertTriangle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useChatSettingsStore } from "../../../store/useChatSettingsStore";
import { useState, useLayoutEffect } from "react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Komponent do podglądu pliku/obrazu
function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const isImage = file.type.startsWith('image/');
  const extension = file.name.split('.').pop()?.toLowerCase();

  useLayoutEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      Promise.resolve().then(() => setImageUrl(url));
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file, isImage]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getIcon = () => {
    if (isImage && imageUrl) return null;
    if (extension === 'pdf') return <FileText className="w-6 h-6 text-rose-500" />;
    if (extension === 'docx' || extension === 'doc') return <FileText className="w-6 h-6 text-blue-500" />;
    if (extension === 'txt') return <FileText className="w-6 h-6 text-slate-400" />;
    return <ImageIcon className="w-6 h-6 text-sky-400" />;
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl flex items-center gap-3 text-[10px] font-bold group border border-white/10 shadow-xl overflow-hidden max-w-[200px]">
      {isImage && imageUrl ? (
        <div className="relative w-12 h-12 shrink-0">
          <img 
            src={imageUrl} 
            alt={file.name}
            className="w-full h-full object-cover rounded-l-xl"
          />
          <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent rounded-l-xl" />
          <div className="absolute right-0 top-0 bottom-0 w-px bg-white/10" />
        </div>
      ) : (
        <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-white/5 rounded-l-xl">
          {getIcon()}
        </div>
      )}
      
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-(--text-primary) truncate font-medium">
          {file.name}
        </div>
        <div className="text-gray-400 text-[8px]">
          {formatFileSize(file.size)}
        </div>
      </div>
      
      <button
        onClick={onRemove}
        className="w-6 h-6 mr-2 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500/20 transition-all shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  attachments: File[];
  addAttachment: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (idx: number) => void;
  handleSend: () => void;
  stopGeneration: () => void;
  newChat: () => void;
  onNavigateToDrafter: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  attachmentWarning?: string | null;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  attachments,
  addAttachment,
  removeAttachment,
  handleSend,
  stopGeneration,
  newChat,
  onNavigateToDrafter,
  fileInputRef,
  attachmentWarning,
}: ChatInputProps) {
  const { mode } = useChatSettingsStore();
  const isConsensus = mode === 'consensus';

  return (
    <div className="w-full flex flex-col gap-4 px-2">
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-2 lg:gap-3 overflow-hidden px-2"
          >
            {attachments.map((file, idx) => (
              <FilePreview
                key={idx}
                file={file}
                onRemove={() => removeAttachment(idx)}
              />
            ))}
            <span className="text-[10px] text-white/40 font-medium self-center ml-1">
              {attachments.length}/10
            </span>
          </motion.div>
        )}
        {attachmentWarning && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium mx-2"
          >
            <AlertTriangle size={14} />
            {attachmentWarning}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative glass-prestige p-2 lg:p-2.5 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-center gap-2 group/input transition-all shadow-2xl border border-transparent animate-border-shimmer">
        {/* Left Actions */}
        <div className="flex items-center gap-1.5 px-1">
          <motion.button
            onClick={() => {
              newChat();
              setInput("");
            }}
            whileHover={{ scale: 1.05, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shrink-0 flex items-center justify-center"
            title="Nowa sprawa"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Center: Input Field */}
        <div className="flex-1 relative glass-prestige-input rounded-[1.8rem] group-focus-within/input:border-white/30 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isConsensus
                ? "Zapytaj Konsylium... Zespół ekspercki przeanalizuje ten problem."
                : "Zadaj pytanie prawne do głównego asystenta..."
            }
            className="w-full bg-transparent px-5 py-4 pr-12 text-[14px] text-(--text-primary) focus:outline-hidden min-h-[80px] max-h-[400px] resize-none overflow-hidden placeholder:text-white/20 font-medium"
            rows={2}
          />
          <div className="absolute right-2.5 bottom-2.5">
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.1, rotate: -15 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-sky-400 hover:text-white hover:bg-sky-500 rounded-xl glass-prestige transition-all shadow-md group/paper"
            >
              <Paperclip className="w-5 h-5 group-hover/paper:rotate-12 transition-transform" />
            </motion.button>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,.docx,.txt"
              className="hidden"
              ref={fileInputRef}
              onChange={addAttachment}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 px-1">
          <AnimatePresence>
            {isLoading && (
              <motion.button
                initial={{ width: 0, opacity: 0, scale: 0.8 }}
                animate={{ width: "auto", opacity: 1, scale: 1 }}
                exit={{ width: 0, opacity: 0, scale: 0.8 }}
                onClick={stopGeneration}
                className="h-8 sm:h-9 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center gap-1.5 transition-all font-black text-[8px] tracking-widest uppercase overflow-hidden hover:bg-red-500 hover:text-white shadow-lg shadow-red-500/10"
              >
                <Square
                  className="w-3 h-3"
                  fill="currentColor"
                />
                STOP
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleSend}
            disabled={isLoading}
            whileHover={isLoading ? {} : { scale: 1.05, y: -2 }}
            whileTap={isLoading ? {} : { scale: 0.95 }}
            className={cn(
              "h-8 sm:h-9 px-4 rounded-xl flex items-center justify-center transition-all group relative overflow-hidden font-black text-[10px] tracking-widest shadow-xl",
              isLoading
                ? "bg-white/5 text-white/20 border border-white/5"
                : "bg-linear-to-br from-amber-300 to-amber-600 text-black hover:shadow-amber-500/30",
            )}
          >
            <Send size={14} fill="currentColor" />
            <span className="hidden lg:inline ml-1.5">WYŚLIJ</span>
          </motion.button>

          <motion.button
            onClick={onNavigateToDrafter}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-8 sm:h-9 px-3 rounded-xl flex items-center gap-1.5 font-black uppercase text-[8px] tracking-widest transition-all border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-white hover:text-blue-500 hover:border-white shadow-lg shadow-blue-500/10"
            title="Kreator Pism Prawnych"
          >
            <Stamp size={13} />
            <span className="hidden lg:inline">KREATOR</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
