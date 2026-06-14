/**
 * Diagnostyka scrolla landing — uruchomienie TYLKO na żądanie:
 *   window.__lexMindScrollDiag.run()
 *   lub URL: ?scrollDiag=1
 */

import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  getLandingScrollEngine,
  getLandingScrollWrapper,
  isLandingScrollReady,
} from "./landingScroll";

export type DiagSeverity = "critical" | "warning" | "info" | "ok";

export type DiagFinding = {
  code: string;
  severity: DiagSeverity;
  message: string;
  evidence?: Record<string, unknown>;
  fix?: string;
};

export type LandingScrollDiagReport = {
  generatedAt: string;
  page: { origin: string; port: string; path: string };
  conclusion: string;
  findings: DiagFinding[];
  snapshot: Record<string, unknown>;
  wheelProbe?: WheelProbeResult;
};

export type WheelProbeResult = {
  lenisDelta: number;
  wrapperDelta: number;
  engineDelta: number;
  verdict: string;
};

function finding(
  code: string,
  severity: DiagSeverity,
  message: string,
  opts?: { evidence?: Record<string, unknown>; fix?: string },
): DiagFinding {
  return { code, severity, message, evidence: opts?.evidence, fix: opts?.fix };
}

function readOverflow(el: Element | null) {
  if (!el) return null;
  const s = getComputedStyle(el);
  return { overflowX: s.overflowX, overflowY: s.overflowY };
}

function scrollBox(el: HTMLElement | null) {
  if (!el) return null;
  return {
    scrollTop: Math.round(el.scrollTop),
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    maxScroll: Math.max(0, el.scrollHeight - el.clientHeight),
    canScroll: el.scrollHeight > el.clientHeight + 2,
  };
}

export function collectLandingScrollSnapshot(): Record<string, unknown> {
  const wrapper = getLandingScrollWrapper();
  const engine = getLandingScrollEngine();
  const w = wrapper instanceof HTMLElement ? wrapper : null;

  return {
    ready: isLandingScrollReady(),
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    engine: engine
      ? {
          type: engine.type,
          scroll: Math.round(engine.scroll),
        }
      : null,
    overflow: {
      html: readOverflow(document.documentElement),
      body: readOverflow(document.body),
      wrapper: readOverflow(w),
    },
    scroll: {
      wrapper: scrollBox(w),
      windowY: Math.round(window.scrollY),
    },
    scrollTrigger: {
      total: ScrollTrigger.getAll().length,
      defaultScroller:
        ScrollTrigger.defaults()?.scroller === window
          ? "window"
          : ScrollTrigger.defaults()?.scroller instanceof HTMLElement
            ? (ScrollTrigger.defaults()?.scroller as HTMLElement).className
            : "viewport",
    },
    dom: {
      hasRoot: !!document.querySelector(".landing-scroll-root"),
      hasContent: !!document.querySelector(".landing-scroll-content"),
      hasNavShell: !!document.querySelector(".landing-nav-shell"),
    },
  };
}

/** Test kółka myszy: kto faktycznie przewija — silnik smooth czy natywny wrapper. */
export async function probeWheelScroll(ms = 700): Promise<WheelProbeResult> {
  const wrapper = getLandingScrollWrapper();
  const engine = getLandingScrollEngine();

  const startWrapper = wrapper?.scrollTop ?? 0;
  const startEngine = engine?.scroll ?? 0;

  const target = wrapper ?? document.documentElement;
  target.dispatchEvent(
    new WheelEvent("wheel", {
      deltaY: 180,
      deltaMode: 0,
      bubbles: true,
      cancelable: true,
    }),
  );

  await new Promise((r) => setTimeout(r, ms));

  const endWrapper = wrapper?.scrollTop ?? 0;
  const endEngine = wrapper?.scrollTop ?? engine?.scroll ?? 0;

  const wrapperDelta = endWrapper - startWrapper;
  const engineDelta = endEngine - startEngine;

  let verdict: string;
  if (Math.abs(wrapperDelta) > 2) {
    verdict = "OK: wrapper przewija się natywnie (oczekiwane, niskie CPU).";
  } else if (Math.abs(engineDelta) > 2 && Math.abs(wrapperDelta) < 1) {
    verdict =
      "UWAGA: scroll bez ruchu wrappera — możliwy ScrollSmoother / proxy (wyższe CPU idle).";
  } else {
    verdict = "Brak ruchu po symulacji wheel — przewiń ręcznie podczas probe().";
  }

  return {
    lenisDelta: engineDelta,
    wrapperDelta,
    engineDelta,
    verdict,
  };
}

