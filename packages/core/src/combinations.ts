// Jobkombinationen: welche Kombis zum Profil passen und wie die eigenen Jobs zusammen dastehen.
// Rechnet nichts neu, sondern setzt die bestehenden Prüfungen pro Kombi zusammen.
import { jobCombinations, type ComboPart, type JobCombination, type JobCombinationId } from '../data/combinations';
import {
  activeLimits,
  employeeMiniJobStatus,
  hoursInWeek,
  isInLecturePeriod,
  limitRecord,
  monthTotal,
  monthlyLimitCheck,
  shortDays,
  statusFor,
  usableLimitValue,
} from './index';
import type { EmploymentType, Job, OneTimePayment, Profile, RiskStatus, Shift } from './types';

export { jobCombinations };
export type { ComboPart, JobCombination, JobCombinationId };

/** Jobs, die im Kalenderjahr mindestens einen Tag laufen. */
export function jobsInYear(jobs: Job[], year: number): Job[] {
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  return jobs.filter((job) => job.startDate <= last && (!job.endDate || job.endDate >= first));
}

/** Profil „Angestellt“ mit Hauptjob zählt als Hauptjob, auch ohne angelegten regulären Job. */
export function hasMainJob(profile: Profile, jobs: Job[]): boolean {
  return (profile.status === 'Employee' && profile.hasMainJob !== false) || jobs.some((job) => job.type === 'regular');
}

function partCounts(profile: Profile, jobs: Job[]): Record<ComboPart, number> {
  const counts: Record<ComboPart, number> = { 'mini-job': 0, 'short-term': 0, 'working student': 0, regular: 0, main: 0 };
  for (const job of jobs) counts[job.type] += 1;
  counts.main = hasMainJob(profile, jobs) ? 1 : 0;
  return counts;
}

function matches(combo: JobCombination, counts: Record<ComboPart, number>): boolean {
  const needed: Partial<Record<ComboPart, number>> = {};
  for (const part of combo.parts) needed[part] = (needed[part] ?? 0) + 1;
  return Object.entries(needed).every(([part, count]) => counts[part as ComboPart] >= (count ?? 0));
}

export type ComboProfileNote = 'familyTotal' | 'bafoeg' | 'youth';

export type PossibleCombination = { combo: JobCombination; notes: ComboProfileNote[] };

/** Kombis, die für dieses Profil grundsätzlich in Frage kommen, mit Hinweisen aus dem Profil. */
export function possibleCombinations(profile: Profile, year = new Date().getFullYear()): PossibleCombination[] {
  const active = activeLimits(profile, year).map((limit) => limit.id);
  const notes: ComboProfileNote[] = [];
  if (active.includes('familyInsurance')) notes.push('familyTotal');
  if (profile.bafoeg) notes.push('bafoeg');
  if (profile.age < 18) notes.push('youth');
  return jobCombinations
    .filter((combo) => combo.appliesTo.includes(profile.status))
    .filter((combo) => !combo.requiresMainJob || profile.hasMainJob !== false)
    .map((combo) => ({ combo, notes }));
}

/** Kombis, die die eigenen Jobs im Jahr tatsächlich bilden. */
export function detectedCombinations(profile: Profile, jobs: Job[], year: number): JobCombination[] {
  const counts = partCounts(profile, jobsInYear(jobs, year));
  return jobCombinations.filter((combo) => matches(combo, counts));
}

export type ComboCheckId = 'miniJobMonthly' | 'miniJobsBesideMain' | 'workingStudentHours' | 'shortTermDays' | 'familyInsurance';

export type ComboCheck = {
  id: ComboCheckId;
  used: number;
  /** `null`: kein geprüfter Wert für das Jahr, also ohne Status anzeigen. */
  limit: number | null;
  unit: 'eur' | 'hours' | 'days' | 'count';
  ratio?: number;
  status?: RiskStatus;
  /** Nur für die 20-Stunden-Zeile: außerhalb der Vorlesungszeit gilt die Grenze nicht. */
  inLecturePeriod?: boolean;
  /** Anteil je Job (Stunden oder Euro). */
  perJob?: { jobId: string; title: string; value: number }[];
};

export type ShortTermRisk = 'noMainJob' | 'highEarnings';

export type CombinationResult = {
  combos: JobCombination[];
  checks: ComboCheck[];
  shortTermRisk: ShortTermRisk | null;
};

function withStatus(used: number, limit: number | null): Pick<ComboCheck, 'ratio' | 'status'> {
  if (limit === null || limit <= 0) return {};
  const ratio = used / limit;
  return { ratio, status: statusFor(ratio) };
}

/**
 * Prüfzeilen für die erkannte Jobkombi im Monat. Liefert keine Kombis,
 * wenn nur ein Job (oder nur eine Jobart ohne Zusammenrechnung) vorliegt.
 */
