import { describe, expect, it } from 'vitest';
import {
  activeLimits,
  annualMiniProjection,
  companyPlausibility,
  employeeMiniJobStatus,
  limits,
  miniJobCap2027,
  miniJobRoomBesideOthers,
  multipleMiniJobsOverCap,
  monthlySummary,
  peerMedian,
  peerWagePosition,
  recommendationLevel,
  shiftCheck,
  shortDayStatus,
  shortDays,
  workingHoursCheck,
} from './index';
import type { Job, Profile, Shift } from './types';

const jobs: Job[] = [
  { id: 'a', title: 'A', type: 'mini-job', wage: 13.9, startDate: '2026-01-01' },
  { id: 'b', title: 'B', type: 'mini-job', wage: 13.9, startDate: '2026-10-01' },
];

describe('core calculations', () => {
  it('calculates the demo headroom, hours, and close status', () => {
    const summary = monthlySummary(487, 603, 13.9);
    expect(summary.remaining).toBe(116);
    expect(Math.round(summary.hours)).toBe(8);
    expect(summary.status).toBe('Close');
    expect(Math.round(summary.ratio * 100)).toBe(81);
  });

  it('keeps Lena over the monthly cap but safe against the annual cap', () => {
    const shifts: Shift[] = [];
    for (let month = 1; month <= 12; month += 1) {
      shifts.push({
        jobId: 'a',
        date: '2026-' + String(month).padStart(2, '0') + '-02',
        hours: 340 / 13.9,
      });
    }
    for (let month = 10; month <= 12; month += 1) {
      shifts.push({
        jobId: 'b',
        date: '2026-' + String(month).padStart(2, '0') + '-03',
        hours: 280 / 13.9,
      });
    }

    expect(monthlySummary(620, 603, 13.9).status).toBe('Over');
    expect(annualMiniProjection(shifts, jobs, 2026, 12)).toBeCloseTo(4_920);
    expect(monthlySummary(4_920, 7_236).status).toBe('Safe');
  });

  it('warns Lena before the second mini-job: only 263 EUR fit beside the pub job', () => {
    const lenaJobs: Job[] = [
      { id: 'pub', title: 'Kneipe', type: 'mini-job', wage: 13.9, startDate: '2026-01-01' },
      { id: 'cafe', title: 'Café', type: 'mini-job', wage: 13.9, startDate: '2026-10-01' },
      { id: 'festival', title: 'Festival', type: 'short-term', wage: 13.9, startDate: '2026-07-01' },
    ];
    const lenaShifts: Shift[] = [
      { jobId: 'pub', date: '2026-09-05', hours: 340 / 13.9 },
      { jobId: 'pub', date: '2026-10-05', hours: 340 / 13.9 },
      { jobId: 'cafe', date: '2026-10-07', hours: 280 / 13.9 },
      { jobId: 'festival', date: '2026-07-10', hours: 120, days: 15 },
    ];

    // Vorab-Warnung: neben der Kneipe passen höchstens 263 EUR.
    expect(miniJobRoomBesideOthers(lenaShifts, lenaJobs, '2026-10', 'cafe', 603).room).toBe(263);
    // Zusammen 620 EUR: über der Grenze, obwohl das Jahr sicher ist.
    expect(multipleMiniJobsOverCap(lenaShifts, lenaJobs, '2026-10', 603)).toBe(true);
    // Ein Minijob allein ist kein „mehrere Minijobs“-Fall.
    expect(multipleMiniJobsOverCap(lenaShifts, lenaJobs, '2026-09', 603)).toBe(false);
    // Der kurzfristige Festival-Job zählt nicht zur Minijob-Summe.
    expect(miniJobRoomBesideOthers(lenaShifts, lenaJobs, '2026-07', undefined, 603).used).toBe(0);
  });

  it('counts 15 short-term workdays and flags the 71st day', () => {
    expect(shortDays([{ jobId: 'a', date: '2026-01-01', hours: 1, days: 15 }], 2026)).toBe(15);
    expect(shortDayStatus(71, 70).over).toBe(true);
  });

  it('reports a 28 EUR overage for the checked shift', () => {
    expect(shiftCheck(590, 41, 603).over).toBe(28);
  });

  it('filters conditional limits for BAföG, family insurance, and employees', () => {
    const student: Profile = {
      status: 'Student',
      age: 20,
      familyInsured: true,
      bafoeg: false,
    };
    expect(activeLimits(student, 2026).some((limit) => limit.id === 'bafoegSideIncome')).toBe(false);
    expect(
      activeLimits({ ...student, bafoeg: true }, 2026).some((limit) => limit.id === 'bafoegSideIncome'),
    ).toBe(true);
    expect(
      activeLimits({ ...student, age: 25, bafoeg: true }, 2026).some(
        (limit) => limit.id === 'familyInsurance',
      ),
    ).toBe(false);
    expect(
      activeLimits({ ...student, status: 'Employee' }, 2026).some(
        (limit) => limit.id === 'miniJobAlongsideMainJob',
      ),
    ).toBe(true);
    expect(employeeMiniJobStatus(2).over).toBe(true);
  });

  it('checks lecture-period hours only during lecture periods', () => {
    expect(workingHoursCheck(22, true, 20).over).toBe(true);
    expect(workingHoursCheck(30, false, 20).over).toBe(false);
  });

  it('derives the 2027 mini-job cap from the minimum wage', () => {
    expect(miniJobCap2027(14.6)).toBe(Math.ceil((14.6 * 130) / 3));
    expect(miniJobCap2027(14.6)).toBe(633);
  });

  it('returns a peer median only once the group has 20 rows', () => {
    expect(peerMedian(Array.from({ length: 19 }, () => ({ hourlyWage: 15 })))).toBeNull();
    expect(peerMedian(Array.from({ length: 20 }, () => ({ hourlyWage: 15 })))).toBe(15);
  });

  it('assigns peer wage bands around the median', () => {
    expect(peerWagePosition(13, 15)).toBe('below');
    expect(peerWagePosition(15, 15)).toBe('usual');
    expect(peerWagePosition(17, 15)).toBe('above');
  });

  it('triggers recommendation levels and has no level-zero partner card', () => {
    expect(recommendationLevel({})).toBe(0);
    expect(recommendationLevel({ regularSecondJob: true, underTaxThreshold: true })).toBe(1);
    expect(recommendationLevel({ familyInsuranceEnds: true })).toBe(2);
    expect(recommendationLevel({ overMiniJobPermanently: true })).toBe(3);
    expect(recommendationLevel({ unclassified: true })).toBe(4);
  });

  it('normalizes company names and suggests earlier entries without transmitting them', () => {
    expect(companyPlausibility('  Irish   Pub ').normalized).toBe('Irish Pub');
    expect(companyPlausibility('1234').ok).toBe(false);
    expect(companyPlausibility('asdf').ok).toBe(false);
    expect(companyPlausibility('Irish Pbu', ['Irish Pub']).suggestion).toBe('Irish Pub');
  });

  it('keeps internal review notes out of every user-facing limit text', () => {
    for (const limit of limits) {
      const shown = [limit.name, limit.name_en, limit.consequence, limit.consequence_en, limit.sourceName];
      for (const text of shown) expect(text ?? '').not.toMatch(/TODO/i);
    }
  });
});
