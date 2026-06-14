import { Users, Database, Server, Clock } from 'lucide-react';
import { SectionHeading, StatCard, HealthRow, AdminPanel, AdminLoading } from './Shared';

interface SystemPanelProps {
  stats: { users: number; docs: number; requests: number; tokens: number };
  services: { id: string; name: string; status: 'online' | 'offline' | 'degraded'; latency: string | number }[];
  isLoading: boolean;
}

export function SystemPanel({ stats, services, isLoading }: SystemPanelProps) {
  if (isLoading) return <AdminLoading message="Ładowanie stanu systemu…" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Zarejestrowani użytkownicy" value={stats.users} icon={<Users size={16} />} delay={0} />
        <StatCard label="Przetworzone dokumenty" value={stats.docs} icon={<Database size={16} />} delay={0.06} />
        <StatCard label="Zapytania (24h)" value={stats.requests} icon={<Server size={16} />} delay={0.12} />
        <StatCard label="Wykorzystane tokeny" value={stats.tokens} icon={<Clock size={16} />} delay={0.18} />
      </div>

      <AdminPanel delay={0.1}>
        <SectionHeading title="Monitor usług" subtitle="Status połączeń z zewnętrznymi dostawcami" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-6">
          {services.map((s) => (
            <HealthRow
              key={s.id}
              icon={<Server size={16} />}
              label={s.name}
              status={s.status}
              ping={typeof s.latency === 'number' ? `${s.latency} ms` : s.latency}
            />
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
