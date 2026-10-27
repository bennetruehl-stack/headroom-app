import { jobPresets } from '../data/jobPresets';
import { availableLimitYears, limits, limitsForYear, miniJobCapFormula } from '../data/limits';
import { consentAgeRule } from '../data/privacy';
import { roleLayouts, roleTier } from '../data/roles';
import type { Job, Limit, OneTimePayment, Profile, ProfileStatus, RiskStatus, Shift } from './types';

export * from './types';
export * from './input';
export * from './shiftImport';
export { availableLimitYears, consentAgeRule, jobPresets, limits, limitsForYear, miniJobCapFormula, roleLayouts, roleTier };
export type { RoleItem, RoleLayout, RoleTier } from '../data/roles';

export function limitRecord(id: string, year = new Date().getFullYear()): Limit | undefined {
  return limitsForYear(year).find((limit) => limit.id === id);
}

/**
 * Grenzwert für ein Jahr. `null` heißt „nicht verfügbar“: Für dieses Jahr ist kein
 * Wert hinterlegt. Aufrufer dürfen daraus keine Warnung und keinen Restbetrag ableiten.
 */
export function limitValue(id: string, year = new Date().getFullYear()): number | null {
  return limitRecord(id, year)?.value ?? null;
}

/**
 * Letzter bekannter Wert (aktuelles Jahr, sonst das jüngste Jahr mit Wert). Nur für
 * Voreinstellungen wie den Stundenlohn im Formular, nie für Warnungen.
 */
export function latestKnownLimitValue(id: string, year = new Date().getFullYear()): number | null {
  const current = limitValue(id, year);
  if (current !== null) return current;
  const candidates = limits
    .filter((limit) => limit.id === id && limit.value !== null && limit.validFrom <= String(year) + '-12-31')
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  return candidates[0]?.value ?? null;
}

/** Grenzwert, der für Warnungen benutzt werden darf: vorhanden und geprüft. */
export function usableLimitValue(id: string, year = new Date().getFullYear()): number | null {
  const limit = limitRecord(id, year);
  return limit && limit.verified && limit.value !== null ? limit.value : null;
}

