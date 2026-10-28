// Merkmale eines Jobs (Tags) und welche Jugendschutz-Regel daran hängt. Datengetrieben:
// Die UI fragt nur `jobTagFindings`, sie kennt keine einzelnen Tags.
import { jobPresets } from '../../data/jobPresets';
import type { Job, JobTag } from '../types';

/** WZ-Abteilung (erste zwei Ziffern) → Tags, für Jobs ohne Vorlage oder aus älteren Ständen. */
const tagsByWz: Record<string, JobTag[]> = {
  '01': ['agriculture'],
  '47': ['retail'],
  '55': ['gastronomy'],
  '56': ['gastronomy'],
  '86': ['hospital'],
  '87': ['hospital'],
  '93': ['sport'],
  '97': ['household'],
};

/** Tags eines Jobs: gespeicherte Tags, sonst die der Vorlage, sonst aus dem WZ-Code abgeleitet. */
export function tagsForJob(job: Pick<Job, 'tags' | 'presetId' | 'industry' | 'title'> | undefined): JobTag[] {
  if (!job) return [];
  // Gespeicherte Tags gelten, auch eine leere Liste (bewusst abgewählt).
  if (job.tags) return job.tags;
  const preset = jobPresets.find((item) => item.id === job.presetId)
    ?? jobPresets.find((item) => item.title_de === job.title || item.title_en === job.title);
  if (preset?.tags.length) return preset.tags;
  const wz = job.industry?.trim().slice(0, 2) ?? '';
  return tagsByWz[wz] ?? [];
}

export type JobTagRule = {
  tag: JobTag;
  ruleId: 'pieceWork' | 'hazardousWork' | 'barNightclub' | 'alcoholTobacco';
  severity: 'error' | 'warning' | 'info';
  lawRef: string;
  url: string;
  /** Gilt bis zu diesem Alter (ausschließlich). */
  underAge: number;
  message: string;
  message_en: string;
};

/** § 22, § 23 JArbSchG (am 2026-10-28 geprüft) und Hinweise nach dem Jugendschutzgesetz. */
export const JOB_TAG_RULES: JobTagRule[] = [
  {
    tag: 'pieceWork',
    ruleId: 'pieceWork',
    severity: 'error',
    lawRef: '§ 23 JArbSchG',
    url: 'https://www.gesetze-im-internet.de/jarbschg/__23.html',
    underAge: 18,
    message: 'Akkord- und Fließbandarbeit mit vorgegebenem Tempo ist unter 18 verboten.',
    message_en: 'Piece work and assembly-line work at a set pace is not allowed under 18.',
  },
  {
    tag: 'hazardous',
    ruleId: 'hazardousWork',
    severity: 'error',
    lawRef: '§ 22 JArbSchG',
    url: 'https://www.gesetze-im-internet.de/jarbschg/__22.html',
    underAge: 18,
    message: 'Gefährliche Arbeiten sind unter 18 grundsätzlich verboten. Ausnahmen gibt es nur in der Ausbildung unter Aufsicht.',
    message_en: 'Dangerous work is generally not allowed under 18. Exceptions exist only in training under supervision.',
  },
  {
    tag: 'barNightclub',
    ruleId: 'barNightclub',
    severity: 'info',
    lawRef: '§§ 4, 5 JuSchG',
    url: 'https://www.gesetze-im-internet.de/juschg/__4.html',
    underAge: 18,
    message: 'In Bars, Clubs und Nachtlokalen gelten Altersgrenzen nach dem Jugendschutzgesetz. Frag nach, ob du dort arbeiten darfst.',
    message_en: 'Bars, clubs and night venues have age limits under the Youth Protection Act. Ask whether you may work there.',
  },
  {
    tag: 'alcoholTobacco',
    ruleId: 'alcoholTobacco',
    severity: 'info',
    lawRef: '§§ 9, 10 JuSchG',
    url: 'https://www.gesetze-im-internet.de/juschg/__9.html',
    underAge: 18,
    message: 'Beim Verkauf von Alkohol und Tabak gelten Altersgrenzen für Kund:innen. Frag im Job, wer das prüft und was du verkaufen darfst.',
    message_en: 'Age limits for customers apply when selling alcohol and tobacco. Ask at work who checks this and what you may sell.',
  },
];

export function jobTagFindings(job: Job | undefined, age: number): JobTagRule[] {
  const tags = tagsForJob(job);
  return JOB_TAG_RULES.filter((rule) => tags.includes(rule.tag) && age < rule.underAge);
}
