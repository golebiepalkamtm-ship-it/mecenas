import { API_BASE } from "../config";

export type ApiAvailability = "unknown" | "available" | "unavailable";

const AVAILABLE_TTL_MS = 60_000;
const UNAVAILABLE_TTL_MS = 15_000;
const HEALTHCHECK_TIMEOUT_MS = 2_500;

let apiAvailability: ApiAvailability = "unknown";
let lastCheckedAt = 0;
let inflightCheck: Promise<boolean> | null = null;

declare global {
  interface Window {
    __prawnikApiOnlineListenerAdded?: boolean;
  }
}

function getTtl(status: ApiAvailability) {
  if (status === "available") return AVAILABLE_TTL_MS;
  if (status === "unavailable") return UNAVAILABLE_TTL_MS;
  return 0;
}

export function resetApiAvailability() {
  apiAvailability = "unknown";
  lastCheckedAt = 0;
  inflightCheck = null;
}

export function getApiAvailability() {
  return apiAvailability;
}

function setApiAvailability(status: ApiAvailability) {
  apiAvailability = status;
  lastCheckedAt = Date.now();
}

export async function ensureApiAvailability(force = false): Promise<boolean> {
  const ttl = getTtl(apiAvailability);
  if (!force && apiAvailability !== "unknown" && Date.now() - lastCheckedAt < ttl) {
    return apiAvailability === "available";
  }

  if (inflightCheck) {
    return inflightCheck;
  }

  inflightCheck = (async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Healthcheck failed with status ${response.status}`);
      }

      setApiAvailability("available");
      return true;
    } catch {
      setApiAvailability("unavailable");
      return false;
    } finally {
      window.clearTimeout(timeoutId);
      inflightCheck = null;
    }
  })();

  return inflightCheck;
}

if (typeof window !== "undefined" && !window.__prawnikApiOnlineListenerAdded) {
  window.addEventListener("online", () => {
    resetApiAvailability();
  });
  window.__prawnikApiOnlineListenerAdded = true;
}
