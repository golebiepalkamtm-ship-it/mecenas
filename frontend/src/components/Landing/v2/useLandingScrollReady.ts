import { useEffect, useState } from "react";
import { isLandingScrollReady, onLandingScrollReady, onLandingScrollReset } from "./landingScroll";

export function useLandingScrollReady(): boolean {
  const [scrollReady, setScrollReady] = useState(isLandingScrollReady);

  useEffect(() => {
    if (isLandingScrollReady()) setScrollReady(true);

    const offReady = onLandingScrollReady(() => setScrollReady(true));
    const offReset = onLandingScrollReset(() => setScrollReady(false));

    return () => {
      offReady();
      offReset();
    };
  }, []);

  return scrollReady;
}
