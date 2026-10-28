// Geld und Rechtliches im Schüler-Modus. Reine Funktionen, Datum wird immer übergeben.
import { YOUTH_WAGE_REFERENCES, BASIC_INCOME_HOLIDAY_JOB_EXEMPT, BASIC_INCOME_PUPIL_ALLOWANCE, MINIMUM_WAGE_EXEMPT_UNDER_AGE, VOLUNTARY_TAX_RETURN_YEARS, incomeTaxBasicAllowance, miniJobMonthlyCap, statutoryMinimumWage } from './legalConstants';
import type { Job, OneTimePayment, Profile, Shift } from '../types';
import { ageOn, isSchoolHoliday } from './youthLabor/profile';

// ── Mindestlohn ──────────────────────────────────────────────────────────────

export type MinimumWageAssessment = {
  /** Gilt der Mindestlohn für diese Person? */
  applies: boolean;
  /** Grund, warum er nicht gilt. */
  exemptReason: 'under18WithoutTraining' | null;
  minimumWage: number | null;
  /** Abstand zum Mindestlohn (negativ = darunter). */
  differenceToMinimum: number | null;
  /** Üblicher Lohn für Jugendliche in diesem Job, falls mit Quelle hinterlegt. */
  youthReference: (typeof YOUTH_WAGE_REFERENCES)[number] | null;
  lawRef: string;
  url: string;
};

/**
 * § 22 Abs. 2 MiLoG: Unter 18 ohne abgeschlossene Berufsausbildung gilt der Mindestlohn nicht.
 * Dann gibt es keinen Fehler, sondern einen Vergleich (Mindestlohn als Orientierung, ggf. üblicher Lohn).
 */
export function minimumWageAssessment(profile: Profile, job: Pick<Job, 'wage' | 'presetId'>, date: string): MinimumWageAssessment {
  const minimumWage = statutoryMinimumWage(Number(date.slice(0, 4)));
  const exempt = ageOn(profile, date) < MINIMUM_WAGE_EXEMPT_UNDER_AGE.value && !profile.completedVocationalTraining;
  return {
    applies: !exempt,
    exemptReason: exempt ? 'under18WithoutTraining' : null,
    minimumWage,
    differenceToMinimum: minimumWage === null ? null : Math.round((job.wage - minimumWage) * 100) / 100,
    youthReference: YOUTH_WAGE_REFERENCES.find((entry) => entry.presetId === job.presetId && entry.hourlyWage !== null) ?? null,
    lawRef: MINIMUM_WAGE_EXEMPT_UNDER_AGE.lawRef,
    url: MINIMUM_WAGE_EXEMPT_UNDER_AGE.url,
  };
}

// ── Bürgergeld ───────────────────────────────────────────────────────────────

function shiftEarnings(shift: Shift, job: Job): number {
  return Math.max(0, shift.hours) * Math.max(0, job.wage) + Math.max(0, shift.surchargeAmount ?? 0);
}

export type BasicIncomeView = {
  applies: boolean;
  /** Ferienjob-Einkommen im Monat: bleibt ganz anrechnungsfrei (§ 11a Abs. 7 SGB II). */
  holidayIncome: number;
  /** Übriges Erwerbseinkommen im Monat. */
  otherIncome: number;
  /** Freibetrag auf das übrige Einkommen: Minijob-Grenze (§ 11b Abs. 2b SGB II). */
  allowance: number | null;
  /** Anteil über dem Freibetrag, den das Jobcenter anrechnen kann. */
  aboveAllowance: number;
  holidayLawRef: string;
  allowanceLawRef: string;
};

/**
 * Was bleibt anrechnungsfrei, wenn die Familie Bürgergeld bekommt? Gilt für Schüler:innen unter 25.
 * Rechnet nur die Freibeträge aus; über dem Freibetrag entscheidet das Jobcenter.
 */
