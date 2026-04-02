import { 
  Sparkles, 
  Target, 
  Cpu, 
  Zap, 
  Shield, 
  Building2,
  Search,
  Globe,
  Wind,
  Flame,
  Activity
} from "lucide-react";
import type { BrandConfig } from "./types";

export const BRAND_MAP: Record<string, BrandConfig> = {
  'GOOGLE': { icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-400/20', accent: 'blue' },
  'ANTHROPIC': { icon: Target, color: 'text-amber-200', bg: 'bg-amber-200/5', border: 'border-amber-200/20', accent: 'amber' },
  'OPENAI': { icon: Cpu, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-400/20', accent: 'emerald' },
  'META': { icon: Globe, color: 'text-sky-500', bg: 'bg-sky-500/5', border: 'border-sky-500/20', accent: 'sky' },
  'MISTRAL': { icon: Wind, color: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-400/20', accent: 'orange' },
  'DEEPSEEK': { icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-600/5', border: 'border-indigo-600/20', accent: 'indigo' },
  'GROQ': { icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/5', border: 'border-rose-400/20', accent: 'rose' },
  'PERPLEXITY': { icon: Search, color: 'text-teal-400', bg: 'bg-teal-500/5', border: 'border-teal-400/20', accent: 'teal' },
  'X-AI': { icon: Flame, color: 'text-white', bg: 'bg-white/5', border: 'border-white/20', accent: 'slate' },
  'TOGETHER': { icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-400/20', accent: 'purple' },
  'FIREWORKS': { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/5', border: 'border-yellow-400/20', accent: 'yellow' },
};

export const normalizeVendor = (name: string, id: string): string => {
  if (name.includes(":")) return name.split(":")[0].trim().toUpperCase();
  if (id.includes("/")) return id.split("/")[0].trim().toUpperCase();
  return "UNKNOWN";
};

export const getBrand = (vendor: string): BrandConfig => 
  BRAND_MAP[vendor.toUpperCase()] || { 
    icon: Building2, 
    color: 'text-white/40', 
    bg: 'bg-white/5', 
    border: 'border-white/10', 
    accent: 'slate' 
  };

export const DEFAULT_AGGREGATOR = ""; // No default aggregator
