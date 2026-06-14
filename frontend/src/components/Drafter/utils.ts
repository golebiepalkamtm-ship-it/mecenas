import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DRAFTER_FORMAL_STORAGE_KEY,
  findCityPresetId,
  findPresetIdByValue,
  type FormalPresetOption,
} from "./formalPresets";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toIsoDateLocal(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoDateLocal(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }
  return parsed;
}

/** Format prawny: „dnia 20.05.2026 r.” */
export function formatPolishLegalDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `dnia ${day}.${month}.${year} r.`;
}

/** Pełna linia metryczki: „Lubań, dnia 20.05.2026 r.” */
export function buildPlaceDateLine(city: string, isoDate: string): string {
  const trimmedCity = city.trim();
  const parsed = parseIsoDateLocal(isoDate);
  const datePart = parsed ? formatPolishLegalDate(parsed) : formatPolishLegalDate();
  if (!trimmedCity) return datePart;
  return `${trimmedCity}, ${datePart}`;
}

export interface DrafterFormalPrefs {
  placeCity: string;
  placeCityPresetId: string;
  documentDateIso: string;
  recipientPresetId: string;
}

export function loadDrafterFormalPrefs(): Partial<DrafterFormalPrefs> {
  try {
    const raw = localStorage.getItem(DRAFTER_FORMAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<DrafterFormalPrefs>;
  } catch {
    return {};
  }
}

export function saveDrafterFormalPrefs(prefs: DrafterFormalPrefs): void {
  try {
    localStorage.setItem(DRAFTER_FORMAL_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

export function resolveInitialFormalState(): {
  placeCity: string;
  placeCityPresetId: string;
  documentDateIso: string;
  recipientPresetId: string;
  recipientInfo: string;
} {
  const saved = loadDrafterFormalPrefs();
  const documentDateIso = saved.documentDateIso || toIsoDateLocal();
  const placeCity = saved.placeCity?.trim() || "Lubań";
  const placeCityPresetId =
    saved.placeCityPresetId || findCityPresetId(placeCity);
  const recipientPresetId =
    saved.recipientPresetId || "starosta-luban";

  return {
    placeCity,
    placeCityPresetId,
    documentDateIso,
    recipientPresetId,
    recipientInfo: "",
  };
}

export function applyRecipientPreset(
  options: FormalPresetOption[],
  presetId: string,
): string {
  const preset = options.find((o) => o.id === presetId);
  return preset?.value ?? "";
}

export function syncRecipientPresetId(
  options: FormalPresetOption[],
  recipientInfo: string,
  currentPresetId: string,
): string {
  if (!recipientInfo.trim()) return currentPresetId || "";
  const byValue = findPresetIdByValue(options, recipientInfo);
  if (byValue !== "custom-recipient") return byValue;
  if (currentPresetId && currentPresetId !== "custom-recipient") {
    const preset = options.find((o) => o.id === currentPresetId);
    if (preset && recipientInfo.trim() === preset.value.trim()) {
      return currentPresetId;
    }
  }
  return "custom-recipient";
}
