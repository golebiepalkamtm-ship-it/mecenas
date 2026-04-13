import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import NeuralFlow from "../NeuralFlow";

export const Hero = ({ onStartTrial }: { onStartTrial: () => void }) => {
  return (
    <section className="relative min-h-screen w-full flex flex-col items-center pt-32 pb-20 px-6 overflow-hidden bg-[#0f0f0f]">
      {/* Background Neural Core */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero-bg.png" 
          alt="The Neural Core" 
          className="w-full h-full object-cover mix-blend-screen opacity-50"
        />
        <div className="absolute inset-0 bg-linear-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center py-16">
        <div className="text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 flex justify-start"
          >
            <div className="px-4 py-1 rounded-full border border-white/10 bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">
                Wersja 4.1 • <span className="text-gold-primary/60">Inteligentny Asystent Prawny</span>
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-[90px] font-outfit font-black italic uppercase leading-[1.05] tracking-tight mb-8"
          >
            <span className="text-[#ffffff]">
              Odpowiedź na Twoje
            </span>
            <br />
            <span className="text-[#f0f0f0]">
              pytanie w 5 sekund
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-white/50 mb-12 leading-relaxed font-medium max-w-xl"
          >
            LexMind AI łączy 5 najlepszych modeli sztucznej inteligencji, aby dać Ci rzetelną informację prawną opartą na polskim prawodawstwie. Dostępny 24/7, bez kolejek, bez abonamentów.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start gap-6"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(212,175,55,0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartTrial}
              className="group relative px-10 py-5 bg-black text-white font-black uppercase tracking-[0.3em] text-xs rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-colors duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-3">
                <Star size={16} className="text-white/60" fill="currentColor" />
                Pobierz za darmo
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </motion.button>
            
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
              7 dni bezpłatnego testu. Bez karty kredytowej.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden lg:block"
        >
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
            <img 
              src="/hero-lawyers.png" 
              alt="LexMind Legal Interface" 
              className="w-full h-full object-cover grayscale-[0.4] hover:grayscale-0 transition-all duration-1000"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />
          </div>
          
          {/* Decorative frame part — Platinum instead of gold */}
          <div className="absolute -inset-4 border border-white/5 rounded-[3rem] -z-10" />
        </motion.div>
      </div>

      {/* Floating badges */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-12 whitespace-nowrap overflow-hidden z-20 opacity-30">
        {["100% Polskie Prawo", "3.2 mln Orzeczeń", "5 Modeli AI", "Prywatność Lokalna"].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/60">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
