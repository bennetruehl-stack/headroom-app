// Rechenfall-Matrix: Grenzen exakt, 1 Cent darunter und darüber, mehrere Jobs,
// gemischte Jobs bei der Familienversicherung, Semesterferien, Einmalzahlungen, fehlendes Jahr.
import { describe, expect, it } from 'vitest';
import {
  annualProjectionBreakdown,
  isInLecturePeriod,
  limitRecord,
  monthlyIncomeForLimit,
  monthlyLimitCheck,
  monthlySummary,
  multipleMiniJobsOverCap,
  shiftCheck,
  workingHoursCheck,
  workingStudent26Weeks,
  type Job,
  type Limit,
  type OneTimePayment,
  type Profile,
  type Shift,
} from './index';

// Stundenlohn 1 €: Stunden = Euro, damit Cent-Beträge exakt abbildbar sind.
const job = (id: string, type: Job['type']): Job => ({ id, title: id, type, wage: 1, startDate: '2026-01-01' });
const miniA = job('miniA', 'mini-job');
const miniB = job('miniB', 'mini-job');
const regular = job('regular', 'regular');
const student = job('student', 'working student');
const shortTerm = job('short', 'short-term');
const jobs = [miniA, miniB, regular, student, shortTerm];
const at = (jobId: string, euros: number, date = '2026-05-04'): Shift => ({ jobId, date, hours: euros });
const record = (id: string, year = 2026) => limitRecord(id, year) as Limit;
const check = (id: string, shifts: Shift[], payments: OneTimePayment[] = [], year = 2026) =>
  monthlyLimitCheck(record(id, year), shifts, jobs, String(year) + '-05', year, payments);

describe('Grenzwerte an der Kante', () => {
  const cases: [string, number, number][] = [
    ['miniJobMonthly', 603, 603],
    ['familyInsurance', 565, 565],
    ['bafoegSideIncome', 603, 603],
  ];
  // Bei Familienversicherung mit regulärem Job (565), sonst greift die Minijob-Grenze.
  const shiftFor = (id: string, euros: number) => (id === 'familyInsurance' ? at('regular', euros) : at('miniA', euros));

  it.each(cases)('%s: genau an der Grenze ist noch erlaubt (Status Knapp)', (id, euros, cap) => {
    const result = check(id, [shiftFor(id, euros)]);
    expect(result?.cap).toBe(cap);
    expect(result?.total).toBeCloseTo(euros, 2);
    expect(result?.status).toBe('Close');
  });

  it.each(cases)('%s: 1 Cent darunter bleibt unter der Grenze', (id, euros) => {
    const result = check(id, [shiftFor(id, euros - 0.01)]);
    expect(result?.status).toBe('Close');
    expect((result?.cap ?? 0) - (result?.total ?? 0)).toBeCloseTo(0.01, 6);
  });

  it.each(cases)('%s: 1 Cent darüber ist über der Grenze', (id, euros) => {
    const result = check(id, [shiftFor(id, euros + 0.01)]);
    expect(result?.status).toBe('Over');
  });

  it('monthlySummary und shiftCheck behandeln die Kante gleich', () => {
    expect(monthlySummary(603, 603).over).toBe(0);
    expect(monthlySummary(603.01, 603).over).toBeCloseTo(0.01, 6);
    expect(shiftCheck(600, 3, 603).over).toBe(0);
    expect(shiftCheck(600, 3.01, 603).over).toBeCloseTo(0.01, 6);
  });
});

describe('Mehrere Jobs', () => {
  it('addiert mehrere Minijobs Monat für Monat', () => {
    const shifts = [at('miniA', 400), at('miniB', 203)];
    expect(check('miniJobMonthly', shifts)?.total).toBe(603);
    expect(multipleMiniJobsOverCap(shifts, jobs, '2026-05', 603)).toBe(false);
    expect(multipleMiniJobsOverCap([...shifts, at('miniB', 0.01, '2026-05-20')], jobs, '2026-05', 603)).toBe(true);
  });

  it('zählt reguläre und kurzfristige Jobs nicht zur Minijob-Grenze', () => {
    const shifts = [at('miniA', 500), at('regular', 900), at('short', 300)];
    expect(check('miniJobMonthly', shifts)?.total).toBe(500);
  });
});

describe('Familienversicherung mit gemischten Jobs', () => {
  it('nur Minijob: Minijob-Grenze 603', () => {
    const result = check('familyInsurance', [at('miniA', 590)]);
    expect(result?.cap).toBe(603);
    expect(result?.status).toBe('Close');
  });

  it('Minijob plus regulärer Job: 565 für die Summe', () => {
    const result = check('familyInsurance', [at('miniA', 400), at('regular', 170)]);
    expect(result?.cap).toBe(565);
    expect(result?.total).toBe(570);
    expect(result?.status).toBe('Over');
  });

  it('Minijob plus Werkstudentenjob: 565 für die Summe', () => {
    expect(check('familyInsurance', [at('miniA', 300), at('student', 200)])?.cap).toBe(565);
  });

  it('kennzeichnet den Vergleich immer als Brutto-Orientierung', () => {
    expect(check('familyInsurance', [at('regular', 100)])?.comparison).toBe('gross-orientation');
  });
});

