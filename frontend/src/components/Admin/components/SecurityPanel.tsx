import { useState } from "react";
import { 
  Plus, 
  X, 
  Trash2, 
  Key, 
  ShieldCheck, 
  Ban, 
  CheckCircle2, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { detectProvider } from "../../../utils/apiDetector";
import { SectionHeading } from "./Shared";

interface SecurityPanelProps {
  providers: any[];
  onToggleProvider: (id: string) => void;
  onUpdateKey: (id: string, key: string) => void;
  onAddProvider: (name: string, key?: string) => void;
  onRemoveProvider: (id: string) => void;
}

export function SecurityPanel({
  providers,
  onToggleProvider,
  onUpdateKey,
  onAddProvider,
  onRemoveProvider,
}: SecurityPanelProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState("");
  const [detectedProvider, setDetectedProvider] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-prestige rounded-3xl p-8 border border-white/60 bg-white/40 shadow-[0_40px_80px_rgba(0,0,0,0.1),inset_0_2px_10px_rgba(255,255,255,0.9)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <SectionHeading
            title="Zarządzanie API"
            subtitle="Konfiguracja kluczy i dostawców usług AI"
          />
          
          <div className="flex items-center gap-2">
            {isAdding ? (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-2 bg-white/5 p-4 rounded-2xl border border-black/10">
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewKey(val);
                      setDetectedProvider(detectProvider(val));
                    }}
                    placeholder="Wklej klucz API..."
                    className="h-10 px-4 rounded-xl glass-prestige bg-white/10 text-[10px] font-mono text-black outline-none border border-white/40 focus:border-gold-primary transition-all w-64 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                  />
                  {detectedProvider && (
                    <p className="text-[9px] font-black uppercase text-emerald-500 italic ml-1">
                      Wykryto: {detectedProvider}
                    </p>
                  )}
                </div>
                
                <input
                  type="text"
                  value={detectedProvider}
                  onChange={(e) => setDetectedProvider(e.target.value)}
                  placeholder="Firma / Dostawca"
                  className="h-10 px-4 rounded-xl glass-prestige bg-white/10 text-[10px] font-black uppercase tracking-widest text-black outline-none border border-white/40 focus:border-gold-primary transition-all w-48 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                />

                <button
                  onClick={() => {
                    if (detectedProvider && newKey) {
                      onAddProvider(detectedProvider, newKey);
                      setNewKey("");
                      setDetectedProvider("");
                      setIsAdding(false);
                    }
                  }}
                  disabled={!detectedProvider || !newKey}
                  className="h-10 px-6 rounded-xl glass-prestige bg-gold-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 border border-gold-primary/40 shadow-[0_10px_20px_rgba(212,175,55,0.2),inset_0_1px_2px_rgba(255,255,255,0.4)]"
                >
                  ZAPISZ
                </button>

                <button
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 rounded-xl glass-prestige flex items-center justify-center text-red-700 hover:bg-red-500/10 transition-all border border-black/5 shadow-[0_4px_10px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.8)]"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
               <button
                onClick={() => setIsAdding(true)}
                className="h-10 px-4 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/65 inline-flex items-center gap-2 hover:text-black transition-all bg-white/20 border border-white/60 shadow-[0_4px_10px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.8)]"
              >
                <Plus size={14} />
                Nowy Klucz API
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all duration-500",
                p.active
                  ? "bg-white/10 border-black/10 shadow-lg"
                  : "bg-black/5 border-black/5 grayscale opacity-60",
              )}
            >
              <div className="px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-inner",
                    p.active ? "bg-white/10 border-black/10 text-black" : "bg-black/10 border-black/5 text-black/20"
                  )}>
                    <Key size={16} className={cn(p.active && "animate-pulse")} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black uppercase tracking-[0.1em] text-black italic">
                      {p.name}
                    </h4>
                    <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-black/30 block italic">
                      ID: {p.id}
                    </span>
                  </div>
                </div>

                <div className="flex-1 max-w-2xl relative">
                  <input
                    type={showKeys[p.id] ? "text" : "password"}
                    value={p.key}
                    onChange={(e) => onUpdateKey(p.id, e.target.value)}
                    placeholder="Wprowadź klucz API..."
                    className="w-full h-10 bg-white/10 border border-white/40 rounded-xl px-12 text-[10px] font-mono text-black placeholder:text-black/10 outline-none focus:border-gold-primary transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20">
                    <ShieldCheck size={16} />
                  </div>
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors"
                  >
                    {showKeys[p.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleProvider(p.id)}
                    className={cn(
                      "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border shadow-sm",
                      p.active
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"
                        : "bg-white/5 border-black/10 text-black/40 hover:text-black",
                    )}
                  >
                    {p.active ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        AKTYWNY
                      </>
                    ) : (
                      <>
                        <Ban size={14} />
                        WYŁĄCZONY
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onRemoveProvider(p.id)}
                    hidden={["openrouter", "google", "openai", "anthropic", "mindee"].includes(p.id)}
                    className="h-10 w-10 rounded-xl glass-prestige flex items-center justify-center text-black/20 hover:text-red-500 hover:bg-red-500/5 transition-all border border-black/5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
