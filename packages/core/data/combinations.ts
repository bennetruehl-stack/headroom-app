// Welche Jobarten sich kombinieren lassen und was dann gilt.
// Die Regeltexte stehen in der App-Übersetzung (Schlüssel `combo<Id>Rule`).
// Ein Teil `main` steht für einen sozialversicherungspflichtigen Hauptjob: entweder
// ein Job vom Typ `regular` oder das Profil „Angestellt“ mit Hauptjob.
import type { EmploymentType, ProfileStatus } from '../src/types';

export type ComboPart = EmploymentType | 'main';

export type JobCombinationId =
  | 'miniMini'
  | 'workingStudentMini'
  | 'workingStudentShort'
  | 'miniShort'
  | 'mainMini'
  | 'mainShort';

export type JobCombination = {
  id: JobCombinationId;
  parts: ComboPart[];
  appliesTo: ProfileStatus[];
  /** Nur sinnvoll, wenn das Profil einen Hauptjob hat. */
  requiresMainJob?: boolean;
  sourceName: string;
  sourceUrl: string;
};

const multipleJobs = 'https://www.minijob-zentrale.de/DE/die-minijobs/mehrere-jobs/mehrere-jobs_node.html';
const shortTerm = 'https://www.minijob-zentrale.de/DE/meta/faq-bereich/begriffe-und-beschaeftigungsarten/_node.html';
const workingStudent =
  'https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/W/werkstudentenprivileg';

export const jobCombinations: JobCombination[] = [
  {
    id: 'miniMini',
    parts: ['mini-job', 'mini-job'],
    appliesTo: ['Student', 'Working student', 'Mini-jobber', 'Pupil'],
    sourceName: 'Minijob-Zentrale – Mehrere Jobs',
    sourceUrl: multipleJobs,
  },
  {
    id: 'workingStudentMini',
    parts: ['working student', 'mini-job'],
    appliesTo: ['Working student'],
    sourceName: 'Deutsche Rentenversicherung – Werkstudentenprivileg',
    sourceUrl: workingStudent,
  },
  {
    id: 'workingStudentShort',
    parts: ['working student', 'short-term'],
    appliesTo: ['Working student'],
    sourceName: 'Deutsche Rentenversicherung – Werkstudentenprivileg',
    sourceUrl: workingStudent,
  },
  {
    id: 'miniShort',
    parts: ['mini-job', 'short-term'],
    appliesTo: ['Student', 'Working student', 'Mini-jobber', 'Employee', 'Pupil'],
    sourceName: 'Minijob-Zentrale – Mehrere Jobs',
    sourceUrl: multipleJobs,
  },
  {
    id: 'mainMini',
    parts: ['main', 'mini-job'],
    appliesTo: ['Employee'],
    requiresMainJob: true,
    sourceName: 'Minijob-Zentrale – Mehrere Jobs',
    sourceUrl: multipleJobs,
  },
  {
    id: 'mainShort',
    parts: ['main', 'short-term'],
    appliesTo: ['Employee'],
    requiresMainJob: true,
    sourceName: 'Minijob-Zentrale – Kurzfristige Beschäftigung',
    sourceUrl: shortTerm,
  },
];
