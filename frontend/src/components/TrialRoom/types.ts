export type TrialSide = 'defense' | 'prosecution';

export const TRIAL_STEPS = [
  { id: 'case' as const, label: 'Sprawa', short: '1' },
  { id: 'defense' as const, label: 'Obrona', short: '2' },
  { id: 'prosecution' as const, label: 'Oskarżenie', short: '3' },
  { id: 'hearing' as const, label: 'Sala', short: '4' },
  { id: 'verdict' as const, label: 'Werdykt', short: '5' },
];
