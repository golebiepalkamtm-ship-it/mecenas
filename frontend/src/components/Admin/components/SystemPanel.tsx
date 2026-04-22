import { Users, Database, Server, Clock } from "lucide-react";
import { SectionHeading, StatCard, HealthRow } from "./Shared";

interface SystemPanelProps {
  stats: any;
  services: any[];
  isLoading: boolean;
}

export function SystemPanel({ stats, services, isLoading }: SystemPanelProps) {
  if (isLoading) return <div className="p-20 text-center animate-pulse">Ładowanie stanu systemu...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Zarejestrowani Użytkownicy" value={stats.users} icon={<Users size={16} />} />
        <StatCard label="Przetworzone Dokumenty" value={stats.docs} icon={<Database size={16} />} />
        <StatCard label="Zapytania (24h)" value={stats.requests} icon={<Server size={16} />} />
        <StatCard label="Wykorzystane Tokeny" value={stats.tokens} icon={<Clock size={16} />} />
      </div>

      <div className="glass-prestige rounded-3xl p-8 border border-white/60 bg-white/40 shadow-[0_40px_80px_rgba(0,0,0,0.1),inset_0_2px_10px_rgba(255,255,255,0.9)]">
        <SectionHeading title="Monitor Usług" subtitle="Status połączeń z zewnętrznymi dostawcami" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
          {services.map((s) => (
            <HealthRow key={s.id} icon={<Server size={18} />} label={s.name} status={s.status} ping={s.latency} />
          ))}
        </div>
      </div>
    </div>
  );
}
