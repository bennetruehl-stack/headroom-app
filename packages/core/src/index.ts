import { jobPresets } from '../data/jobPresets';
import { limits, limitsForYear, miniJobCapFormula } from '../data/limits';
import { consentAgeRule } from '../data/privacy';
import { roleLayouts, roleTier } from '../data/roles';
import type { Job, Limit, Profile, ProfileStatus, RiskStatus, Shift } from './types';

export * from './types';
export * from './shiftImport';
export { consentAgeRule, jobPresets, limits, limitsForYear, miniJobCapFormula, roleLayouts, roleTier };
export type { RoleItem, RoleLayout, RoleTier } from '../data/roles';

export function limitValue(id: string, year = new Date().getFullYear()): number {
  return limitsForYear(year).find((limit) => limit.id === id)?.value ?? 0;
}

export function statusFor(ratio: number): RiskStatus {
  if (ratio < 0.8) return 'Safe';
  if (ratio <= 1) return 'Close';
  return 'Over';
}

export function activeLimits(profile: Profile, year = new Date().getFullYear()): Limit[] {
  return limitsForYear(year).filter((limit) => {
    if (!limit.appliesTo.includes(profile.status)) return false;
    const ageBoundary = limit.condition?.match(/age\s*<\s*(\d+)/i)?.[1];
    switch (limit.id) {
      case 'familyInsurance':
        return profile.familyInsured && ageBoundary !== undefined && profile.age < Number(ageBoundary);
      case 'miniJobAlongsideMainJob':
        return profile.hasMainJob !== false;
      case 'bafoegSideIncome':
        return profile.bafoeg;
      case 'youthWorkProtection':
        return ageBoundary !== undefined && profile.age < Number(ageBoundary);
      default:
        return true;
    }
  });
}

export function earnings(shift: Shift, job: Job): number {
  return Math.max(0, shift.hours) * Math.max(0, job.wage) + Math.max(0, shift.surchargeAmount ?? 0);
}

export function jobForShift(shift: Shift, jobs: Job[]): Job | undefined {
  return jobs.find((job) => job.id === shift.jobId);
}

export function monthTotal(
  shifts: Shift[],
  jobs: Job[],
  month: string,
  employmentTypes?: Job['type'][],
): number {
  return shifts.reduce((total, shift) => {
    if (!shift.date.startsWith(month)) return total;
    const job = jobForShift(shift, jobs);
    if (!job || (employmentTypes && !employmentTypes.includes(job.type))) return total;
    return total + earnings(shift, job);
  }, 0);
}

export function monthlySummary(
  total: number,
  cap = limitValue('miniJobMonthly'),
  wage = limitValue('minimumWage'),
) {
  const safeCap = Math.max(cap, 0);
  const ratio = safeCap === 0 ? (total > 0 ? Infinity : 0) : total / safeCap;
  return {
    total,
    remaining: Math.max(0, safeCap - total),
    over: Math.max(0, total - safeCap),
    hours: wage > 0 ? Math.max(0, safeCap - total) / wage : 0,
    ratio,
    status: statusFor(ratio),
  };
}

export function annualMiniProjection(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  nowMonth = 12,
): number {
  return annualIncomeProjection(shifts, jobs, year, ['mini-job'], nowMonth);
}

export function annualIncomeProjection(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  employmentTypes: Job['type'][],
  nowMonth = 12,
): number {
  return annualProjectionBreakdown(shifts, jobs, year, employmentTypes, nowMonth).projected;
}

