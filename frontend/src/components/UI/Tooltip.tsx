import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface TooltipProps {
  children: React.ReactNode;
  title?: string;
  content: React.ReactNode;
  impact?: string;
  delay?: number;
  position?: 'top' | 'bottom';
}

export function Tooltip({ children, title, content, impact, delay = 0.3, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<any>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setCoords({ x: e.clientX, y: e.clientY });
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setCoords({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full"
      >
        {children}
      </div>
      
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isVisible && (
            <div
              style={{
                position: 'fixed',
                left: coords.x,
                top: position === 'top' ? coords.y - 8 : coords.y + 8,
                transform: position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                zIndex: 99999,
                pointerEvents: 'none'
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : -5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ originX: 0.5, originY: position === 'top' ? 1 : 0 }}
                className="w-max max-w-[260px]"
              >
                <div className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-[0_15px_35px_rgba(0,0,0,0.2)] rounded-2xl p-4 text-left relative">
                   {title && (
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-1.5">{title}</h4>
                   )}
                   <div className="text-[10px] font-medium text-black/70 leading-relaxed">{content}</div>
                   {impact && (
                     <div className="text-[9px] font-black uppercase tracking-wider text-gold-primary mt-2 pt-2 border-t border-black/5">
                       Wpływ: <span className="font-bold text-black/80">{impact}</span>
                     </div>
                   )}
                   <div 
                     className={cn(
                       "absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-black/10 rotate-45 backdrop-blur-xl",
                       position === 'top' ? "bottom-[-6px] border-t-0 border-l-0" : "top-[-6px] border-b-0 border-r-0"
                     )} 
                   />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
