export type ExternalReference = {
  id: string;
  name: string;
  url: string;
  note_de?: string;
  note_en?: string;
};

export const references: ExternalReference[] = [
  {
    id: 'entgeltatlas',
    name: 'Entgeltatlas',
    url: 'https://web.arbeitsagentur.de/entgeltatlas/',
    note_de: 'Zeigt Monatsentgelte als grobe Orientierung, keine Stundenlöhne für Minijobs.',
    note_en: 'Shows monthly salaries as a rough reference, not mini-job hourly wages.',
  },
  { id: 'elster', name: 'ELSTER', url: 'https://www.elster.de/' },
  { id: 'minijob', name: 'Minijob-Zentrale', url: 'https://www.minijob-zentrale.de/' },
  {
    id: 'kldb',
    name: 'KldB',
    url: 'https://statistik.arbeitsagentur.de/DE/Navigation/Grundlagen/Klassifikationen/Klassifikation-der-Berufe/Klassifikation-der-Berufe-Nav.html',
  },
  {
    id: 'wz',
    name: 'WZ 2025',
    url: 'https://www.destatis.de/DE/Methoden/Klassifikationen/Gueter-Wirtschaftsklassifikationen/klassifikation-wz.html',
  },
];
