import { describe, expect, it } from 'vitest';
import {
  combinationChecks,
  detectedCombinations,
  possibleCombinations,
  shortTermApplies,
  shortTermProfessionalRisk,
  type Job,
  type Profile,
  type Shift,
} from './index';

const job = (id: string, type: Job['type'], wage = 1): Job => ({ id, title: id, type, wage, startDate: '2026-01-01' });
const profile = (overrides: Partial<Profile> = {}): Profile => ({
  status: 'Working student',
  age: 23,
  familyInsured: false,
  bafoeg: false,
  ...overrides,
});
const lecture = { semesterPeriods: [{ start: '2026-04-13', end: '2026-07-24' }] };
const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

describe('Jobkombis', () => {
  it('rechnet die Stunden von Werkstudent und Minijob für die 20-Stunden-Grenze zusammen', () => {
    const ws = job('ws', 'working student', 15);
    const mini = job('mini', 'mini-job', 15);
    const shifts: Shift[] = [
      { jobId: 'ws', date: '2026-05-04', hours: 15 },
      { jobId: 'mini', date: '2026-05-06', hours: 8 },
    ];
    const result = combinationChecks({ profile: profile(lecture), jobs: [ws, mini], shifts, month: '2026-05', today: '2026-05-06' });
    expect(ids(result.combos)).toEqual(['workingStudentMini']);
    const hours = result.checks.find((check) => check.id === 'workingStudentHours');
    expect(hours).toMatchObject({ used: 23, limit: 20, status: 'Over', inLecturePeriod: true });
    expect(hours?.perJob).toHaveLength(2);
    const miniCheck = result.checks.find((check) => check.id === 'miniJobMonthly');
    expect(miniCheck).toMatchObject({ used: 120, limit: 603, status: 'Safe' });
  });

  it('zeigt außerhalb der Vorlesungszeit keinen Status für die Stunden', () => {
    const result = combinationChecks({
      profile: profile(lecture),
      jobs: [job('ws', 'working student'), job('mini', 'mini-job')],
      shifts: [{ jobId: 'ws', date: '2026-08-04', hours: 30 }],
      month: '2026-08',
      today: '2026-08-04',
    });
    const hours = result.checks.find((check) => check.id === 'workingStudentHours');
    expect(hours?.inLecturePeriod).toBe(false);
    expect(hours?.status).toBeUndefined();
  });

  it('hält Minijob und kurzfristige Beschäftigung getrennt', () => {
    const shifts: Shift[] = [
      { jobId: 'mini', date: '2026-05-04', hours: 400 },
      { jobId: 'short', date: '2026-05-05', hours: 1500, days: 1 },
      { jobId: 'short', date: '2026-05-06', hours: 0, days: 1 },
    ];
    const result = combinationChecks({
      profile: profile({ status: 'Student' }),
      jobs: [job('mini', 'mini-job'), job('short', 'short-term')],
      shifts,
      month: '2026-05',
      today: '2026-05-06',
    });
    expect(ids(result.combos)).toEqual(['miniShort']);
    expect(result.checks.find((check) => check.id === 'miniJobMonthly')).toMatchObject({ used: 400, status: 'Safe' });
    expect(result.checks.find((check) => check.id === 'shortTermDays')).toMatchObject({ used: 2, limit: 70, status: 'Safe' });
    expect(result.shortTermRisk).toBeNull();
  });

  it('prüft beim Hauptjob, wie viele Minijobs nebenher laufen', () => {
    const result = combinationChecks({
      profile: profile({ status: 'Employee', hasMainJob: true }),
      jobs: [job('a', 'mini-job'), job('b', 'mini-job')],
      shifts: [],
      month: '2026-05',
      today: '2026-05-06',
    });
    expect(ids(result.combos)).toEqual(['miniMini', 'mainMini']);
    expect(result.checks.find((check) => check.id === 'miniJobsBesideMain')).toMatchObject({ used: 2, limit: 1, status: 'Over' });
  });

  it('erkennt keine Kombi bei nur einem Job', () => {
    expect(detectedCombinations(profile(), [job('ws', 'working student')], 2026)).toEqual([]);
    expect(combinationChecks({ profile: profile(), jobs: [job('ws', 'working student')], shifts: [], month: '2026-05', today: '2026-05-01' }).checks).toEqual([]);
  });

  it('ignoriert Jobs, die im Jahr nicht laufen', () => {
    const old: Job = { ...job('old', 'mini-job'), startDate: '2024-01-01', endDate: '2025-06-30' };
    expect(detectedCombinations(profile(), [job('ws', 'working student'), old], 2026)).toEqual([]);
  });
});

describe('Mögliche Kombis je Profil', () => {
  it('zeigt Schüler:innen unter 18 den Jugendarbeitsschutz und keine Hauptjob-Kombis', () => {
    const list = possibleCombinations(profile({ status: 'Pupil', age: 16 }), 2026);
    expect(list.map((entry) => entry.combo.id)).toEqual(['miniMini', 'miniShort']);
    expect(list[0].notes).toContain('youth');
  });

  it('zeigt Angestellten ohne Hauptjob keine Hauptjob-Kombis', () => {
    const ids = possibleCombinations(profile({ status: 'Employee', hasMainJob: false }), 2026).map((entry) => entry.combo.id);
    expect(ids).toEqual(['miniShort']);
  });

  it('zeigt Werkstudent:innen die Werkstudenten-Kombis', () => {
    const ids = possibleCombinations(profile(), 2026).map((entry) => entry.combo.id);
    expect(ids).toEqual(expect.arrayContaining(['workingStudentMini', 'workingStudentShort']));
  });

  it('nennt Familienversicherung und BAföG aus dem Profil', () => {
    const [entry] = possibleCombinations(profile({ status: 'Student', familyInsured: true, bafoeg: true, age: 21 }), 2026);
    expect(entry.notes).toEqual(['familyTotal', 'bafoeg']);
  });
});

describe('Kurzfristige Beschäftigung passt sich an', () => {
  it('gilt nur mit kurzfristigem Job', () => {
    expect(shortTermApplies(profile({ status: 'Student' }), [job('mini', 'mini-job')], 2026)).toBe(false);
    expect(shortTermApplies(profile({ status: 'Student' }), [job('short', 'short-term')], 2026)).toBe(true);
    expect(shortTermApplies(profile({ status: 'Employee' }), [job('short', 'short-term')], 2026)).toBe(true);
  });

  it('weist auf Berufsmäßigkeit hin', () => {
    const short = job('short', 'short-term');
    expect(shortTermProfessionalRisk(profile({ status: 'Employee', hasMainJob: false }), [short], [], '2026-05')).toBe('noMainJob');
    const shifts: Shift[] = [{ jobId: 'short', date: '2026-05-04', hours: 700, days: 1 }];
    expect(shortTermProfessionalRisk(profile({ status: 'Mini-jobber' }), [short], shifts, '2026-05')).toBe('highEarnings');
    expect(shortTermProfessionalRisk(profile({ status: 'Student' }), [short], shifts, '2026-05')).toBeNull();
    expect(shortTermProfessionalRisk(profile({ status: 'Employee', hasMainJob: false }), [], [], '2026-05')).toBeNull();
  });
});
