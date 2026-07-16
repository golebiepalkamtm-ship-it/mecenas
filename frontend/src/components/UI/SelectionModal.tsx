import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectionOption {
  id: string;
  label: string;
  description?: string;
  impact?: string;
  icon?: React.ReactNode;
}

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: SelectionOption[];
  value: string;
  onChange: (val: string) => void;
}

export function SelectionModal({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  value,
  onChange,
}: SelectionModalProps) {
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              className="w-full max-w-4xl max-h-full flex flex-col glass-prestige border border-white/20 shadow-2xl rounded-3xl pointer-events-auto bg-white/70 overflow-hidden"
            >
              {/* Header */}
              <div className="shrink-0 flex items-center justify-between p-6 border-b border-black/10 bg-white/40">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-black font-outfit">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[10px] text-black/50 font-bold uppercase tracking-widest mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-black/5 border border-black/10 text-black/50 hover:text-black hover:bg-black/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content / Grid */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {options.map((opt) => {
                    const isSelected = value === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          onChange(opt.id);
                          onClose();
                        }}
                        className={cn(
                          "group text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col",
                          isSelected
                            ? "bg-white border-gold-primary shadow-md scale-[1.02]"
                            : "bg-white/50 border-black/10 hover:bg-white hover:border-black/30 hover:-translate-y-1 hover:shadow-sm"
                        )}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gold-primary/20 text-gold-primary flex items-center justify-center">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                          {opt.icon && (
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors",
                              isSelected 
                                ? "bg-gold-primary/10 border-gold-primary/30 text-gold-primary" 
                                : "bg-black/5 border-black/10 text-black/60 group-hover:text-black"
                            )}>
                              {opt.icon}
                            </div>
                          )}
                          <div className="pr-8">
                            <h3 className={cn(
                              "text-[11px] font-black uppercase tracking-wider",
                              isSelected ? "text-black" : "text-black/80 group-hover:text-black"
                            )}>
                              {opt.label}
                            </h3>
                          </div>
                        </div>

                        {opt.description && (
                          <p className="text-[10px] leading-relaxed text-black/60 mb-3 flex-1 font-medium">
                            {opt.description}
                          </p>
                        )}

                        {opt.impact && (
                          <div className="mt-auto pt-3 border-t border-black/5">
                            <span className="text-[8px] font-black uppercase tracking-widest text-gold-primary mb-1 block">Wpływ na sprawę</span>
                            <p className="text-[9px] font-bold text-black/70 leading-snug">
                              {opt.impact}
                            </p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
