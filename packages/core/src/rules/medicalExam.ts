// Ärztliche Erstuntersuchung nach § 32 JArbSchG. Reine Funktion, Datum wird übergeben.
import type { Job, Profile } from '../types';
import { tagsForJob } from './jobTags';
import { ADULT_AGE, CHILD_AGE_LIMIT, MEDICAL_EXAM_EXEMPT_MAX_MONTHS, MEDICAL_EXAM_MAX_AGE_MONTHS } from './legalConstants';
import { ageOn } from './youthLabor/profile';

export type MedicalExamStatus = {
  /** Muss vor Jobbeginn eine Untersuchung vorliegen? */
  required: boolean;
  /** Warum nicht: geringfügig oder höchstens 2 Monate, jeweils mit leichter Arbeit. */
  exemptReason: 'marginalLightWork' | 'shortLightWork' | null;
  /** Eingetragene Untersuchung ist höchstens 14 Monate vor Jobbeginn. */
  examValid: boolean;
  /** Spätestes Datum, das die Untersuchung haben darf (Jobbeginn). Frühestes: 14 Monate davor. */
  earliestExamDate: string;
  lawRef: string;
  url: string;
};

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/**
 * Gilt für Jugendliche (15–17), die ins Berufsleben eintreten. `null`, wenn die Regel nicht greift
 * (unter 15 oder ab 18 zum Jobbeginn).
 */
export function medicalExamStatus(profile: Profile, job: Job): MedicalExamStatus | null {
  const age = ageOn(profile, job.startDate);
  if (age < CHILD_AGE_LIMIT.value || age >= ADULT_AGE.value) return null;
  const light = tagsForJob(job).includes('lightWork');
  const shortJob = Boolean(job.endDate) && job.endDate! <= addMonths(job.startDate, MEDICAL_EXAM_EXEMPT_MAX_MONTHS.value);
  const exemptReason = !light ? null : job.type === 'mini-job' ? 'marginalLightWork' : shortJob ? 'shortLightWork' : null;
  const earliestExamDate = addMonths(job.startDate, -MEDICAL_EXAM_MAX_AGE_MONTHS.value);
  const exam = profile.medicalExamDate;
  return {
    required: exemptReason === null,
    exemptReason,
    examValid: Boolean(exam && exam >= earliestExamDate && exam <= job.startDate),
    earliestExamDate,
    lawRef: MEDICAL_EXAM_MAX_AGE_MONTHS.lawRef,
    url: MEDICAL_EXAM_MAX_AGE_MONTHS.url,
  };
}
