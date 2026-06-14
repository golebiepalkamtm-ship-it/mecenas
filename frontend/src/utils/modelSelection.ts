/** Wspólna logika list modeli — admin (dostępne) vs profil (ulubione) vs czat (aktywny zespół). */

export const MAX_USER_FAVORITE_MODELS = 20;
/** Jedna rola eksperta = jeden model w czacie (7 po każdej stronie). */
export const MAX_MOA_ACTIVE_MODELS = 7;

export const DEFENSE_EXPERT_ROLE_IDS = [
  'defender',
  'constitutionalist',
  'proceduralist',
  'evidencecracker',
  'negotiator',
  'inquisitor',
  'oracle',
] as const;

export const PROSECUTION_EXPERT_ROLE_IDS = [
  'prosecutor',
  'investigator',
  'forensic_expert',
  'hard_judge',
  'sentencing_expert',
  'inquisitor',
  'oracle',
] as const;

export function dedupeModelIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function filterFavoritesForAdminPool(
  favoriteIds: string[],
  adminEnabledIds: string[],
): { visible: string[]; hidden: string[] } {
  const deduped = dedupeModelIds(favoriteIds);
  if (adminEnabledIds.length === 0) {
    return { visible: deduped, hidden: [] };
  }
  const adminSet = new Set(adminEnabledIds);
  const visible: string[] = [];
  const hidden: string[] = [];
  for (const id of deduped) {
    if (adminSet.has(id)) visible.push(id);
    else hidden.push(id);
  }
  return { visible, hidden };
}

export function intersectModelIds(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return dedupeModelIds(a).filter((id) => set.has(id));
}
