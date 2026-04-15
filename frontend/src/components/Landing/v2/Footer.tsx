import { motion } from "framer-motion";


export const FinalCTA = ({ onStartTrial }: { onStartTrial: () => void }) => {
  return (
    <section className="py-64 px-6 relative overflow-hidden bg-black">
      {/* Background Image - Cyberpunk Warsaw */}
      <div className="absolute inset-0 z-0">
         <img 
           src="/global-warsaw.png" 
           alt="Global Intelligence Local Law Background" 
           className="w-full h-full object-cover object-[center_15%] opacity-80"
         />
         <div className="absolute inset-0 bg-radial-gradient(circle_at_50%_0%,transparent_0%,black_100%)" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-6xl font-inter font-semibold tracking-tight text-chameleon drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] mb-10 leading-tight">
            Gotowy na przyszłość <span className="opacity-60">prawa?</span>
          </h2>
          <p className="text-xl text-[#9ca3af] mb-12 max-w-2xl mx-auto font-medium">
            Dołącz do tysięcy użytkowników, którzy już nigdy nie zapłacą 500 zł za zwykłą konsultację.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartTrial}
              className="px-12 py-6 bg-white text-[#9ca3af] font-black uppercase tracking-[0.4em] text-sm rounded-3xl"
            >
              Wypróbuj za darmo przez 7 dni
            </motion.button>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#4b5563]">
              Bez karty kredytowej. Bez zobowiązań.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export const Footer = () => {
  return (
    <footer className="py-12 px-6 border-t border-white/5 bg-black">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <h3 className="text-2xl font-outfit font-black italic uppercase tracking-wider text-[#9ca3af] mb-2">LexMind AI</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#4b5563]">Majewski & Pałka © 2026</p>
        </div>
        
        <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-[#6b7280]">
          <a href="#" className="hover:text-[#9ca3af] transition-colors">Regulamin</a>
          <a href="#" className="hover:text-[#9ca3af] transition-colors">Prywatność</a>
          <a href="#" className="hover:text-[#9ca3af] transition-colors">Kontakt</a>
        </div>

        <div className="px-4 py-2 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-[0.3em] text-[#6b7280]">
          Secure Infrastructure v4.1
        </div>
      </div>
    </footer>
  );
};