export function statusFor(ratio: number): RiskStatus {
  if (Number.isNaN(ratio)) return 'Unknown';
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
      case 'workingStudent26Weeks':
        return true;
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

/**
 * Wie Einmalzahlungen je Grenze zählen. Wo das Recht eine Verteilung aufs Jahr kennt
 * (Minijob, Familienversicherung), rechnet Headroom bewusst vorsichtig: Die Zahlung
 * zählt voll im Monat, in dem sie ausgezahlt wird, und im Jahr. Das kann einen Monat
 * strenger aussehen lassen als die amtliche Beurteilung, aber nie großzügiger.
 */
export const oneTimePaymentRules: Record<string, { counts: boolean; rule: string; rule_en: string }> = {
  miniJobMonthly: {
    counts: true,
    rule: 'Zählt im Auszahlungsmonat voll mit. Amtlich gehören regelmäßig zu erwartende Einmalzahlungen zum Jahresverdienst; die Monatsanzeige ist dadurch vorsichtiger.',
    rule_en: 'Counts in full in the month it is paid. Officially, expected one-off payments belong to annual earnings; the monthly view is therefore more cautious.',
  },
  miniJobYearly: {
    counts: true,
    rule: 'Zählt im Jahresverdienst voll mit.',
    rule_en: 'Counts in full towards annual earnings.',
  },
  familyInsurance: {
    counts: true,
    rule: 'Zählt im Auszahlungsmonat voll mit (vorsichtig). Die Krankenkasse betrachtet das regelmäßige Gesamteinkommen und verteilt Einmalzahlungen gegebenenfalls aufs Jahr.',
    rule_en: 'Counts in full in the month it is paid (cautious). Health insurers look at regular total income and may spread one-off payments over the year.',
  },
  bafoegSideIncome: {
    counts: true,
    rule: 'Zählt mit. BAföG rechnet mit dem Einkommen im Bewilligungszeitraum.',
    rule_en: 'Counts. BAföG uses the income in the approval period.',
  },
  incomeTaxThreshold: {
    counts: true,
    rule: 'Zählt als Arbeitslohn im Jahr mit.',
    rule_en: 'Counts as annual wages.',
  },
  shortTermEmployment: { counts: false, rule: 'Zählt nicht: Die Grenze misst Arbeitstage.', rule_en: 'Does not count: the limit measures workdays.' },
  workingStudentHours: { counts: false, rule: 'Zählt nicht: Die Grenze misst Stunden.', rule_en: 'Does not count: the limit measures hours.' },
  workingStudent26Weeks: { counts: false, rule: 'Zählt nicht: Die Grenze misst Wochen.', rule_en: 'Does not count: the limit measures weeks.' },
};

/** Summe der Einmalzahlungen mit Datum-Präfix (Monat „2026-03“ oder Jahr „2026“). */
export function paymentTotal(
  payments: OneTimePayment[],
  jobs: Job[],
  prefix: string,
  employmentTypes?: Job['type'][],
): number {
  return payments.reduce((total, payment) => {
    if (!payment.date.startsWith(prefix)) return total;
    const job = jobs.find((entry) => entry.id === payment.jobId);
    if (!job || (employmentTypes && !employmentTypes.includes(job.type))) return total;
    return total + Math.max(0, Number.isFinite(payment.amount) ? payment.amount : 0);
  }, 0);
}

export function monthTotal(
  shifts: Shift[],
  jobs: Job[],
  month: string,
  employmentTypes?: Job['type'][],
  payments: OneTimePayment[] = [],
): number {
  const fromShifts = shifts.reduce((total, shift) => {
    if (!shift.date.startsWith(month)) return total;
    const job = jobForShift(shift, jobs);
    if (!job || (employmentTypes && !employmentTypes.includes(job.type))) return total;
    return total + earnings(shift, job);
  }, 0);
  return fromShifts + paymentTotal(payments, jobs, month, employmentTypes);
}

export function monthlySummary(
  total: number,
  cap: number | null = usableLimitValue('miniJobMonthly'),
  wage: number | null = usableLimitValue('minimumWage'),
) {
  if (cap === null || !Number.isFinite(cap)) {
    return { total, available: false as const, remaining: null, over: null, hours: null, ratio: null, status: 'Unknown' as RiskStatus };
  }
  const safeCap = Math.max(cap, 0);
  const ratio = safeCap === 0 ? (total > 0 ? Infinity : 0) : total / safeCap;
  return {
    total,
    available: true as const,
    remaining: Math.max(0, safeCap - total),
    over: Math.max(0, total - safeCap),
    hours: wage && wage > 0 ? Math.max(0, safeCap - total) / wage : null,
    ratio,
    status: statusFor(ratio),
  };
}

export function annualMiniProjection(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  nowMonth = 12,
  payments: OneTimePayment[] = [],
): number {
  return annualIncomeProjection(shifts, jobs, year, ['mini-job'], nowMonth, payments);
}

export function annualIncomeProjection(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  employmentTypes: Job['type'][],
  nowMonth = 12,
  payments: OneTimePayment[] = [],
): number {
  return annualProjectionBreakdown(shifts, jobs, year, employmentTypes, nowMonth, payments).projected;
}

/**
 * Jahresprognose: tatsächliche Schichten + geplante Schichten + Durchschnitt der
 * bisherigen Monate für Monate ohne Daten. Einmalzahlungen zählen mit ihrem Betrag,
 * fließen aber nicht in den Monatsdurchschnitt ein (ein Bonus wiederholt sich nicht jeden Monat).
 */
export function annualProjectionBreakdown(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  employmentTypes: Job['type'][],
  nowMonth = 12,
  payments: OneTimePayment[] = [],
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

  const yearPayments = payments.filter((payment) => payment.date.startsWith(String(year)));
  const paidSoFar = paymentTotal(
    yearPayments.filter((payment) => Number(payment.date.slice(5, 7)) <= currentMonth), jobs, String(year), employmentTypes,
  );
  const paidLater = paymentTotal(
    yearPayments.filter((payment) => Number(payment.date.slice(5, 7)) > currentMonth), jobs, String(year), employmentTypes,
  );
  const shiftActual = amount(actual);
  const actualTotal = shiftActual + paidSoFar;
  const plannedTotal = amount(future) + paidLater;
  const monthsWithActualIncome = new Set(actual.map((shift) => shift.date.slice(0, 7))).size;
  const averagePastMonth = monthsWithActualIncome ? shiftActual / monthsWithActualIncome : 0;
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
  payments: OneTimePayment[] = [],
): number {
  const counted = oneTimePaymentRules[limitId]?.counts === false ? [] : payments;
  if (limitId === 'miniJobMonthly') {
    return monthTotal(shifts, jobs, month, ['mini-job'], counted);
  }
  return monthTotal(shifts, jobs, month, undefined, counted);
}

export type MonthlyLimitCheck = {
  limitId: string;
  /** Bruttoverdienst, der für diese Grenze zählt. */
  total: number;
  /** Bruttowert, mit dem verglichen wird. */
  cap: number;
  /**
   * gross: Grenze ist selbst ein Bruttowert.
   * gross-orientation: Grenze ist ein Netto- oder Gesamteinkommensbegriff; der Vergleich
   * mit Brutto ist nur eine (vorsichtige) Orientierung und muss so beschriftet werden.
   */
  comparison: 'gross' | 'gross-orientation';
  /** Woher der Vergleichswert stammt. */
  capSource: 'limit' | 'miniJobCap' | 'grossEquivalent';
  ratio: number;
  status: RiskStatus;
};

function hasNonMiniIncome(shifts: Shift[], jobs: Job[], month: string, payments: OneTimePayment[] = []): boolean {
  return shifts.some((shift) => {
    if (!shift.date.startsWith(month)) return false;
    const job = jobForShift(shift, jobs);
    return Boolean(job && job.type !== 'mini-job' && shift.hours > 0);
  }) || paymentTotal(payments, jobs, month, ['short-term', 'working student', 'regular']) > 0;
}

/**
 * Zentrale Monatsprüfung für Grenzen mit Euro-Betrag. Liefert `null`, wenn der Wert
 * für das Jahr fehlt oder nicht geprüft ist – dann gibt es keine Warnung.
 *
 * - Minijob: Brutto aller Minijobs gegen die Verdienstgrenze.
 * - Familienversicherung: Brutto aller Jobs gegen 1/7 der Bezugsgröße bzw. die
 *   Minijob-Grenze, wenn im Monat ausschließlich Minijob-Verdienst vorliegt.
 *   Das Gesetz meint das Gesamteinkommen (nach Werbungskosten); Brutto liegt meist
 *   darüber, der Vergleich ist also vorsichtig und nur eine Orientierung.
 * - BAföG: Brutto aller Jobs gegen das rechnerische Brutto-Äquivalent des Freibetrags.
 */
export function monthlyLimitCheck(
  limit: Limit,
  shifts: Shift[],
  jobs: Job[],
  month: string,
  year = Number(month.slice(0, 4)),
  payments: OneTimePayment[] = [],
): MonthlyLimitCheck | null {
  if (!limit.verified || limit.value === null) return null;
  const counted = oneTimePaymentRules[limit.id]?.counts === false ? [] : payments;
  const build = (
    total: number,
    cap: number,
    comparison: MonthlyLimitCheck['comparison'],
    capSource: MonthlyLimitCheck['capSource'],
  ): MonthlyLimitCheck => {
    const ratio = cap > 0 ? total / cap : total > 0 ? Infinity : 0;
    return { limitId: limit.id, total, cap, comparison, capSource, ratio, status: statusFor(ratio) };
  };
  switch (limit.id) {
    case 'miniJobMonthly':
      return build(monthTotal(shifts, jobs, month, ['mini-job'], counted), limit.value, 'gross', 'limit');
    case 'familyInsurance': {
      const total = monthTotal(shifts, jobs, month, undefined, counted);
      if (!hasNonMiniIncome(shifts, jobs, month, counted)) {
        const miniCap = usableLimitValue('miniJobMonthly', year);
        if (miniCap === null) return null;
        return build(total, miniCap, 'gross-orientation', 'miniJobCap');
      }
      return build(total, limit.value, 'gross-orientation', 'limit');
    }
    case 'bafoegSideIncome': {
      if (!limit.grossEquivalent) return null;
      return build(monthTotal(shifts, jobs, month, undefined, counted), limit.grossEquivalent.value, 'gross-orientation', 'grossEquivalent');
    }
    default:
      return build(monthTotal(shifts, jobs, month, undefined, counted), limit.value, limit.basis === 'gross' || !limit.basis ? 'gross' : 'gross-orientation', 'limit');
  }
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
  cap: number | null = usableLimitValue('miniJobMonthly', Number(month.slice(0, 4))),
  payments: OneTimePayment[] = [],
) {
  if (cap === null) return null;
  const others = jobs.filter((job) => job.type === 'mini-job' && job.id !== excludeJobId);
  const used = monthTotal(shifts, others, month, ['mini-job'], payments);
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
  cap: number | null = usableLimitValue('miniJobMonthly', Number(month.slice(0, 4))),
  payments: OneTimePayment[] = [],
): boolean {
  if (cap === null) return false;
  const miniJobsWithIncome = jobs.filter((job) =>
    job.type === 'mini-job' && (
      shifts.some((shift) => shift.jobId === job.id && shift.date.startsWith(month)) ||
      payments.some((payment) => payment.jobId === job.id && payment.date.startsWith(month))
    ),
  ).length;
  return cap > 0 && miniJobsWithIncome >= 2 && monthTotal(shifts, jobs, month, ['mini-job'], payments) > cap;
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

export function shiftCheck(total: number, added: number, cap: number | null = usableLimitValue('miniJobMonthly')) {
  const projected = total + added;
  if (cap === null) {
    return { projected, available: false as const, over: 0, remaining: null, status: 'Unknown' as RiskStatus };
  }
  return {
    projected,
    available: true as const,
    over: Math.max(0, projected - cap),
    remaining: Math.max(0, cap - projected),
    status: statusFor(cap > 0 ? projected / cap : projected > 0 ? Infinity : 0),
  };
}

export function workingHoursCheck(
  hours: number,
  inLecturePeriod: boolean,
  limit: number | null = usableLimitValue('workingStudentHours'),
) {
  return {
    hours,
    limit: inLecturePeriod ? limit : null,
    over: inLecturePeriod && limit !== null && hours > limit,
  };
}

export function dateKey(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function mondayOf(date: string): string {
  const day = new Date(date + 'T12:00:00');
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return dateKey(day);
}

/**
 * Bezugspunkt für das Zeitjahr der 26-Wochen-Regel: voraussichtliches Ende der
 * Beschäftigung. Ohne Enddatum nimmt Headroom den spätesten Tag aus „heute“ und
 * den bereits eingetragenen (auch geplanten) Schichten.
 */
export function workingStudentReferenceDate(jobs: Job[], shifts: Shift[], today: string): string {
  const ends = jobs
    .filter((job) => job.type === 'working student' && job.endDate && job.endDate >= today)
    .map((job) => job.endDate as string);
  if (ends.length) return ends.sort()[ends.length - 1];
  const dates = shifts.map((shift) => shift.date).sort();
  const latestShift = dates[dates.length - 1];
  return latestShift && latestShift > today ? latestShift : today;
}

/**
 * 26-Wochen-Regel für Werkstudent:innen (Jahresbetrachtung). Zählt im Zeitjahr
 * (365 Tage rückwärts bis einschließlich `referenceDate`) alle Kalenderwochen
 * (Mo–So), in denen über alle Jobs mehr als `weeklyLimit` Stunden liegen.
 *
 * Grenzen der Berechnung (müssen am Ergebnis sichtbar sein): ob die Mehrarbeit
 * abends, nachts, am Wochenende oder in der vorlesungsfreien Zeit lag, und Jobs
 * bei anderen Arbeitgebern, die nicht in Headroom erfasst sind, prüft die App nicht.
 */
export function workingStudent26Weeks(
  shifts: Shift[],
  referenceDate: string,
  year = Number(referenceDate.slice(0, 4)),
) {
  const weekLimit = usableLimitValue('workingStudent26Weeks', year);
  const weeklyLimit = usableLimitValue('workingStudentHours', year);
  const end = new Date(referenceDate + 'T12:00:00');
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  const windowStart = dateKey(start);
  const windowEnd = referenceDate;
  if (weekLimit === null || weeklyLimit === null) {
    return { available: false as const, windowStart, windowEnd, weeksOver: 0, weekLimit: null, weeklyLimit: null, remaining: null, over: false, weeks: [] as string[] };
  }
  const perWeek = new Map<string, number>();
  for (const shift of shifts) {
    if (shift.date < windowStart || shift.date > windowEnd) continue;
    const week = mondayOf(shift.date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + Math.max(0, shift.hours));
  }
  const weeks = [...perWeek.entries()].filter(([, hours]) => hours > weeklyLimit).map(([week]) => week).sort();
  return {
    available: true as const,
    windowStart,
    windowEnd,
    weeksOver: weeks.length,
    weekLimit,
    weeklyLimit,
    remaining: Math.max(0, weekLimit - weeks.length),
    over: weeks.length > weekLimit,
    weeks,
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
  // Unvollständige oder vertauschte Zeiträume zählen nicht (die Eingabe meldet sie als Fehler).
  return (profile.semesterPeriods ?? []).some(
    ({ start, end }) => Boolean(start && end) && start <= end && date >= start && date <= end,
  );
}

export function shortDayStatus(days: number, limit: number | null = usableLimitValue('shortTermEmployment')) {
  if (limit === null) return { days, available: false as const, remaining: null, over: false };
  return { days, available: true as const, remaining: Math.max(0, limit - days), over: days > limit };
}

export function employeeMiniJobStatus(count: number) {
  return { count, over: count > 1, extra: Math.max(0, count - 1) };
}

export function miniJobCap2027(wage = limitValue('minimumWage', 2027) ?? 0): number {
  return Math.ceil((wage * miniJobCapFormula.minimumWageMultiplier) / miniJobCapFormula.divisor);
}

export function wageBelowMinimum(wage: number, min: number | null = usableLimitValue('minimumWage')): boolean {
  return min !== null && wage < min;
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
  overMonthlyLimit?: boolean;
}, dismissed: number[] = []): 0 | 1 | 2 | 3 | 4 | 5 {
  // Reihenfolge = Priorität. Weggeklickte Stufen werden übersprungen, damit der nächste passende Hinweis erscheint.
  // „Nur dieser Monat über der Minijob-Grenze“ (5) ist der schwächste Hinweis.
  const candidates: [0 | 1 | 2 | 3 | 4 | 5, boolean | undefined][] = [
    [4, facts.unclassified],
    [3, facts.overMiniJobPermanently],
    [2, facts.familyInsuranceEnds],
    [1, facts.regularSecondJob && facts.underTaxThreshold],
    [5, facts.overMonthlyLimit],
  ];
  return candidates.find(([level, applies]) => applies && !dismissed.includes(level))?.[0] ?? 0;
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
