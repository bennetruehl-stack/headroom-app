// Abgeleitete Profilangaben für den Schüler-Modus. Reine Funktionen; das Datum wird immer übergeben.
import type { Profile, SchoolLesson } from '../../types';
import { ADULT_AGE, CHILD_AGE_LIMIT, MIN_EMPLOYMENT_AGE } from '../legalConstants';

/** Alter in vollendeten Jahren an einem Stichtag. Ohne Geburtsdatum gilt das gespeicherte Alter. */
export function ageOn(profile: Pick<Profile, 'age' | 'birthDate'>, date: string): number {
  const birth = profile.birthDate;
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return profile.age;
  const years = Number(date.slice(0, 4)) - Number(birth.slice(0, 4));
  return date.slice(5) < birth.slice(5) ? years - 1 : years;
}

/** Datum des 18. Geburtstags oder `null` ohne Geburtsdatum. 29.02. wird im Nicht-Schaltjahr zum 01.03. */
export function adultBirthday(profile: Pick<Profile, 'birthDate'>): string | null {
  const birth = profile.birthDate;
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const year = Number(birth.slice(0, 4)) + ADULT_AGE.value;
  const candidate = year + birth.slice(4);
  return isIsoDay(candidate) ? candidate : year + '-03-01';
}

function isIsoDay(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Schüler-Modus: abgeleitet aus Alter und Status, kein eigener Schalter.
 * Aktiv unter 18 oder solange der Status „Schüler:in“ ist (bis zur Bestätigung am 18. Geburtstag).
 */
export function isStudentMode(profile: Profile, today: string): boolean {
  if (ageOn(profile, today) < ADULT_AGE.value) return true;
  // Ab 18 bleibt der Modus für Schüler:innen, bis der Wechsel am 18. Geburtstag bestätigt ist.
  const adult = adultBirthday(profile);
  const confirmed = adult !== null && (profile.handledTransitions ?? []).includes('adult@' + adult);
  return profile.status === 'Pupil' && !confirmed;
}

/** Jugendarbeitsschutz gilt unter 18, egal welcher Status. */
export function youthLaborApplies(profile: Profile, date: string): boolean {
  return ageOn(profile, date) < ADULT_AGE.value;
}

/**
 * Vollzeitschulpflicht. Fehlt die Angabe, nimmt Headroom bei Schüler:innen unter 18 vorsichtig „ja“ an
 * (strengere Regeln) und weist darauf hin, dass die Angabe fehlt.
 */
export function fullTimeSchoolObligated(profile: Profile): { value: boolean; assumed: boolean } {
  if (typeof profile.isFullTimeSchoolObligated === 'boolean') return { value: profile.isFullTimeSchoolObligated, assumed: false };
  return { value: profile.status === 'Pupil', assumed: profile.status === 'Pupil' };
}

export function isSchoolHoliday(profile: Profile, date: string): boolean {
  return (profile.schoolHolidays ?? []).some(({ start, end }) => Boolean(start && end) && start <= date && date <= end);
}

/**
 * Welche Regelgruppe an einem Tag gilt.
 * - none: 18 oder älter
 * - forbidden: unter 13
 * - child: Gruppe A – 13–14 Jahre oder vollzeitschulpflichtig außerhalb der Ferien (§ 2 Abs. 3, § 5 Abs. 3)
 * - youth: Gruppe B – 15–17, nicht vollzeitschulpflichtig
 * - holidayYouth: Gruppe B in den Ferien für Vollzeitschulpflichtige ab 15 (§ 5 Abs. 4, max. 4 Wochen)
 */
export type YouthGroup = 'none' | 'forbidden' | 'child' | 'youth' | 'holidayYouth';

export function youthGroup(profile: Profile, date: string): YouthGroup {
  const age = ageOn(profile, date);
  if (age >= ADULT_AGE.value) return 'none';
  if (age < MIN_EMPLOYMENT_AGE.value) return 'forbidden';
  if (age < CHILD_AGE_LIMIT.value) return 'child';
  if (!fullTimeSchoolObligated(profile).value) return 'youth';
  return isSchoolHoliday(profile, date) ? 'holidayYouth' : 'child';
}

/** Wochentag 1 = Montag … 7 = Sonntag. */
export function weekdayOf(date: string): SchoolLesson['weekday'] {
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  return (day === 0 ? 7 : day) as SchoolLesson['weekday'];
}

export function lessonsOn(profile: Profile, date: string): SchoolLesson[] {
  if (isSchoolHoliday(profile, date)) return [];
  const weekday = weekdayOf(date);
  return (profile.schoolSchedule ?? []).filter((lesson) => lesson.weekday === weekday && lesson.start && lesson.end && lesson.start < lesson.end);
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Liegt eine Schicht in der Unterrichtszeit (during) oder an einem Schultag vor dem Unterricht (before)?
 * Ohne Uhrzeiten lässt sich das nicht sagen (null).
 */
export function schoolCollision(
  profile: Profile,
  shift: { date: string; startTime?: string; endTime?: string },
): 'during' | 'before' | null {
  if (!shift.startTime || !shift.endTime) return null;
  const lessons = lessonsOn(profile, shift.date);
  if (!lessons.length) return null;
  const start = toMinutes(shift.startTime);
  let end = toMinutes(shift.endTime);
  if (end <= start) end += 24 * 60;
  if (lessons.some((lesson) => start < toMinutes(lesson.end) && end > toMinutes(lesson.start))) return 'during';
  const firstLesson = Math.min(...lessons.map((lesson) => toMinutes(lesson.start)));
  return end <= firstLesson ? 'before' : null;
}