export function combinationChecks({
  profile,
  jobs,
  shifts,
  payments = [],
  month,
  today,
  year = Number(month.slice(0, 4)),
}: {
  profile: Profile;
  jobs: Job[];
  shifts: Shift[];
  payments?: OneTimePayment[];
  month: string;
  today: string;
  year?: number;
}): CombinationResult {
  const combos = detectedCombinations(profile, jobs, year);
  if (combos.length === 0) return { combos, checks: [], shortTermRisk: null };
  const yearJobs = jobsInYear(jobs, year);
  const has = (type: EmploymentType) => yearJobs.some((job) => job.type === type);
  const ofType = (type: EmploymentType) => yearJobs.filter((job) => job.type === type);
  const checks: ComboCheck[] = [];

  if (has('mini-job')) {
    const limit = limitRecord('miniJobMonthly', year);
    const result = limit ? monthlyLimitCheck(limit, shifts, jobs, month, year, payments) : null;
    const perJob = ofType('mini-job').map((job) => ({
      jobId: job.id,
      title: job.title,
      value: monthTotal(shifts, [job], month, ['mini-job'], payments),
    }));
    checks.push(result
      ? { id: 'miniJobMonthly', used: result.total, limit: result.cap, unit: 'eur', ratio: result.ratio, status: result.status, perJob }
      : { id: 'miniJobMonthly', used: perJob.reduce((sum, row) => sum + row.value, 0), limit: null, unit: 'eur', perJob });
    if (hasMainJob(profile, yearJobs)) {
      const rule = employeeMiniJobStatus(ofType('mini-job').length);
      const allowed = usableLimitValue('miniJobAlongsideMainJob', year);
      checks.push({
        id: 'miniJobsBesideMain',
        used: rule.count,
        limit: allowed,
        unit: 'count',
        ...(allowed !== null ? { status: rule.count > allowed ? 'Over' as const : 'Safe' as const } : {}),
      });
    }
  }

  if (has('working student')) {
    const limit = usableLimitValue('workingStudentHours', year);
    const lecture = isInLecturePeriod(today, profile);
    const perJob = yearJobs.map((job) => ({
      jobId: job.id,
      title: job.title,
      value: Math.round(hoursInWeek(shifts.filter((shift) => shift.jobId === job.id), today) * 10) / 10,
    })).filter((row) => row.value > 0);
    const used = Math.round(hoursInWeek(shifts.filter((shift) => yearJobs.some((job) => job.id === shift.jobId)), today) * 10) / 10;
    checks.push({
      id: 'workingStudentHours',
      used,
      limit,
      unit: 'hours',
      inLecturePeriod: lecture,
      perJob,
      ...(lecture ? withStatus(used, limit) : {}),
    });
  }

  if (has('short-term')) {
    const shortShifts = shifts.filter((shift) => jobs.find((job) => job.id === shift.jobId)?.type === 'short-term');
    const days = shortDays(shortShifts, year);
    const limit = usableLimitValue('shortTermEmployment', year);
    checks.push({ id: 'shortTermDays', used: days, limit, unit: 'days', ...withStatus(days, limit) });
  }

  const family = activeLimits(profile, year).find((limit) => limit.id === 'familyInsurance');
  if (family) {
    const result = monthlyLimitCheck(family, shifts, jobs, month, year, payments);
    if (result) checks.push({ id: 'familyInsurance', used: result.total, limit: result.cap, unit: 'eur', ratio: result.ratio, status: result.status });
  }

  return { combos, checks, shortTermRisk: shortTermProfessionalRisk(profile, jobs, shifts, month, year, payments) };
}

/** Kurzfristige Grenze ist nur relevant, wenn sie zum Status passt und ein kurzfristiger Job im Jahr läuft. */
export function shortTermApplies(profile: Profile, jobs: Job[], year: number): boolean {
  const limit = limitRecord('shortTermEmployment', year);
  return Boolean(limit?.appliesTo.includes(profile.status)) && jobsInYear(jobs, year).some((job) => job.type === 'short-term');
}

/**
 * Hinweis, wenn eine kurzfristige Beschäftigung berufsmäßig sein könnte. Dann wäre sie
 * nicht mehr sozialversicherungsfrei. Bewusst nur ein Hinweis, keine Bewertung.
 * - noMainJob: angestellt ohne Hauptjob (z. B. arbeitssuchend oder zwischen zwei Jobs)
 * - highEarnings: im Monat mehr als die Minijob-Grenze, ohne Schule, Studium oder Werkstudentenjob
 */
export function shortTermProfessionalRisk(
  profile: Profile,
  jobs: Job[],
  shifts: Shift[],
  month: string,
  year = Number(month.slice(0, 4)),
  payments: OneTimePayment[] = [],
): ShortTermRisk | null {
  if (!jobsInYear(jobs, year).some((job) => job.type === 'short-term')) return null;
  if (profile.status === 'Employee' && profile.hasMainJob === false) return 'noMainJob';
  if (profile.status === 'Mini-jobber' || profile.status === 'Employee') {
    const cap = usableLimitValue('miniJobMonthly', year);
    if (cap !== null && monthTotal(shifts, jobs, month, ['short-term'], payments) > cap) return 'highEarnings';
  }
  return null;
}
