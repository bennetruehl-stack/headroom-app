import { describe, expect, it } from 'vitest';
import {
  activeLimits,
  annualMiniProjection,
  monthlySummary,
  shortDays,
  shiftCheck,
} from './calc';
import type { Job, Profile, Shift } from './calc';

const jobs: Job[] = [
  { id: 'a', title: 'A', type: 'mini-job', wage: 13.9, startDate: '2026-01-01' },
  { id: 'b', title: 'B', type: 'mini-job', wage: 13.9, startDate: '2026-10-01' },
];

describe('app calculation surface', () => {
  it('shows 116 EUR of demo headroom and a close status', () => {
    const result = monthlySummary(487, 603, 13.9);
    expect(result.remaining).toBe(116);
    expect(Math.round(result.hours ?? Number.NaN)).toBe(8);
    expect(result.status).toBe('Close');
  });

  it('keeps a month overage separate from the safe annual projection', () => {
    const shifts: Shift[] = [];
    for (let month = 1; month <= 12; month += 1) {
      shifts.push({ jobId: 'a', date: '2026-' + String(month).padStart(2, '0') + '-01', hours: 340 / 13.9 });
    }
    for (let month = 10; month <= 12; month += 1) {
      shifts.push({ jobId: 'b', date: '2026-' + String(month).padStart(2, '0') + '-02', hours: 280 / 13.9 });
    }
    expect(monthlySummary(620, 603, 13.9).status).toBe('Over');
    expect(annualMiniProjection(shifts, jobs, 2026)).toBeCloseTo(4920);
  });

  it('counts short-term days and calculates a shift overage', () => {
    expect(shortDays([{ jobId: 'a', date: '2026-01-01', hours: 1, days: 15 }])).toBe(15);
    expect(shiftCheck(590, 41, 603).over).toBe(28);
  });

  it('filters conditional limits by profile', () => {
    const student: Profile = { status: 'Student', age: 20, familyInsured: true, bafoeg: false };
    expect(activeLimits(student, 2026).some((limit) => limit.id === 'bafoegSideIncome')).toBe(false);
    expect(activeLimits({ ...student, age: 25 }, 2026).some((limit) => limit.id === 'familyInsurance')).toBe(false);
  });
});
