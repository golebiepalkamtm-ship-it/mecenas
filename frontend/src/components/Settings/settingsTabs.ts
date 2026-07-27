import type { LexIconName } from '../Layout/LexIcon';

export type SettingsTabId =
  | 'Profil'
  | 'Subskrypcja'
  | 'Bezpieczeństwo'
  | 'Preferencje'
  | 'Dane'
  | 'Modele AI';

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
    description: 'Dane osobowe i informacje o koncie',
  },
  {
    id: 'Subskrypcja',
    lexIcon: 'library',
    label: 'Subskrypcja & Płatności',
    shortLabel: 'Subskrypcja',
    description: 'Plan, rozliczenia i historia płatności',
  },
  {
    id: 'Bezpieczeństwo',
    lexIcon: 'shield',
    label: 'Bezpieczeństwo',
    shortLabel: 'Bezpieczeństwo',
    description: 'Hasło, 2FA i sesje',
  },
  {
    id: 'Preferencje',
    lexIcon: 'settings',
    label: 'Preferencje',
    shortLabel: 'Preferencje',
    description: 'Motyw, język, powiadomienia',
  },
  {
    id: 'Dane',
    lexIcon: 'documents',
    label: 'Dane & GDPR',
    shortLabel: 'Dane',
    description: 'Eksport danych, usunięcie konta',
  },
  {
    id: 'Modele AI',
    lexIcon: 'ai',
    label: 'Modele AI',
    shortLabel: 'Modele',
    description: 'Orkiestracja i ulubione modele',
  },
] as const;
