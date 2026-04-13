import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const REVIEWS = [
  {
    name: "Marek Kowalski",
    role: "Właściciel Biura Rachunkowego",
    text: "LexMind zaoszczędził mi godziny na szukaniu interpretacji przepisów. Odpowiedzi są rzetelne i zawsze poparte konkretnym paragrafem."
  },
  {
    name: "Anna Nowak",
    role: "Prawnik In-house",
    text: "Używam do wstępnej weryfikacji orzecznictwa. System SAOS działa błyskawicznie, a konsensus modeli daje mi pewność, której nie mają inne narzędzia."
  },
  {
    name: "Piotr Wiśniewski",
    role: "Przedsiębiorca",
    text: "Zamiast płacić za każdą konsultację, sprawdzam podstawy w LexMind. To najlepsza inwestycja w mojej firmie w tym roku."
  }
];

export const Testimonials = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-black">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
         <img 
           src="/professional-trust.png" 
           alt="Professional Trust Background" 
           className="w-full h-full object-cover grayscale"
         />
         <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-black" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="text-center mb-20"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4 block">Dowód Społeczny</span>
          <h2 className="text-4xl md:text-5xl font-outfit font-black italic uppercase tracking-tight text-white mb-6">
            Zaufali nam profesjonaliści
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {REVIEWS.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="p-10 rounded-[2.5rem] bg-white/3 border border-white/5 relative group hover:border-white/20 transition-all duration-500"
            >
              <Quote className="absolute top-8 right-8 text-white/5 group-hover:text-white/10 transition-colors" size={48} />
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, j) => <Star key={j} size={12} fill="white" className="text-white" />)}
              </div>

              <p className="text-sm text-white/70 italic leading-relaxed mb-8 relative z-10">
                "{r.text}"
              </p>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white">{r.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mt-1">{r.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
