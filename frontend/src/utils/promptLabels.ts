/** Etykiety ról ekspertów i zadań AI — wspólne dla panelu strategii i zakładki Prompty. */
export const PROMPT_LABELS: Record<string, string> = {
  defender: 'Obrońca',
  proceduralist: 'Specjalista Proceduralny',
  constitutionalist: 'Konstytucjonalista',
  negotiator: 'Mediator/Negocjator',
  evidencecracker: 'Analityk Dowodowy',
  inquisitor: 'Inkwizytor',
  oracle: 'Wyrocznia Prawna',
  draftsman: 'Redaktor Pism',
  grandmaster: 'Strateg/Arcymistrz',
  prosecutor: 'Prokurator',
  investigator: 'Śledczy',
  forensic_expert: 'Biegły Sądowy',
  hard_judge: 'Główny Analityk Śledczy',
  sentencing_expert: 'Ekspert ds. Wyroków',
  navigator: 'Nawigator',
  general: 'Diagnoza ogólna',
  analysis: 'Analiza dokumentów',
  drafting: 'Redagowanie pism',
  research: 'Badania i orzecznictwo',
  strategy: 'Plan strategiczny',
  criminal_defense: 'Obrona karna',
  rights_defense: 'Ochrona praw',
  document_attack: 'Atak na dokument',
  emergency_relief: 'Tryb ratunkowy',
  charge_building: 'Budowanie zarzutów',
  indictment_review: 'Rewizja aktu oskarżenia',
  sentencing_argument: 'Argumentacja ds. kary',
  warrant_application: 'Wniosek o areszt',
};

export function translatePromptKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  return PROMPT_LABELS[normalized] ?? key.replace(/_/g, ' ').toUpperCase();
}