export function basicIncomeView(
  profile: Profile,
  jobs: Job[],
  shifts: Shift[],
  payments: OneTimePayment[],
  month: string,
): BasicIncomeView {
  const date = month + '-15';
  const pupil = profile.status === 'Pupil' || profile.status === 'School leaver';
  const applies = Boolean(profile.familyReceivesBasicIncome) && pupil && ageOn(profile, date) < BASIC_INCOME_PUPIL_ALLOWANCE.value.maxAge;
  let holidayIncome = 0;
  let otherIncome = 0;
  for (const shift of shifts) {
    if (!shift.date.startsWith(month)) continue;
    const job = jobs.find((entry) => entry.id === shift.jobId);
    if (!job) continue;
    const amount = shiftEarnings(shift, job);
    if (profile.status === 'Pupil' && isSchoolHoliday(profile, shift.date) && ageOn(profile, shift.date) < BASIC_INCOME_HOLIDAY_JOB_EXEMPT.value.maxAge) holidayIncome += amount;
    else otherIncome += amount;
  }
  for (const payment of payments) {
    if (payment.date.startsWith(month) && jobs.some((job) => job.id === payment.jobId)) otherIncome += Math.max(0, payment.amount);
  }
  const allowance = miniJobMonthlyCap(Number(month.slice(0, 4)));
  return {
    applies,
    holidayIncome,
    otherIncome,
    allowance,
    aboveAllowance: allowance === null ? 0 : Math.max(0, otherIncome - allowance),
    holidayLawRef: BASIC_INCOME_HOLIDAY_JOB_EXEMPT.lawRef,
    allowanceLawRef: BASIC_INCOME_PUPIL_ALLOWANCE.lawRef,
  };
}

// ── Steuer ───────────────────────────────────────────────────────────────────

/**
 * „Das bekommst du wahrscheinlich zurück“: Lohnsteuer wurde abgezogen, das Jahresbrutto liegt
 * voraussichtlich unter dem Grundfreibetrag. Vorsichtig: Brutto liegt immer über dem zu
 * versteuernden Einkommen; liegt schon Brutto darunter, fällt keine Einkommensteuer an.
 * Minijobs zählen nur, wenn dort Lohnsteuer abgezogen wird (sonst meist pauschal versteuert).
 */
export function taxRefundHint(jobs: Job[], shifts: Shift[], payments: OneTimePayment[], year: number, today: string) {
  const taxed = jobs.filter((job) => job.incomeTaxWithheld);
  const basicAllowance = incomeTaxBasicAllowance(year);
  if (!taxed.length || basicAllowance === null) return null;
  const counted = new Set(jobs.filter((job) => job.type !== 'mini-job' || job.incomeTaxWithheld).map((job) => job.id));
  const prefix = String(year);
  const currentMonth = today.startsWith(prefix) ? Number(today.slice(5, 7)) : 12;
  const monthTotals = new Map<string, number>();
  let planned = 0;
  for (const shift of shifts) {
    if (!shift.date.startsWith(prefix) || !counted.has(shift.jobId)) continue;
    const job = jobs.find((entry) => entry.id === shift.jobId)!;
    const amount = shiftEarnings(shift, job);
    if (shift.planned || Number(shift.date.slice(5, 7)) > currentMonth) planned += amount;
    else monthTotals.set(shift.date.slice(0, 7), (monthTotals.get(shift.date.slice(0, 7)) ?? 0) + amount);
  }
  const actual = [...monthTotals.values()].reduce((sum, value) => sum + value, 0);
  const paid = payments.filter((payment) => payment.date.startsWith(prefix) && counted.has(payment.jobId)).reduce((sum, payment) => sum + Math.max(0, payment.amount), 0);
  // Monate ohne Daten mit dem Durchschnitt der bisherigen Monate hochrechnen (wie die Jahresprognose).
  const average = monthTotals.size ? actual / monthTotals.size : 0;
  const plannedMonths = new Set(shifts.filter((shift) => shift.date.startsWith(prefix) && counted.has(shift.jobId) && Number(shift.date.slice(5, 7)) > currentMonth).map((shift) => shift.date.slice(0, 7))).size;
  const projected = actual + planned + paid + average * Math.max(0, 12 - currentMonth - plannedMonths);
  return {
    likelyRefund: projected < basicAllowance,
    projected,
    basicAllowance,
    yearsBack: VOLUNTARY_TAX_RETURN_YEARS.value,
    lawRef: VOLUNTARY_TAX_RETURN_YEARS.lawRef,
  };
}