export function annualProjectionBreakdown(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  employmentTypes: Job['type'][],
  nowMonth = 12,
) {
  const eligibleJobs = new Set(
    jobs.filter((job) => employmentTypes.includes(job.type)).map((job) => job.id),
  );
  const yearly = shifts.filter(
    (shift) => shift.date.startsWith(String(year)) && eligibleJobs.has(shift.jobId),
  );
  const currentMonth = Math.min(12, Math.max(1, nowMonth));
  const actual = yearly.filter(
    (shift) => !shift.planned && Number(shift.date.slice(5, 7)) <= currentMonth,
  );
  const future = yearly.filter(
    (shift) => shift.planned || Number(shift.date.slice(5, 7)) > currentMonth,
  );
  const amount = (items: Shift[]) =>
    items.reduce((sum, shift) => {
      const job = jobForShift(shift, jobs);
      return sum + (job ? earnings(shift, job) : 0);
    }, 0);

  const actualTotal = amount(actual);
  const plannedTotal = amount(future);
  const monthsWithActualIncome = new Set(actual.map((shift) => shift.date.slice(0, 7))).size;
  const averagePastMonth = monthsWithActualIncome ? actualTotal / monthsWithActualIncome : 0;
  const plannedMonths = new Set(
    future
      .map((shift) => shift.date.slice(0, 7))
      .filter((month) => Number(month.slice(5, 7)) > currentMonth),
  ).size;
  const remainingMonths = Math.max(0, 12 - currentMonth - plannedMonths);
  return {
    actual: actualTotal,
    planned: plannedTotal,
    averagePastMonth,
    remainingMonths,
    projected: actualTotal + plannedTotal + averagePastMonth * remainingMonths,
  };
}

export function monthlyIncomeForLimit(
  shifts: Shift[],
  jobs: Job[],
  limitId: string,
  month: string,
): number {
  if (limitId === 'miniJobMonthly') {
    return monthTotal(shifts, jobs, month, ['mini-job']);
  }
  return monthTotal(shifts, jobs, month);
}

/**
 * Wie viel ein Minijob im Monat noch verdienen darf, ohne dass alle Minijobs
 * zusammen über der Monatsgrenze liegen. Der Job mit `excludeJobId` (z. B. der
 * gerade bearbeitete) zählt nicht mit.
 */
export function miniJobRoomBesideOthers(
  shifts: Shift[],
  jobs: Job[],
  month: string,
  excludeJobId?: string,
  cap = limitValue('miniJobMonthly'),
) {
  const others = jobs.filter((job) => job.type === 'mini-job' && job.id !== excludeJobId);
  const used = monthTotal(shifts, others, month, ['mini-job']);
  const otherJobsWithIncome = others.filter((job) =>
    shifts.some((shift) => shift.jobId === job.id && shift.date.startsWith(month)),
  ).length;
  return { used, room: Math.max(0, cap - used), otherJobsWithIncome };
}

/**
 * Mehrere Minijobs werden Monat für Monat zusammengerechnet. Liegt die Summe
 * über der Grenze, hilft eine Jahresbetrachtung nicht (Minijob-Zentrale, „Mehrere Minijobs“).
 */
export function multipleMiniJobsOverCap(
  shifts: Shift[],
  jobs: Job[],
  month: string,
  cap = limitValue('miniJobMonthly'),
): boolean {
  const miniJobsWithIncome = jobs.filter((job) =>
    job.type === 'mini-job' && shifts.some((shift) => shift.jobId === job.id && shift.date.startsWith(month)),
  ).length;
  return cap > 0 && miniJobsWithIncome >= 2 && monthTotal(shifts, jobs, month, ['mini-job']) > cap;
}

export function shortDays(shifts: Shift[], year?: number): number {
  const relevant = shifts.filter(
    (shift) => !year || shift.date.startsWith(String(year)),
  );
  const explicitDays = relevant
    .filter((shift) => (shift.days ?? 0) > 1)
    .reduce((sum, shift) => sum + (shift.days ?? 0), 0);
  const distinctSingleDates = new Set(
    relevant
      .filter((shift) => (shift.days ?? 1) <= 1)
      .map((shift) => shift.date),
  );
  return explicitDays + distinctSingleDates.size;
}

export function shiftCheck(total: number, added: number, cap = limitValue('miniJobMonthly')) {
  const projected = total + added;
  return {
    projected,
    over: Math.max(0, projected - cap),
    remaining: Math.max(0, cap - projected),
    status: statusFor(cap > 0 ? projected / cap : projected > 0 ? Infinity : 0),
  };
}

