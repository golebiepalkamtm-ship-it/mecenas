import type { LexIconName } from '../Layout/LexIcon';

export type SettingsTabId = 'Profil' | 'Modele AI';

export interface SettingsTabDef {
  id: SettingsTabId;
  lexIcon: LexIconName;
  label: string;
  shortLabel: string;
  description: string;
}

export const SETTINGS_TABS: readonly SettingsTabDef[] = [
  {
    id: 'Profil',
    lexIcon: 'profil',
    label: 'Profil',
    shortLabel: 'Profil',
    description: 'Tożsamość, subskrypcja i bezpieczeństwo',
  },
  {
    id: 'Modele AI',
    lexIcon: 'ai',
    label: 'Modele AI',
    shortLabel: 'Modele',
    description: 'Orkiestracja i ulubione modele',
  },
] as const;
