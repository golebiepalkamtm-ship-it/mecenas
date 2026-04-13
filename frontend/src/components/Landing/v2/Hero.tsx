import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

export const Hero = ({ onStartTrial }: { onStartTrial: () => void }) => {
  return (
    <section className="relative min-h-screen w-full flex flex-col items-start pt-32 pb-20 pl-10 pr-6 overflow-hidden bg-[#0f0f0f]">
      <div className="absolute inset-x-0 bottom-0 top-16 z-0" data-speed="0.6">
        <img 
          src="/hero-legal.png" 
          alt="The Future of Legal Intelligence" 
          className="w-full h-full object-cover object-top opacity-80"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#050505]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full flex flex-col md:flex-row items-start gap-20">
        <div className="flex-1 text-left relative pt-60">
          <div className="text-left">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-2xl md:text-3xl font-outfit font-black uppercase tracking-widest leading-tight mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <span className="text-white block">
                Wybrane modele AI.
              </span>
              <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-white/80 to-white/60 block mt-1">
                Jeden werdykt.&nbsp;&nbsp;&nbsp;Zero halucynacji.
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-xl mb-10"
            >
              <p className="text-sm md:text-base text-white/90 font-medium leading-relaxed mb-6 drop-shadow-md">
                System RAG przeszukuje polskie kodeksy, ustawy oraz orzeczenia sądów, pobierając wyłącznie zweryfikowane źródła. Pytanie trafia równolegle do czołowych modeli od liderów rynku – OpenAI, Google, Anthropic oraz xAI. Zaawansowany agregator syntetyzuje ich odpowiedzi w jeden konsensus, eliminując błędy i dostarczając precyzyjną wykładnię opartą na faktach.
              </p>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-white italic drop-shadow-lg">
                LexMind. Pewność prawa, potęga technologii.
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
                className="group relative px-8 py-3 bg-white/5 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-full overflow-hidden border border-white/20 hover:border-white transition-all duration-500"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Star size={12} className="group-hover:fill-black" />
                  Darmowy dostęp
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
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
            <div className="w-1 h-1 rounded-full bg-white/50" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
