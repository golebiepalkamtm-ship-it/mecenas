import { 
  Sparkles, 
  Target, 
  Cpu, 
  Globe, 
  Wind, 
  Shield, 
  Flame, 
  Building2 
} from "lucide-react";
import type { Model } from "../Chat/types";
import type { UserProfile } from "./types";

export const BRAND_MAP: Record<string, any> = {
  'GOOGLE': { icon: Sparkles, color: 'text-black', bg: 'bg-blue-500/10', border: 'border-blue-400/20', accent: 'blue' },
  'ANTHROPIC': { icon: Target, color: 'text-black', bg: 'bg-amber-200/5', border: 'border-amber-200/20', accent: 'amber' },
  'OPENAI': { icon: Cpu, color: 'text-black', bg: 'bg-emerald-500/10', border: 'border-emerald-400/20', accent: 'emerald' },
  'META': { icon: Globe, color: 'text-black', bg: 'bg-sky-500/5', border: 'border-sky-500/20', accent: 'sky' },
  'MISTRAL': { icon: Wind, color: 'text-black', bg: 'bg-orange-500/5', border: 'border-orange-400/20', accent: 'orange' },
  'DEEPSEEK': { icon: Shield, color: 'text-black', bg: 'bg-indigo-600/5', border: 'border-indigo-600/20', accent: 'indigo' },
  'X-AI': { icon: Flame, color: 'text-black', bg: 'bg-white/5', border: 'border-black/20', accent: 'slate' },
  'OPENROUTER': { icon: Globe, color: 'text-black', bg: 'bg-orange-500/10', border: 'border-orange-500/20', accent: 'orange' },
};

export const getBrand = (vendor: string) => 
  BRAND_MAP[vendor.toUpperCase()] || { 
    icon: Building2, 
    color: 'text-black', 
    bg: 'bg-white/5', 
    border: 'border-black/10',
    accent: 'slate'
  };

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("pl-PL").format(value);

export const formatDate = (raw: string): string => {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Brak daty";
  return parsed.toLocaleDateString("pl-PL");
};

export const mapProfileRow = (row: unknown): UserProfile | null => {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  return {
    id,
    email: typeof record.email === "string" ? record.email : null,
    role: typeof record.role === "string" ? record.role : "user",
    created_at: typeof record.created_at === "string" ? record.created_at : new Date().toISOString(),
  };
};

export const mapModelRow = (row: unknown): Model | null => {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name : id;
  return { 
    id, 
    name, 
    vision: Boolean(record.vision), 
    free: Boolean(record.free) || id.includes(":free"), 
    active: true, 
    provider: typeof record.provider === "string" ? record.provider : (id.includes("/") ? id.split("/")[0] : "unknown")
  };
};
