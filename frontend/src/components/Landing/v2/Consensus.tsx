import { motion } from "framer-motion";
import NeuralFlow from "../NeuralFlow";

export const Consensus = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-black/60 border-y border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-20">
        <div className="w-full max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[#6b7280] mb-8 block">Infrastruktura</span>
            <h2 className="text-4xl md:text-7xl font-inter font-semibold tracking-tight text-chameleon drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] mb-10 leading-[1.1]">
              Consensus <br className="md:hidden" /> <span className="opacity-60">Logic.</span>
            </h2>
          </motion.div>
        </div>
 
        <div className="w-full flex justify-center scale-90 lg:scale-110 xl:scale-125 relative group selection:bg-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <NeuralFlow />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
