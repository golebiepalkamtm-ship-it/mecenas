import { useState } from 'react';
import { motion } from 'framer-motion';

export function NotificationSection() {
  return (
    <motion.section 
      key="notifications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-prestige rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
    >
      <h2 className="text-xl font-black text-white italic tracking-tight uppercase text-gold-gradient">Powiadomienia</h2>
      <div className="space-y-3">
        <NotificationToggle label="Nowe sprawy AI" active />
        <NotificationToggle label="Aktualizacje bazy wiedzy" active />
        <NotificationToggle label="Wiadomości systemowe" />
        <NotificationToggle label="Promocje i nowości" />
      </div>
    </motion.section>
  );
}

function NotificationToggle({ label, active = false }: { label: string, active?: boolean }) {
  const [isOn, setIsOn] = useState(active);
  return (
    <div className="p-4 rounded-2xl glass-prestige flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer" onClick={() => setIsOn(!isOn)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{label}</span>
      <div className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${isOn ? 'bg-gold-primary' : 'bg-white/20'}`}>
        <motion.div animate={{ x: isOn ? 20 : 0 }} className={`w-3 h-3 rounded-full ${isOn ? 'bg-black' : 'bg-white/40'}`} />
      </div>
    </div>
  );
}
