/** localStorage z obsługą QuotaExceeded — usuwa największe klucze LexMind i ponawia zapis. */

const PRUNE_KEYS_ON_QUOTA = [
  "lexmind_models_cache",
  "lexmind-orchestrator",
  "lexmind_api_providers_v2",
  "custom_models_openrouter",
  "custom_models_google",
  "custom_models_openai",
  "custom_models_anthropic",
] as const;

function estimateBytes(value: string): number {
  return new Blob([value]).size;
}

/** Przy starcie: tylko usuń ewidentnie przepełnione ustawienia (nie cache modeli). */
export function pruneOversizedPersistedState(): void {
  try {
    const settingsKey = "lexmind-chat-persistent-settings-v20";
    const raw = localStorage.getItem(settingsKey);
    if (raw && estimateBytes(raw) > 120_000) {
      localStorage.removeItem(settingsKey);
      console.warn("[STORAGE] Usunięto przepełnione ustawienia czatu — zostaną odtworzone domyślne.");
    }
    localStorage.removeItem("lexmind-orchestrator");
  } catch {
    /* ignore */
  }
}

function pruneOnQuotaExceeded(): void {
  try {
    for (const key of PRUNE_KEYS_ON_QUOTA) {
      localStorage.removeItem(key);
    }
    pruneOversizedPersistedState();
  } catch {
    /* ignore */
  }
}

function trySetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    return;
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22);
    if (!isQuota) throw err;
  }

  pruneOnQuotaExceeded();
  try {
    localStorage.setItem(key, value);
    return;
  } catch (retryErr) {
    const isQuota =
      retryErr instanceof DOMException &&
      (retryErr.name === "QuotaExceededError" || retryErr.code === 22);
    if (!isQuota) throw retryErr;
    console.error(
      `[STORAGE] QuotaExceeded dla "${key}" (${(estimateBytes(value) / 1024).toFixed(1)} KB) — zapis pominięty.`,
    );
  }
}

export function createSafeStorage(): Storage {
  return {
    get length() {
      return localStorage.length;
    },
    clear() {
      localStorage.clear();
    },
    getItem(name: string) {
      return localStorage.getItem(name);
    },
    key(index: number) {
      return localStorage.key(index);
    },
    removeItem(name: string) {
      localStorage.removeItem(name);
    },
    setItem(name: string, value: string) {
      trySetItem(name, value);
    },
  };
}
