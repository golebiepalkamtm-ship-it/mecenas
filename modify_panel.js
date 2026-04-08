const fs = require('fs');

const panelPath = 'c:\\Users\\Marcin_Palka\\moj prawnik\\frontend\\src\\components\\Chat\\components\\QuickIntelligencePanel.tsx';
let content = fs.readFileSync(panelPath, 'utf8');

// replace the imports
content = content.replace(
  '  Terminal\n} from \'lucide-react\';',
  '  Terminal,\n  Shield,\n  Sword,\n  Gavel,\n  FileWarning,\n  Siren,\n  Eye\n} from \'lucide-react\';'
);

const oldTasks = `const TASK_OPTIONS = [
  { id: 'general', roleId: 'navigator', label: 'Ogólne Wsparcie Prawne', icon: Library, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/40', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]' },
  { id: 'analysis', roleId: 'inquisitor', label: 'Analiza Dokumentacji', icon: Target, color: 'text-gold-primary', bg: 'bg-gold-primary/10', border: 'border-gold-primary/40', glow: 'shadow-[0_0_20px_rgba(212,175,55,0.2)]' },
  { id: 'drafting', roleId: 'draftsman', label: 'Kreator Pism i Umów', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/40', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
  { id: 'research', roleId: 'oracle', label: 'Research Orzecznictwa', icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/40', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]' },
  { id: 'strategy', roleId: 'grandmaster', label: 'Strategia Procesowa', icon: Scale, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/40', glow: 'shadow-[0_0_20px_rgba(251,113,133,0.2)]' }
];`;

const newTasks = `const TASK_OPTIONS = [
  { id: 'general', roleId: 'navigator', label: 'Ogólne Wsparcie Prawne', icon: Library, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/40', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]' },
  { id: 'analysis', roleId: 'inquisitor', label: 'Analiza Dokumentacji', icon: Target, color: 'text-gold-primary', bg: 'bg-gold-primary/10', border: 'border-gold-primary/40', glow: 'shadow-[0_0_20px_rgba(212,175,55,0.2)]' },
  { id: 'drafting', roleId: 'draftsman', label: 'Kreator Pism i Umów', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/40', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
  { id: 'research', roleId: 'oracle', label: 'Research Orzecznictwa', icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/40', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]' },
  { id: 'strategy', roleId: 'grandmaster', label: 'Strategia Procesowa', icon: Scale, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/40', glow: 'shadow-[0_0_20px_rgba(251,113,133,0.2)]' },
  
  // Defense Team
  { id: 'criminal_defense', roleId: 'defender', label: 'Obrona Karna', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/40', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.2)]' },
  { id: 'rights_defense', roleId: 'constitutionalist', label: 'Obrona Praw Konst.', icon: Scale, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/40', glow: 'shadow-[0_0_20px_rgba(56,189,248,0.2)]' },
  { id: 'document_attack', roleId: 'proceduralist', label: 'Atak na Dokumenty', icon: Sword, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40', glow: 'shadow-[0_0_20px_rgba(251,146,60,0.2)]' },
  { id: 'emergency_relief', roleId: 'negotiator', label: 'Tryb Kryzysowy 24h', icon: Siren, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/40', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' },
  
  // Prosecution Machine
  { id: 'charge_building', roleId: 'prosecutor', label: 'Budowa Zarzutów', icon: Target, color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/40', glow: 'shadow-[0_0_20px_rgba(203,213,225,0.2)]' },
  { id: 'indictment_review', roleId: 'investigator', label: 'Test Aktu Osk.', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/40', glow: 'shadow-[0_0_20px_rgba(129,140,248,0.2)]' },
  { id: 'sentencing_argument', roleId: 'sentencing_expert', label: 'Wniosek o Karę', icon: Gavel, color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/40', glow: 'shadow-[0_0_20px_rgba(161,161,170,0.2)]' },
  { id: 'warrant_application', roleId: 'hard_judge', label: 'Wniosek o Areszt', icon: FileWarning, color: 'text-rose-600', bg: 'bg-rose-600/10', border: 'border-rose-600/40', glow: 'shadow-[0_0_20px_rgba(225,29,72,0.2)]' }
];`;

content = content.replace(oldTasks, newTasks);

fs.writeFileSync(panelPath, content);
console.log("Panel updated successfully.");