export function runLandingScrollDiagnostic(): LandingScrollDiagReport {
  const findings: DiagFinding[] = [];
  const snapshot = collectLandingScrollSnapshot();
  const engine = getLandingScrollEngine();
  const ov = (snapshot.overflow as { wrapper?: { overflowY: string } })?.wrapper;
  const scroll = snapshot.scroll as { wrapper?: ReturnType<typeof scrollBox> };

  const port = location.port || (location.protocol === "https:" ? "443" : "80");

  if (!document.querySelector(".landing-scroll-root")) {
    findings.push(
      finding("DOM_ROOT", "critical", "Brak .landing-scroll-root.", {
        fix: "LandingPage musi renderować kontener scrolla.",
      }),
    );
  } else {
    findings.push(finding("DOM_ROOT", "ok", "Kontener .landing-scroll-root OK."));
  }

  if (!document.querySelector(".landing-scroll-content")) {
    findings.push(
      finding("DOM_CONTENT", "critical", "Brak .landing-scroll-content.", {
        fix: "Opakuj <main> w .landing-scroll-content.",
      }),
    );
  } else {
    findings.push(finding("DOM_CONTENT", "ok", "Kontener .landing-scroll-content OK."));
  }

  if (!isLandingScrollReady()) {
    findings.push(
      finding("INIT", "critical", "initLandingScroll() nie zakończył się (ready=false).", {
        fix: "Sprawdź błędy w konsoli przy mount LandingPage.",
      }),
    );
  } else {
    findings.push(finding("INIT", "ok", "Silnik scrolla zainicjalizowany."));
  }

  if (snapshot.reduceMotion) {
    findings.push(
      finding("REDUCE_MOTION", "info", "prefers-reduced-motion — smooth scroll wyłączony zgodnie z OS."),
    );
  }

  if (!engine) {
    findings.push(
      finding("ENGINE", "critical", "Brak silnika scrolla po init.", {
        fix: "initLandingScroll() nie podpiął wrappera.",
      }),
    );
  } else {
    findings.push(
      finding("ENGINE", "ok", `Aktywny: ${engine.type} (natywny scroll, zero idle CPU).`, {
        evidence: { scroll: engine.scroll },
      }),
    );
  }

  const oy = ov?.overflowY ?? "";
  if (oy === "auto" || oy === "scroll") {
    findings.push(finding("WRAPPER_OVERFLOW", "ok", `Wrapper overflow-y:${oy} (poprawne dla natywnego scrolla).`));
  } else if (oy === "hidden" || oy === "clip") {
    findings.push(
      finding("WRAPPER_OVERFLOW", "warning", `Wrapper overflow-y:${oy} — ScrollTrigger wymaga auto na wrapperze.`, {
        fix: "Ustaw overflow-y: auto na .landing-scroll-root.",
      }),
    );
  }

  const wScroll = scroll?.wrapper;
  if (wScroll && !wScroll.canScroll) {
    findings.push(
      finding("SCROLL_RANGE", "critical", "Brak zakresu przewijania (content za niski).", {
        evidence: wScroll,
      }),
    );
  } else if (wScroll) {
    findings.push(
      finding("SCROLL_RANGE", "ok", `Zakres scrolla ~${wScroll.maxScroll}px`, { evidence: wScroll }),
    );
  }

  const critical = findings.filter((f) => f.severity === "critical");
  const conclusion =
    critical.length > 0
      ? `Wykryto ${critical.length} problem(y) krytyczne. Zobacz pola fix przy każdym kodzie.`
      : "Konfiguracja statyczna wygląda poprawnie — uruchom probe() aby potwierdzić wheel.";

  return {
    generatedAt: new Date().toISOString(),
    page: { origin: location.origin, port, path: location.pathname },
    conclusion,
    findings,
    snapshot,
  };
}

export async function runLandingScrollDiagnosticFull(): Promise<LandingScrollDiagReport> {
  const report = runLandingScrollDiagnostic();
  report.wheelProbe = await probeWheelScroll();
  const probe = report.wheelProbe;

  if (probe.verdict.startsWith("KRYTYCZNE") || probe.verdict.startsWith("KONFLIKT")) {
    report.findings.push(
      finding("WHEEL_PROBE", "critical", probe.verdict, {
        evidence: probe,
        fix: "Sprawdź konflikt overflow i drugi listener scrolla.",
      }),
    );
    report.conclusion = probe.verdict;
  } else if (probe.verdict.startsWith("OK")) {
    report.findings.push(finding("WHEEL_PROBE", "ok", probe.verdict, { evidence: probe }));
  } else {
    report.findings.push(finding("WHEEL_PROBE", "warning", probe.verdict, { evidence: probe }));
  }

  return report;
}

export function printLandingScrollDiagnostic(report: LandingScrollDiagReport): void {
  console.group(
    `%c[LexMind Scroll Diag] ${report.page.origin} | ${report.conclusion}`,
    "font-weight:700;color:#d4af37",
  );
  console.table(
    report.findings.map((f) => ({
      severity: f.severity,
      code: f.code,
      message: f.message,
      fix: f.fix ?? "",
    })),
  );
  if (report.wheelProbe) {
    console.log("Wheel probe:", report.wheelProbe);
  }
  console.log("Snapshot:", report.snapshot);
  console.groupEnd();
}

declare global {
  interface Window {
    __lexMindScrollDiag?: {
      run: () => LandingScrollDiagReport;
      runFull: () => Promise<LandingScrollDiagReport>;
      probe: typeof probeWheelScroll;
      snapshot: typeof collectLandingScrollSnapshot;
      print: typeof printLandingScrollDiagnostic;
    };
  }
}

/** Rejestruje API w window — bez auto-run. */
export function registerLandingScrollDiagnostics(): void {
  window.__lexMindScrollDiag = {
    run: runLandingScrollDiagnostic,
    runFull: async () => {
      const r = await runLandingScrollDiagnosticFull();
      printLandingScrollDiagnostic(r);
      return r;
    },
    probe: probeWheelScroll,
    snapshot: collectLandingScrollSnapshot,
    print: printLandingScrollDiagnostic,
  };
}

export function maybeAutoRunLandingScrollDiagnostics(): void {
  if (typeof window === "undefined") return;
  if (!new URLSearchParams(location.search).has("scrollDiag")) return;
  void window.__lexMindScrollDiag?.runFull();
}