export function workingHoursCheck(
  hours: number,
  inLecturePeriod: boolean,
  limit = limitValue('workingStudentHours'),
) {
  return {
    hours,
    limit: inLecturePeriod ? limit : null,
    over: inLecturePeriod && hours > limit,
  };
}

export function hoursInWeek(shifts: Shift[], date: string): number {
  const selected = new Date(date + 'T12:00:00');
  const weekday = selected.getDay();
  selected.setDate(selected.getDate() - ((weekday + 6) % 7));
  const start = new Date(selected);
  const end = new Date(selected);
  end.setDate(start.getDate() + 7);
  const startKey = new Date(start.getTime() - start.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const endKey = new Date(end.getTime() - end.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return shifts
    .filter((shift) => shift.date >= startKey && shift.date < endKey)
    .reduce((total, shift) => total + Math.max(0, shift.hours), 0);
}

export function isInLecturePeriod(date: string, profile: Profile): boolean {
  return (profile.semesterPeriods ?? []).some(
    ({ start, end }) => date >= start && date <= end,
  );
}

export function shortDayStatus(days: number, limit = limitValue('shortTermEmployment')) {
  return { days, remaining: Math.max(0, limit - days), over: days > limit };
}

export function employeeMiniJobStatus(count: number) {
  return { count, over: count > 1, extra: Math.max(0, count - 1) };
}

export function miniJobCap2027(wage = limitValue('minimumWage', 2027)): number {
  return Math.ceil((wage * miniJobCapFormula.minimumWageMultiplier) / miniJobCapFormula.divisor);
}

export function wageBelowMinimum(wage: number, min = limitValue('minimumWage')): boolean {
  return wage < min;
}

export function peerMedian(rows: { hourlyWage: number }[]): number | null {
  if (rows.length < 20) return null;
  const sorted = rows.map((row) => row.hourlyWage).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function peerWagePosition(hourlyWage: number, median: number): 'below' | 'usual' | 'above' {
  if (median <= 0) return 'usual';
  const ratio = hourlyWage / median;
  if (ratio < 0.9) return 'below';
  if (ratio > 1.1) return 'above';
  return 'usual';
}

export function recommendationLevel(facts: {
  regularSecondJob?: boolean;
  underTaxThreshold?: boolean;
  familyInsuranceEnds?: boolean;
  overMiniJobPermanently?: boolean;
  unclassified?: boolean;
}): 0 | 1 | 2 | 3 | 4 {
  if (facts.unclassified) return 4;
  if (facts.overMiniJobPermanently) return 3;
  if (facts.familyInsuranceEnds) return 2;
  if (facts.regularSecondJob && facts.underTaxThreshold) return 1;
  return 0;
}

export function companyPlausibility(value: string, existing: string[] = []) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return { ok: true, normalized, suggestion: undefined as string | undefined };
  if (normalized.length < 2) {
    return { ok: false, normalized, errorCode: 'tooShort' as const };
  }
  if (/^\d+$/.test(normalized)) {
    return { ok: false, normalized, errorCode: 'digitsOnly' as const };
  }
  if (/^(asdf|qwer|zxcv|qwerty|asdfg)+$/i.test(normalized) || /(.)\1{4,}/i.test(normalized)) {
    return { ok: false, normalized, errorCode: 'keyboardMash' as const };
  }
  const canonical = (input: string) =>
    input.toLocaleLowerCase('de').replace(/\s+/g, ' ').trim();
  const distance = (left: string, right: string) => {
    const row = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const old = row[j];
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          previous + (left[i - 1] === right[j - 1] ? 0 : 1),
        );
        previous = old;
      }
    }
    return row[right.length];
  };
  const normalizedValue = canonical(normalized);
  const suggestion = existing.find((candidate) => {
    const other = canonical(candidate);
    if (normalizedValue === other) return false;
    const editDistance = distance(normalizedValue, other);
    return editDistance <= 2 || editDistance / Math.max(normalizedValue.length, other.length) < 0.2;
  });
  return { ok: true, normalized, suggestion };
}

export function validProfileStatus(value: string): value is ProfileStatus {
  return ['Student', 'Working student', 'Mini-jobber', 'Employee', 'Pupil'].includes(value);
}