describe('Semesterferien (Werkstudent)', () => {
  const profile: Profile = {
    status: 'Working student', age: 23, familyInsured: false, bafoeg: false,
    semesterPeriods: [{ start: '2026-04-13', end: '2026-07-17' }],
  };

  it('prüft 20 Stunden nur in der Vorlesungszeit', () => {
    expect(isInLecturePeriod('2026-05-04', profile)).toBe(true);
    expect(isInLecturePeriod('2026-08-10', profile)).toBe(false);
    expect(workingHoursCheck(25, true, 20).over).toBe(true);
    expect(workingHoursCheck(20, true, 20).over).toBe(false);
    expect(workingHoursCheck(35, false, 20)).toEqual({ hours: 35, limit: null, over: false });
  });

  it('ignoriert vertauschte Vorlesungszeiten statt falsch zu warnen', () => {
    const swapped: Profile = { ...profile, semesterPeriods: [{ start: '2026-07-17', end: '2026-04-13' }] };
    expect(isInLecturePeriod('2026-05-04', swapped)).toBe(false);
  });

  it('zählt Ferienwochen über 20 Stunden trotzdem zur 26-Wochen-Regel', () => {
    const summer = Array.from({ length: 6 }, (_, index) => at('student', 30, '2026-08-' + String(3 + index * 4).padStart(2, '0')));
    // 6 Termine à 30 Std. in 3 Kalenderwochen (Mo 03.08.: 03., 07. | 11., 15. | 19., 23.) → 3 Wochen über 20 Stunden.
    expect(workingStudent26Weeks(summer, '2026-12-31').weeksOver).toBe(3);
  });
});

describe('Einmalzahlungen', () => {
  const bonus = (jobId: string, amount: number, date = '2026-05-15'): OneTimePayment => ({ id: jobId + date, jobId, date, amount, kind: 'bonus' });

  it('zählen im Auszahlungsmonat bei Minijob, Familienversicherung und BAföG', () => {
    const shifts = [at('miniA', 500)];
    const payments = [bonus('miniA', 103.01)];
    expect(check('miniJobMonthly', shifts, payments)?.status).toBe('Over');
    expect(check('familyInsurance', shifts, payments)?.total).toBeCloseTo(603.01, 2);
    expect(check('bafoegSideIncome', shifts, payments)?.status).toBe('Over');
  });

  it('ein Bonus aus einem regulären Job macht den Monat zu "gemischt" (565)', () => {
    expect(check('familyInsurance', [at('miniA', 400)], [bonus('regular', 50)])?.cap).toBe(565);
  });

  it('zählen nicht für die Stunden-Grenzen', () => {
    expect(monthlyIncomeForLimit([], jobs, 'workingStudentHours', '2026-05', [bonus('student', 1000)])).toBe(0);
  });

  it('erhöhen die Jahresprognose, aber nicht den Monatsdurchschnitt', () => {
    const shifts = [at('miniA', 400, '2026-01-10'), at('miniA', 400, '2026-02-10')];
    const breakdown = annualProjectionBreakdown(shifts, jobs, 2026, ['mini-job'], 2, [bonus('miniA', 600, '2026-02-20')]);
    expect(breakdown.averagePastMonth).toBe(400);
    expect(breakdown.actual).toBe(1400);
    expect(breakdown.projected).toBe(1400 + 400 * 10);
  });

  it('zählen nur im eigenen Monat', () => {
    expect(check('miniJobMonthly', [at('miniA', 500)], [bonus('miniA', 500, '2026-06-01')])?.total).toBe(500);
  });
});

describe('Fehlendes Jahr', () => {
  it('liefert für 2027 bei Familienversicherung und BAföG kein Ergebnis', () => {
    expect(check('familyInsurance', [at('regular', 5000, '2027-05-04')], [], 2027)).toBeNull();
    expect(check('bafoegSideIncome', [at('miniA', 5000, '2027-05-04')], [], 2027)).toBeNull();
  });

  it('rechnet 2027 mit der abgeleiteten Minijob-Grenze 633', () => {
    expect(check('miniJobMonthly', [at('miniA', 633, '2027-05-04')], [], 2027)?.status).toBe('Close');
    expect(check('miniJobMonthly', [at('miniA', 633.01, '2027-05-04')], [], 2027)?.status).toBe('Over');
  });

  it('hat für 2030 keinen Datensatz und damit keine Warnung', () => {
    expect(limitRecord('miniJobMonthly', 2030)).toBeUndefined();
    expect(monthlySummary(10_000, null).status).toBe('Unknown');
  });
});
