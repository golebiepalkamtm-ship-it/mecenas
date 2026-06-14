import { useEffect, useState } from "react";

/** lg+ i (wąsko <1536px lub nisko <900px) → tryb laptop, np. 1366×768 */
export function useViewportDensity() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isDesktop = w >= 1024;
      const isCompactDesktop =
        isDesktop && (w < 1536 || h < 900);
      setCompact(isCompactDesktop);
      document.documentElement.setAttribute(
        "data-density",
        isCompactDesktop ? "compact" : isDesktop ? "comfortable" : "mobile",
      );
    };

    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      document.documentElement.removeAttribute("data-density");
    };
  }, []);

  return { compact };
}
