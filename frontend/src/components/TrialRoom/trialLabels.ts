import type { TrialSide } from './types';

export const ROLE_LABELS: Record<string, string> = {
  defender: 'Obrońca',
  constitutionalist: 'Konstytucjonalista',
  proceduralist: 'Proceduralista',
  evidencecracker: 'Analityk dowodowy',
  negotiator: 'Negocjator',
  inquisitor: 'Inkwizytor',
  oracle: 'Wyrocznia',
  prosecutor: 'Prokurator',
  investigator: 'Śledczy',
  forensic_expert: 'Biegły',
  hard_judge: 'Audyt aktu',
  sentencing_expert: 'Wymiar kary',
  draftsman: 'Redaktor pism',
  grandmaster: 'Strateg',
};

export function roleLabel(roleId: string): string {
  return ROLE_LABELS[roleId] ?? roleId;
}

export const SIDE_META: Record<
  TrialSide,
  { title: string; short: string }
> = {
  defense: { title: 'Obrona', short: 'OBR' },
  prosecution: { title: 'Oskarżenie', short: 'OSK' },
};
