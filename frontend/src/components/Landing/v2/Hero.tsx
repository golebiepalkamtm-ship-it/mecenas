import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

export const Hero = ({ onStartTrial }: { onStartTrial: () => void }) => {
  return (
    <section className="relative min-h-screen w-full flex flex-col items-start pt-20 pb-20 pl-10 pr-6 overflow-hidden bg-[#0f0f0f]">
      <div className="absolute inset-x-0 bottom-0 top-0 z-0" data-speed="0.6">
        <img 
          src="/hero-legal.png" 
          alt="The Future of Legal Intelligence" 
          className="w-full h-full object-cover object-top opacity-100"
          fetchPriority="high"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#050505]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full flex flex-col md:flex-row items-start gap-20">
        <div className="flex-1 text-left relative pt-44">
          <div className="text-left">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="hero-title text-4xl md:text-6xl font-inter font-semibold tracking-tight leading-[1.2] mb-10 text-chameleon"
            >
              <span className="block leading-tight">
                Wybrane modele AI <span className="text-[#9ca3af]">Błyskawiczna analiza</span>
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-xl mb-10"
            >
              <p className="text-sm md:text-base text-[#d1d5db] font-medium leading-relaxed mb-6 drop-shadow-md">
                System RAG przeszukuje polskie kodeksy, ustawy oraz orzeczenia sądów, pobierając wyłącznie zweryfikowane źródła. Pytanie trafia równolegle do czołowych modeli od liderów rynku – OpenAI, Google, Anthropic oraz xAI. Zaawansowany silnik LexMind syntetyzuje dane w sekundy, eliminując błędy i dostarczając precyzyjną wykładnię opartą na faktach.
              </p>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-[#9ca3af] italic drop-shadow-lg">
                LexMind — Pewność prawa, potęga technologii
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col items-start gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,1)", color: "black" }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartTrial}
                className="group relative px-8 py-3 bg-white/5 text-[#9ca3af] font-black uppercase tracking-[0.3em] text-[10px] rounded-full overflow-hidden border border-white/20 hover:border-white transition-all duration-500"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Star size={12} className="group-hover:fill-black" />
                  Wypróbuj za darmo
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6b7280]">
                Nie wymaga karty kredytowej • 7 dni testu
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute bottom-12 left-0 right-0 px-20 flex justify-between items-center z-20 opacity-70">
        {["100% Polskie Prawo", "3.2 mln Orzeczeń", "5 Modeli AI", "Prywatność Lokalna"].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-1 h-1 rounded-full bg-[#6b7280]" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#9ca3af]">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
