import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export const SplashProgressBar = ({ duration }: { duration: number }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const val = Math.min((elapsed / duration) * 100, 100);
      setProgress(val);
      if (val >= 100) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="splash-progress">
      <div className="splash-progress__inner">
        <div className="splash-progress__labels">
          {/* eslint-disable-next-line */}
          <span>Uruchamianie</span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div className="splash-progress__track">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.65) 55%, rgba(255,255,255,0.25) 100%)",
              boxShadow: "0 0 18px rgba(255,255,255,0.12)",
            }}
          />
          <motion.div
            className="absolute inset-0"
            animate={{ x: ["-30%", "130%"] }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
            style={{
              width: "45%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0) 100%)",
              mixBlendMode: "overlay",
              filter: "blur(0.5px)",
            }}
          />
        </div>
      </div>
    </div>
  );
};
