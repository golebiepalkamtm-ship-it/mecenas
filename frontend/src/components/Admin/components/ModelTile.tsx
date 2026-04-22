import { Zap, Star, ShieldCheck, Globe, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";
import type { Model } from "../../Chat/types";
import { getBrand } from "../utils";
import type { ModelHealth } from "../../../hooks/useModelHealth";

interface ModelTileProps {
  model: Model;
  isEnabled: boolean;
  latency?: number;
  health?: ModelHealth;
  onToggle: () => void;
}

export function ModelTile({
  model,
  isEnabled,
  latency,
  health,
  onToggle,
}: ModelTileProps) {
  const brand = getBrand(model.provider || (model.id.includes('/') ? model.id.split('/')[0] : 'unknown'));
  const cleanName = model.name.includes(':') ? model.name.split(':').slice(1).join(':').trim() : model.name;

  const isOnline = health?.status === 'online' || (latency && latency > 0);
  const statusColor = isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-white/20';

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={cn(
        'glass-prestige group relative flex items-center justify-between p-3 rounded-2xl border transition-all duration-500 h-[65px] w-full text-left overflow-hidden',
        isEnabled 
            ? 'bg-black/10 border-gold-primary/40 shadow-[0_10px_20px_rgba(0,0,0,0.1),inset_0_1px_4px_rgba(255,255,255,0.4)]' 
            : 'bg-white/40 border-white/60 hover:bg-white/60 hover:border-white/80 shadow-[0_4px_8px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.8)]'
      )}
    >
      {/* Background Accent for Enabled state */}
      {isEnabled && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/5 blur-[40px] pointer-events-none" />
      )}

      <div className="flex items-center gap-3 min-w-0 pr-4 relative z-10">
        {/* Icon Left with Glow */}
        <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-500", 
            isEnabled 
                ? "bg-gold-primary/10 border-gold-primary/30 text-gold-primary shadow-[0_0_10px_rgba(212,175,55,0.1)]" 
                : "bg-black/5 border-black/5 text-black/20 group-hover:text-black group-hover:border-black/20"
        )}>
          <brand.icon size={16} strokeWidth={2.5} />
          
          {/* Status Dot */}
          <div className={cn(
              "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white transition-colors duration-500",
              statusColor
          )} />
        </div>
        
        {/* Content Center */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
             <span className={cn(
                "text-[11px] font-black uppercase tracking-tight leading-tight truncate italic transition-colors duration-500", 
                isEnabled ? "text-black" : "text-black/40 group-hover:text-black"
            )}>
                {cleanName || model.id}
            </span>
            {model.vision && <Zap size={7} className="text-emerald-400 shrink-0" fill="currentColor" />}
          </div>
          
           <div className="flex items-center gap-1.5 mt-0">
            <span className="text-[6.5px] text-black/50 font-black uppercase tracking-[0.2em] font-outfit">
                {(model.provider || 'unknown').toUpperCase()}
            </span>
            <div className="w-0.5 h-0.5 rounded-full bg-black/20" />
            <span className="text-[6.5px] text-black/70 font-bold tabular-nums">
                {latency ? `${latency}ms` : '---'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
               {model.context_length && (
                <div className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-black/10 border border-black/10">
                    <Globe size={6} className="text-black/50" />
                    <span className="text-[6px] text-black/80 font-black tracking-wider">
                        {Math.round(model.context_length / 1024)}K
                    </span>
                </div>
              )}
              {model.pricing && model.pricing.prompt && (
                <div className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-gold-primary border border-gold-primary shadow-[0_0_5px_rgba(212,175,55,0.3)]">
                    <ShieldCheck size={6} className="text-black/60" />
                    <span className="text-[6px] text-black font-black">
                        ${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}
                    </span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Select Toggle Right */}
       <div className={cn(
          "shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border", 
          isEnabled 
            ? "bg-gold-primary text-black border-gold-primary shadow-[0_10px_20px_rgba(212,175,55,0.2)]" 
            : "bg-black/5 text-black/10 border-black/5 group-hover:border-black/20 group-hover:text-black/40"
      )}>
          <Star size={20} fill={isEnabled ? "currentColor" : "none"} strokeWidth={isEnabled ? 0 : 2.5} />
      </div>

       {/* Hover Info Tooltip (Subtle) */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <Info size={12} className="text-black/10" />
      </div>
    </motion.button>
  );
}

