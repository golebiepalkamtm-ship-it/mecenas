import { motion } from "framer-motion";
import { ShieldCheck, Lock, EyeOff } from "lucide-react";

export const Security = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
        <div className="flex-1 order-2 lg:order-1 relative group">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-3xl"
          >
            <img 
              src="/privacy-shield.png" 
              alt="Bezpieczeństwo danych LexMind" 
              className="w-full h-auto object-cover transform scale-100 group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
          </motion.div>
          {/* Accent glow - No blur */}
          <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <div className="flex-1 order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-4 block">Prywatność i Bezpieczeństwo</span>
            <h2 className="text-4xl md:text-6xl font-outfit font-black italic uppercase tracking-tight text-[#808080] mb-8 leading-[0.9]">
              Twoje dane zostają u Ciebie
            </h2>
            
            <p className="text-lg text-white/50 mb-12 leading-relaxed font-medium">
              W przeciwieństwie do publicznych czatów AI, LexMind szanuje tajemnicę zawodową. Dokumenty są przetwarzane lokalnie w zabezpieczonym kontenerze, a dane nigdy nie są wykorzystywane do trenowania modeli publicznych.
            </p>
 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <ShieldCheck size={20} />, title: "End-to-End", desc: "Zaszyfrowane połączenia" },
                { icon: <Lock size={20} />, title: "Local Processing", desc: "Praca na Twoim GPU" },
                { icon: <EyeOff size={20} />, title: "No Logging", desc: "Prywatne sesje pracy" }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/3 border border-white/5">
                  <div className="text-white/60 mb-3">{item.icon}</div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#a8a8a8] mb-1">{item.title}</h4>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
