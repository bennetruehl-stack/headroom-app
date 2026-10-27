import { describe, expect, it } from 'vitest';
import {
  activeLimits,
  availableLimitYears,
  limitRecord,
  limitValue,
  monthlyLimitCheck,
  monthlySummary,
  shiftCheck,
  usableLimitValue,
  workingStudent26Weeks,
  workingStudentReferenceDate,
  type Job,
  type Limit,
  type Profile,
  type Shift,
} from './index';

const student: Profile = { status: 'Student', age: 21, familyInsured: true, bafoeg: true };
const mini: Job = { id: 'mini', title: 'Café', type: 'mini-job', wage: 10, startDate: '2026-01-01' };
const regular: Job = { id: 'reg', title: 'Büro', type: 'working student', wage: 10, startDate: '2026-01-01' };
const limit = (id: string, year = 2026) => limitRecord(id, year) as Limit;

describe('F-01 BAföG-Freibetrag', () => {
  it('nutzt den amtlich bekanntgemachten Freibetrag 2026, nicht die Minijob-Grenze', () => {
    const record = limit('bafoegSideIncome');
    expect(record.value).toBe(389);
    expect(record.basis).toBe('net-allowance');
    expect(record.verified).toBe(true);
    expect(record.sourceUrl).toContain('recht.bund.de/bgbl/1/2025/279');
    expect(record.asOf).toBe('2026-10-27');
  });

  it('leitet das Brutto-Äquivalent aus der Formel des § 23 Abs. 6 BAföG her', () => {
    const gross = limit('bafoegSideIncome').grossEquivalent?.value ?? 0;
    // (Brutto − 1.230/12) × (1 − 22,3 %) muss auf den Freibetrag aufrunden.
    expect(Math.ceil((gross - 1230 / 12) * (1 - 0.223))).toBe(389);
  });

  it('vergleicht Brutto mit dem Brutto-Äquivalent und kennzeichnet das als Orientierung', () => {
    const shifts: Shift[] = [{ jobId: 'mini', date: '2026-03-02', hours: 60 }];
    const check = monthlyLimitCheck(limit('bafoegSideIncome'), shifts, [mini], '2026-03');
    expect(check?.cap).toBe(603);
    expect(check?.total).toBe(600);
    expect(check?.comparison).toBe('gross-orientation');
    expect(check?.capSource).toBe('grossEquivalent');
  });

  it('gilt auch für Werkstudent:innen mit BAföG', () => {
    const ids = activeLimits({ ...student, status: 'Working student' }, 2026).map((item) => item.id);
    expect(ids).toContain('bafoegSideIncome');
  });
});

describe('F-02 Familienversicherung', () => {
  it('hat 565 EUR Gesamteinkommen 2026 mit Quelle § 10 SGB V', () => {
    const record = limit('familyInsurance');
    expect(record.value).toBe(565);
    expect(record.basis).toBe('total-income');
    expect(record.sourceUrl).toContain('sgb_5/__10');
  });

  it('nutzt die Minijob-Grenze nur bei reinem Minijob-Verdienst', () => {
    const onlyMini = monthlyLimitCheck(limit('familyInsurance'), [{ jobId: 'mini', date: '2026-03-02', hours: 58 }], [mini], '2026-03');
    expect(onlyMini?.cap).toBe(603);
    expect(onlyMini?.capSource).toBe('miniJobCap');
    const mixed = monthlyLimitCheck(
      limit('familyInsurance'),
      [{ jobId: 'mini', date: '2026-03-02', hours: 30 }, { jobId: 'reg', date: '2026-03-03', hours: 28 }],
      [mini, regular],
      '2026-03',
    );
    expect(mixed?.cap).toBe(565);
    expect(mixed?.total).toBe(580);
    expect(mixed?.status).toBe('Over');
    expect(mixed?.comparison).toBe('gross-orientation');
  });
});

describe('F-03 fehlende Jahre', () => {
  it('liefert null statt 0, wenn ein Wert fehlt', () => {
    expect(limitValue('familyInsurance', 2027)).toBeNull();
    expect(limitValue('bafoegSideIncome', 2027)).toBeNull();
    expect(limitValue('miniJobMonthly', 2030)).toBeNull();
    expect(usableLimitValue('miniJobMonthly', 2030)).toBeNull();
  });

  it('erzeugt ohne Grenzwert keine Warnung und keinen Restbetrag', () => {
    const summary = monthlySummary(900, usableLimitValue('miniJobMonthly', 2030));
    expect(summary.available).toBe(false);
    expect(summary.status).toBe('Unknown');
    expect(summary.remaining).toBeNull();
    const check = shiftCheck(500, 200, null);
    expect(check.available).toBe(false);
    expect(check.over).toBe(0);
    expect(monthlyLimitCheck(limit('familyInsurance', 2027), [{ jobId: 'mini', date: '2027-01-05', hours: 100 }], [mini], '2027-01')).toBeNull();
  });

  it('leitet die Jahresauswahl aus den Daten ab', () => {
    expect(availableLimitYears()).toEqual([2026, 2027]);
  });
});

describe('F-04 Werkstudent: 26-Wochen-Regel', () => {
  const weeks = (count: number, hours: number, startMonday = '2026-01-05'): Shift[] =>
    Array.from({ length: count }, (_, index) => {
      const date = new Date(startMonday + 'T12:00:00');
      date.setDate(date.getDate() + index * 7);
      return { jobId: 'reg', date: date.toISOString().slice(0, 10), hours };
    });

  it('zählt Wochen über 20 Stunden im Zeitjahr', () => {
    const result = workingStudent26Weeks(weeks(26, 21), '2026-12-31');
    expect(result.available).toBe(true);
    expect(result.weeksOver).toBe(26);
    expect(result.over).toBe(false);
    const more = workingStudent26Weeks(weeks(27, 21), '2026-12-31');
    expect(more.weeksOver).toBe(27);
    expect(more.over).toBe(true);
  });

  it('zählt genau 20 Stunden nicht als Überschreitung', () => {
    expect(workingStudent26Weeks(weeks(30, 20), '2026-12-31').weeksOver).toBe(0);
  });

  it('rechnet das Zeitjahr rückwärts und lässt ältere Wochen weg', () => {
    const result = workingStudent26Weeks(weeks(10, 25, '2025-01-06'), '2026-12-31');
    expect(result.windowStart).toBe('2026-01-01');
    expect(result.weeksOver).toBe(0);
  });

  it('summiert Stunden aus mehreren Jobs in derselben Woche', () => {
    const shifts: Shift[] = [
      { jobId: 'reg', date: '2026-03-02', hours: 12 },
      { jobId: 'mini', date: '2026-03-04', hours: 10 },
    ];
    expect(workingStudent26Weeks(shifts, '2026-12-31').weeksOver).toBe(1);
  });

  it('nimmt das Vertragsende als Bezugspunkt, sonst die späteste Schicht', () => {
    expect(workingStudentReferenceDate([{ ...regular, endDate: '2027-03-31' }], [], '2026-10-27')).toBe('2027-03-31');
    expect(workingStudentReferenceDate([regular], [{ jobId: 'reg', date: '2026-12-01', hours: 4 }], '2026-10-27')).toBe('2026-12-01');
  });
});
