import { motion } from "framer-motion";
import { BrandLogo } from "../../../components/Shared/BrandLogo";

export function WelcomeView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center p-4 xs:p-6 lg:p-20 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-3 xs:space-y-4 lg:space-y-6 relative z-10 w-full"
      >
        <div className="flex flex-col items-center">
          <div className="mb-10 lg:mb-14">
            <BrandLogo size={60} className="scale-[1.2] lg:scale-[1.8]" />
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-4 lg:gap-8">
              <div className="h-px w-10 lg:w-20 bg-gold-primary opacity-20" />
              <span className="text-[10px] lg:text-sm font-black tracking-[0.6em] text-gold-primary uppercase italic">
                System analizy przepisów
              </span>
              <div className="h-px w-10 lg:w-20 bg-gold-primary opacity-20" />
            </div>
            
            <p className="max-w-[300px] lg:max-w-2xl mx-auto text-[8px] lg:text-[11px] font-bold text-white/80 tracking-[0.25em] leading-relaxed uppercase">
              Serwis ma charakter wyłącznie informacyjny. Wygenerowane treści nie stanowią porady prawnej.
            </p>
          </div>
        </div>
      </motion.div>
      <div className="absolute inset-0 bg-radial-to-c from-(--primary)/20 to-transparent" />
    </div>
  );
}
