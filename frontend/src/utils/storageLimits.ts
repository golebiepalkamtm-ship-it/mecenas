const MAX_PROMPT_CHARS = 12_000;
const MAX_RECORD_PROMPT_CHARS = 6_000;
const MAX_LATENCY_ENTRIES = 80;

export function capString(value: string, max = MAX_PROMPT_CHARS): string {
  if (!value || value.length <= max) return value;
  return value.slice(0, max);
}

export function capRecord(
  record: Record<string, string> | undefined,
  maxPerValue = MAX_RECORD_PROMPT_CHARS,
): Record<string, string> {
  if (!record) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    if (typeof v === "string") out[k] = capString(v, maxPerValue);
  }
  return out;
}

export function capLatencies(
  latencies: Record<string, number> | undefined,
): Record<string, number> {
  if (!latencies) return {};
  const entries = Object.entries(latencies).slice(-MAX_LATENCY_ENTRIES);
  return Object.fromEntries(entries);
}
