import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, Wifi, Bell, Gauge } from 'lucide-react';

export function SystemSection() {
  return (
    <motion.section 
      key="system-notifications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-prestige rounded-2xl p-5 space-y-3 shadow-2xl"
    >
      <h2 className="text-sm font-black text-white italic tracking-tight uppercase text-gold-gradient">System</h2>
      
      <div className="grid grid-cols-2 gap-2">
        <SystemInfoCard icon={Cpu} label="Silnik AI" value="Aktywny" status="active" />
        <SystemInfoCard icon={Wifi} label="Połączenie" value="Stabilne" status="active" />
        <SystemInfoCard icon={HardDrive} label="Baza Wiedzy" value="Zsynchronizowana" status="active" />
        <SystemInfoCard icon={Gauge} label="Wersja" value="v3.0 Prestige" status="neutral" />
      </div>

      <div className="pt-1">
        <h3 className="text-[10px] font-black text-white italic tracking-tight uppercase text-gold-gradient flex items-center gap-2 mb-2">
          <Bell size={12} className="text-gold-primary" />
          Powiadomienia
        </h3>
        <div className="space-y-1">
          <NotificationToggle label="Nowe sprawy AI" active />
          <NotificationToggle label="Aktualizacje bazy wiedzy" active />
          <NotificationToggle label="Wiadomości systemowe" />
          <NotificationToggle label="Promocje i nowości" />
        </div>
      </div>
    </motion.section>
  );
}

function SystemInfoCard({ 
  icon: Icon, 
  label, 
  value, 
  status 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  status: 'active' | 'warning' | 'neutral';
}) {
  const statusColor = {
    active: 'text-emerald-400',
    warning: 'text-amber-400',
    neutral: 'text-gold-primary',
  }[status];

  const statusDot = {
    active: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
    warning: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
    neutral: 'bg-gold-primary shadow-[0_0_6px_rgba(212,175,55,0.5)]',
  }[status];

  return (
    <div className="p-2.5 rounded-xl glass-prestige flex items-center gap-2.5 hover:bg-white/5 transition-all">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 flex-shrink-0">
        <Icon size={13} className={statusColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em] truncate">{label}</p>
        <p className={`text-[9px] font-black ${statusColor} uppercase tracking-wider flex items-center gap-1.5 mt-0.5 truncate`}>
          <span className={`w-1 h-1 rounded-full ${statusDot}`} />
          {value}
        </p>
      </div>
    </div>
  );
}

function NotificationToggle({ label, active = false }: { label: string; active?: boolean }) {
  const [isOn, setIsOn] = useState(active);
  return (
    <div 
      className="px-3 py-2 rounded-xl glass-prestige flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer" 
      onClick={() => setIsOn(!isOn)}
    >
      <span className="text-[8px] font-black uppercase tracking-widest text-white/80 truncate mr-2">{label}</span>
      <div className={`w-7 h-3.5 rounded-full transition-all flex items-center px-0.5 flex-shrink-0 ${isOn ? 'bg-gold-primary' : 'bg-white/20'}`}>
        <motion.div animate={{ x: isOn ? 13 : 0 }} className={`w-2.5 h-2.5 rounded-full ${isOn ? 'bg-black' : 'bg-white/40'}`} />
      </div>
    </div>
  );
}
