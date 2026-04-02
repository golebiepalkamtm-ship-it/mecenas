import { 
  Database, 
  FileText, 
  ShieldCheck, 
  Clock 
} from "lucide-react";

interface KnowledgeStatsProps {
  documentCount: number;
}

export function KnowledgeStats({ documentCount }: KnowledgeStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 max-w-5xl">
      <StatCard
        icon={<Database size={14} className="text-blue-400" />}
        label="Zasób Systemowy"
        value="Kancelaria Core"
        active
      />
      <StatCard
        icon={<FileText size={14} className="text-amber-400" />}
        label="Liczba Dokumentów"
        value={documentCount.toString()}
      />
      <StatCard
        icon={<ShieldCheck size={14} className="text-emerald-400" />}
        label="Poziom Dostępu"
        value="Adwokacki"
      />
      <StatCard
        icon={<Clock size={14} className="text-violet-400" />}
        label="Ostatnia Sync."
        value="Dzisiaj"
        trend="Live"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  active?: boolean;
}) {
  return (
    <div className={`relative group transition-all glass-prestige p-3.5 rounded-2xl overflow-hidden ${
      active ? "shadow-[0_20px_50px_rgba(212,175,55,0.15)] ring-1 ring-white/10" : "shadow-2xl"
    }`}>
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-9 h-9 rounded-xl glass-prestige flex items-center justify-center text-gold-primary group-hover:scale-105 transition-transform border border-white/10 shrink-0">
          {icon}
        </div>
        
        <div className="flex flex-col min-w-0">
           <p className="text-[7px] font-bold text-white/40 uppercase tracking-[0.2em] truncate mb-1 font-outfit">
             {label}
           </p>
           <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white tracking-widest truncate font-outfit">
                {value}
              </p>
              {trend && (
                <span className="text-[6px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md tracking-tighter uppercase border border-emerald-500/10 font-outfit">
                  {trend}
                </span>
              )}
           </div>
        </div>
      </div>

      {/* Very Subtle Decorative Glow */}
      <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-gold-primary/5 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
