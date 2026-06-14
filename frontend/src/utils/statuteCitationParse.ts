import type { SourceReference } from "../types/chat";

export interface CiteLookup {
  byRefId: Map<string, SourceReference>;
  byArticleKey: Map<string, SourceReference>;
  byCaseNumber: Map<string, SourceReference>;
}

/** Klucz artykułu: numer + opcjonalny paragraf (np. 77|1). */
export function articleKey(num: string, par?: string | null): string {
  return `${num.toLowerCase()}|${par ?? ""}`;
}

export function parseArticleFromLabel(label: string): { num: string; par?: string } | null {
  const m = label.match(/art\.?\s*(\d+[a-z]?)(?:\s*§\s*(\d+))?/i);
  if (!m) return null;
  return { num: m[1].toLowerCase(), par: m[2] };
}

export function buildCiteLookup(sources?: SourceReference[]): CiteLookup {
  const byRefId = new Map<string, SourceReference>();
  const byArticleKey = new Map<string, SourceReference>();
  const byCaseNumber = new Map<string, SourceReference>();
  if (!sources?.length) return { byRefId, byArticleKey, byCaseNumber };

  for (const src of sources) {
    const refNum = src.ref_id.replace(/[[\]]/g, "");
    byRefId.set(refNum, src);
    const parsed = parseArticleFromLabel(src.label);
    if (parsed) {
      byArticleKey.set(articleKey(parsed.num, parsed.par), src);
      if (!parsed.par) {
        byArticleKey.set(articleKey(parsed.num, ""), src);
      }
    }
    const caseNum = parseCaseNumberFromLabel(src.label);
    if (caseNum) {
      byCaseNumber.set(normalizeCaseNumber(caseNum), src);
    }
  }
  return { byRefId, byArticleKey, byCaseNumber };
}

export function resolveSourceForMatch(
  lookup: CiteLookup,
  num: string,
  par?: string | null,
): SourceReference | undefined {
  const withPar = lookup.byArticleKey.get(articleKey(num, par));
  if (withPar) return withPar;
  return lookup.byArticleKey.get(articleKey(num, ""));
}

export function normalizeCaseNumber(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseCaseNumberFromLabel(label: string): string | null {
  const m = label.match(/\bsygn\.?(?:\s*akt\.?)?\s*([A-Za-z0-9./\- ]{3,})/i);
  if (!m) return null;
  return normalizeCaseNumber(m[1]);
}

export function resolveSourceForCase(
  lookup: CiteLookup,
  caseNumberRaw: string,
): SourceReference | undefined {
  return lookup.byCaseNumber.get(normalizeCaseNumber(caseNumberRaw));
}

/** Podlinkowuje każde art. … w tekście do #cite-N (gdy jest w cited_sources). */
export function linkStatuteCitationsInMarkdown(
  text: string,
  sources?: SourceReference[],
): string {
  if (!sources?.length || !text) return text;

  const lookup = buildCiteLookup(sources);
  const artRe =
    /\bart\.?\s*(\d+[a-z]?)(?:\s*§\s*(\d+))?(?:\s+pkt\.?\s*\d+)*/gi;

  const withArts = text.replace(artRe, (match, num: string, par?: string) => {
    const src = resolveSourceForMatch(lookup, num, par);
    if (!src) return match;
    const refNum = src.ref_id.replace(/[[\]]/g, "");
    const trimmed = match.trim();
    if (trimmed.includes("](#cite-")) return match;
    return `[${trimmed}](#cite-${refNum})`;
  });

  const sygnRe =
    /\bsygn\.?(?:\s*akt\.?)?\s*([A-Za-z0-9./\-][A-Za-z0-9./\- ]{2,40})/gi;
  return withArts.replace(sygnRe, (match, caseNum: string) => {
    const trimmed = match.trim();
    if (trimmed.includes("](#cite-")) return match;
    const src = resolveSourceForCase(lookup, caseNum);
    if (!src) return match;
    const refNum = src.ref_id.replace(/[[\]]/g, "");
    return `[${trimmed}](#cite-${refNum})`;
  });
}
