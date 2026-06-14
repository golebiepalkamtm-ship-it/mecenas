import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export type LandingScrollState = {
  scroll: number;
  delta: number;
  direction: -1 | 0 | 1;
};

export type LandingScrollEngine = {
  type: "native";
  scroll: number;
};

let scrollWrapper: HTMLElement | null = null;
let lastEmittedScroll = 0;
let ready = false;
let nativeScrollHandler: (() => void) | null = null;
let emitRaf = 0;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const readyListeners = new Set<() => void>();
const resetListeners = new Set<() => void>();
const scrollListeners = new Set<(state: LandingScrollState) => void>();

function notifyReady() {
  ready = true;
  readyListeners.forEach((l) => l());
}

function emitScroll(scroll: number) {
  const delta = scroll - lastEmittedScroll;
  lastEmittedScroll = scroll;
  const direction: -1 | 0 | 1 =
    Math.abs(delta) < 0.35 ? 0 : delta > 0 ? 1 : -1;
  scrollListeners.forEach((l) => l({ scroll, delta, direction }));
}

function scheduleEmitScroll(scroll: number) {
  if (emitRaf) return;
  emitRaf = requestAnimationFrame(() => {
    emitRaf = 0;
    emitScroll(scroll);
  });
}

function bindScrollerProxy(wrapper: HTMLElement) {
  ScrollTrigger.scrollerProxy(wrapper, {
    scrollTop(value) {
      if (arguments.length) {
        wrapper.scrollTop = value;
      }
      return wrapper.scrollTop;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
      };
    },
    pinType: wrapper.style.transform ? "transform" : "fixed",
  });

  ScrollTrigger.defaults({ scroller: wrapper });
}

export function isLandingScrollReady(): boolean {
  return ready;
}

export function getLandingScrollWrapper(): HTMLElement | null {
  return scrollWrapper;
}

export function getLandingScrollEngine(): LandingScrollEngine | null {
  const w = scrollWrapper;
  if (!w) return null;
  return { type: "native", scroll: w.scrollTop };
}

/** @deprecated użyj getLandingScrollEngine */
export function getLandingLenis(): null {
  return null;
}

export function onLandingScrollReady(listener: () => void): () => void {
  if (ready) listener();
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

export function onLandingScrollReset(listener: () => void): () => void {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

export function onLandingScroll(listener: (state: LandingScrollState) => void): () => void {
  scrollListeners.add(listener);
  const engine = getLandingScrollEngine();
  if (engine) {
    listener({ scroll: engine.scroll, delta: 0, direction: 0 });
  }
  return () => scrollListeners.delete(listener);
}

/** Odświeżenie layoutu ScrollTrigger — debounce, żeby ResizeObserver nie młotł CPU. */
export function refreshLandingScroll(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    ScrollTrigger.refresh();
  }, 200);
}

export function scrollToLandingTarget(
  target: string | HTMLElement,
  offsetPx = -80,
): void {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  const wrapper = scrollWrapper;
  if (!el || !wrapper) return;

  const top =
    el.getBoundingClientRect().top -
    wrapper.getBoundingClientRect().top +
    wrapper.scrollTop +
    offsetPx;
  wrapper.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function initLandingScroll(wrapper: HTMLElement): null {
  if (typeof window === "undefined") return null;
  if (scrollWrapper === wrapper && ready) return null;

  destroyLandingScroll();

  const html = document.documentElement;
  const content = wrapper.querySelector(".landing-scroll-content");

  if (!(content instanceof HTMLElement)) {
    console.error("[landingScroll] Brak .landing-scroll-content");
    return null;
  }

  html.classList.add("landing-active");
  scrollWrapper = wrapper;
  lastEmittedScroll = 0;

  wrapper.style.overflowX = "hidden";
  wrapper.style.overflowY = "auto";

  bindScrollerProxy(wrapper);

  nativeScrollHandler = () => {
    ScrollTrigger.update();
    scheduleEmitScroll(wrapper.scrollTop);
  };
  wrapper.addEventListener("scroll", nativeScrollHandler, { passive: true });

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    emitScroll(wrapper.scrollTop);
    notifyReady();
  });

  return null;
}

export function destroyLandingScroll(): void {
  ready = false;
  resetListeners.forEach((l) => l());
  lastEmittedScroll = 0;

  if (emitRaf) {
    cancelAnimationFrame(emitRaf);
    emitRaf = 0;
  }

  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const wrapper = scrollWrapper;
  if (wrapper && nativeScrollHandler) {
    wrapper.removeEventListener("scroll", nativeScrollHandler);
    nativeScrollHandler = null;
  }

  if (wrapper) {
    ScrollTrigger.scrollerProxy(wrapper, false);
  }

  ScrollTrigger.defaults({ scroller: undefined });
  scrollWrapper = null;

  ScrollTrigger.getAll().forEach((t) => t.kill());
  ScrollTrigger.clearScrollMemory();
  document.documentElement.classList.remove("landing-active");
}
