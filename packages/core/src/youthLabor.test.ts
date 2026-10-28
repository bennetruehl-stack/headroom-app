import { describe, expect, it } from 'vitest';
import { checkYouthLabor, holidayJobDays, isStudentMode, schoolCollision, youthCheckRange, youthGroup, ageOn, type Job, type Profile, type Shift } from './index';

const pupil = (values: Partial<Profile> = {}): Profile => ({
  status: 'Pupil',
  age: 16,
  birthDate: '2010-03-15',
  familyInsured: true,
  bafoeg: false,
  isFullTimeSchoolObligated: false,
  ...values,
});

const job = (values: Partial<Job> = {}): Job => ({ id: 'j', title: 'Café', type: 'mini-job', wage: 10, startDate: '2026-01-01', tags: ['gastronomy'], ...values });

const shift = (date: string, startTime: string, endTime: string, values: Partial<Shift> = {}): Shift => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let hours = (eh * 60 + em - sh * 60 - sm) / 60;
  if (hours <= 0) hours += 24;
  return { id: date + startTime, jobId: 'j', date, hours, startTime, endTime, ...values };
};

const ids = (violations: { ruleId: string }[]) => violations.map((item) => item.ruleId);
const run = (profile: Profile, shifts: Shift[], jobs: Job[] = [job()], from = '2026-11-01', to = '2026-11-30') =>
  checkYouthLabor({ profile, jobs, shifts, from, to });

describe('Alter und Gruppen', () => {
  it('rechnet das Alter mit Geburtsdatum zum Stichtag', () => {
    expect(ageOn(pupil(), '2026-03-14')).toBe(15);
    expect(ageOn(pupil(), '2026-03-15')).toBe(16);
  });

  it('ordnet die Gruppen nach Alter, Schulpflicht und Ferien zu', () => {
    expect(youthGroup(pupil({ birthDate: '2014-01-01' }), '2026-11-02')).toBe('forbidden');
    expect(youthGroup(pupil({ birthDate: '2012-06-01' }), '2026-11-02')).toBe('child');
    expect(youthGroup(pupil(), '2026-11-02')).toBe('youth');
    const obligated = pupil({ isFullTimeSchoolObligated: true, schoolHolidays: [{ start: '2026-07-01', end: '2026-08-10' }] });
    expect(youthGroup(obligated, '2026-11-02')).toBe('child');
    expect(youthGroup(obligated, '2026-07-15')).toBe('holidayYouth');
    // 13–14 bleiben auch in den Ferien bei den Kinderregeln.
    expect(youthGroup({ ...obligated, birthDate: '2012-01-01' }, '2026-07-15')).toBe('child');
    expect(youthGroup(pupil({ birthDate: '2008-01-01' }), '2026-11-02')).toBe('none');
  });

  it('leitet den Schüler-Modus aus Alter und Status ab', () => {
    expect(isStudentMode(pupil({ status: 'Student' }), '2026-11-02')).toBe(true);
    expect(isStudentMode(pupil({ status: 'Student', birthDate: '2000-01-01' }), '2026-11-02')).toBe(false);
    expect(isStudentMode(pupil({ birthDate: '2000-01-01' }), '2026-11-02')).toBe(true);
  });
});

describe('Gruppe A: Kinderregeln', () => {
  const child = pupil({ birthDate: '2012-06-01', parentalConsent: { j: { job: true, hours: true, wage: true, commute: true } } });
  const light = job({ tags: ['lightWork'] });

  it('meldet unter 13 einen Fehler', () => {
    const result = run(pupil({ birthDate: '2014-01-01' }), [shift('2026-11-03', '15:00', '16:00')], [light]);
    expect(result[0]).toMatchObject({ ruleId: 'underMinimumAge', severity: 'error' });
  });

  it('erlaubt 2 Stunden zwischen 8 und 18 Uhr', () => {
    expect(run(child, [shift('2026-11-03', '15:00', '17:00')], [light]).filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('meldet mehr als 2 Stunden, Zeit nach 18 Uhr und fehlende Einwilligung', () => {
    const result = run({ ...child, parentalConsent: {} }, [shift('2026-11-03', '16:00', '19:00')], [light]);
    expect(ids(result)).toEqual(expect.arrayContaining(['childDailyHours', 'childTimeWindow', 'parentalConsentMissing']));
    expect(result.find((item) => item.ruleId === 'childDailyHours')).toMatchObject({ lawRef: '§ 5 Abs. 3 JArbSchG', shiftIds: ['2026-11-0316:00'] });
  });

  it('meldet Arbeit während und vor dem Unterricht', () => {
    const withSchool = { ...child, schoolSchedule: [{ weekday: 2 as const, start: '08:00', end: '13:00' }] };
    expect(ids(run(withSchool, [shift('2026-11-03', '12:00', '14:00')], [light]))).toContain('duringSchool');
    expect(ids(run(withSchool, [shift('2026-11-03', '06:00', '07:30')], [light]))).toContain('beforeSchool');
  });
});

describe('Gruppe B: Jugendliche', () => {
  it('meldet mehr als 8,5 Stunden am Tag und mehr als 40 in der Woche', () => {
    const long = run(pupil(), [shift('2026-11-02', '08:00', '17:30', { breaks: [{ start: '12:00', end: '13:00' }], hours: 8.6 })]);
    expect(ids(long)).toContain('dailyHours');
    const week = ['02', '03', '04', '05', '06'].map((day) => shift('2026-11-' + day, '08:00', '17:00', { hours: 8.5, breaks: [{ start: '12:00', end: '12:30' }] }));
    const result = run(pupil(), week);
    expect(ids(result)).toContain('weeklyHours');
  });

  it('erlaubt 8,5 Stunden an einem Tag, wenn die Woche kürzer ist', () => {
    const result = run(pupil(), [
      shift('2026-11-02', '08:00', '17:30', { hours: 8.5, breaks: [{ start: '12:00', end: '13:00' }] }),
      shift('2026-11-03', '08:00', '12:00'),
    ]);
    expect(ids(result)).not.toContain('dailyHours');
  });

  it('meldet einen sechsten Arbeitstag', () => {
    const days = ['02', '03', '04', '05', '06', '07'].map((day) => shift('2026-11-' + day, '10:00', '12:00'));
    expect(ids(run(pupil(), days, [job({ tags: ['retail'] })]))).toContain('workdaysPerWeek');
  });

  it('prüft die Nachtruhe mit Branchenausnahmen ab 16', () => {
    expect(ids(run(pupil(), [shift('2026-11-03', '17:00', '21:30')], [job({ tags: [] })]))).toContain('nightRest');
    const gastro = run(pupil(), [shift('2026-11-03', '17:00', '21:30')], [job({ tags: ['gastronomy'] })]);
    expect(ids(gastro)).not.toContain('nightRest');
    expect(ids(gastro)).toContain('nightException');
    // Mit 15 gilt die Gastro-Ausnahme noch nicht.
    expect(ids(run(pupil({ birthDate: '2011-01-01' }), [shift('2026-11-03', '17:00', '21:30')]))).toContain('nightRest');
    // Bäckerei ab 17 schon um 4 Uhr.
    const bakery = job({ tags: ['bakery'] });
    expect(ids(run(pupil({ birthDate: '2009-01-01' }), [shift('2026-11-03', '04:00', '08:00')], [bakery]))).not.toContain('nightRest');
    expect(ids(run(pupil(), [shift('2026-11-03', '04:00', '08:00')], [bakery]))).toContain('nightRest');
  });

  it('prüft Pausen nach § 11', () => {
    expect(ids(run(pupil(), [shift('2026-11-03', '08:00', '13:30')]))).toContain('breaksMissing');
    const short = run(pupil(), [shift('2026-11-03', '08:00', '15:00', { hours: 6.5, breaks: [{ start: '11:00', end: '11:30' }] })]);
    expect(ids(short)).toContain('breakTooShort');
    // Pausen unter 15 Minuten zählen nicht.
    const tiny = run(pupil(), [shift('2026-11-03', '08:00', '13:30', { hours: 5.4, breaks: [{ start: '10:00', end: '10:10' }] })]);
    expect(ids(tiny)).toContain('breaksMissing');
    const block = run(pupil(), [shift('2026-11-03', '08:00', '14:00', { hours: 5.5, breaks: [{ start: '13:00', end: '13:30' }] })]);
    expect(ids(block)).toContain('continuousWork');
    const ok = run(pupil(), [shift('2026-11-03', '08:00', '14:00', { hours: 5.5, breaks: [{ start: '11:00', end: '11:30' }] })]);
    expect(ok.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('verlangt 12 Stunden frei zwischen zwei Arbeitstagen', () => {
    const result = run(pupil(), [shift('2026-11-03', '16:00', '22:00', { hours: 5, breaks: [{ start: '19:00', end: '20:00' }] }), shift('2026-11-04', '07:00', '10:00')]);
    expect(result.find((item) => item.ruleId === 'restBetweenDays')?.shiftIds).toHaveLength(2);
  });

  it('meldet Samstag und Sonntag je nach Branche', () => {
    const retail = job({ tags: ['retail'] });
    const saturday = run(pupil(), [shift('2026-11-07', '10:00', '12:00')], [retail]);
    expect(saturday.find((item) => item.ruleId === 'saturdayException')?.severity).toBe('warning');
    const sunday = run(pupil(), [shift('2026-11-08', '10:00', '12:00')], [retail]);
    expect(sunday.find((item) => item.ruleId === 'sundayWork')?.severity).toBe('error');
    const office = run(pupil(), [shift('2026-11-07', '10:00', '12:00')], [job({ tags: ['lightWork'] })]);
    expect(ids(office)).toContain('saturdayWork');
  });

  it('verlangt mindestens 2 freie Sonntage im Monat', () => {
    // November 2026 hat 5 Sonntage: 4 gearbeitet = 1 frei (zu wenig), 3 gearbeitet = 2 frei (okay).
    const sundays = ['01', '08', '15', '22'].map((day) => shift('2026-11-' + day, '10:00', '12:00'));
    expect(ids(run(pupil(), sundays))).toContain('freeSundays');
    expect(ids(run(pupil(), sundays.slice(0, 3)))).not.toContain('freeSundays');
  });

  it('meldet nur Verstöße, die Schichten im Zeitraum betreffen', () => {
    const result = checkYouthLabor({ profile: pupil(), jobs: [job({ tags: [] })], shifts: [shift('2026-10-05', '17:00', '21:00')], from: '2026-11-01', to: '2026-11-30' });
    expect(result).toEqual([]);
  });

  it('meldet Akkordarbeit als Fehler (Tag aus der Vorlage)', () => {
    const result = run(pupil(), [shift('2026-11-03', '08:00', '10:00')], [job({ tags: ['pieceWork'] })]);
    expect(result[0]).toMatchObject({ ruleId: 'pieceWork', severity: 'error', lawRef: '§ 23 JArbSchG' });
  });
});

describe('Ferienjob und Stundenplan', () => {
  const obligated = pupil({ isFullTimeSchoolObligated: true, schoolHolidays: [{ start: '2026-07-01', end: '2026-08-15' }] });
  const weekdays = (start: string, count: number) => {
    const result: Shift[] = [];
    const date = new Date(start + 'T12:00:00Z');
    while (result.length < count) {
      const day = date.getUTCDay();
      if (day !== 0 && day !== 6) result.push(shift(date.toISOString().slice(0, 10), '09:00', '13:00'));
      date.setUTCDate(date.getUTCDate() + 1);
    }
    return result;
  };

  it('zählt Ferien-Arbeitstage gegen 20 Tage', () => {
    const usage = holidayJobDays(obligated, weekdays('2026-07-01', 21), [job()], 2026);
    expect(usage).toMatchObject({ applies: true, used: 21, limit: 20 });
    const result = checkYouthLabor({ profile: obligated, jobs: [job()], shifts: weekdays('2026-07-01', 21), from: '2026-07-01', to: '2026-07-31' });
    expect(ids(result)).toContain('holidayJobLimit');
  });

  it('gilt nicht ohne Vollzeitschulpflicht', () => {
    expect(holidayJobDays(pupil(), weekdays('2026-07-01', 5), [job()], 2026).applies).toBe(false);
  });

  it('erkennt Kollisionen mit dem Stundenplan, nicht in den Ferien', () => {
    const profile = { ...obligated, schoolSchedule: [{ weekday: 1 as const, start: '08:00', end: '13:15' }] };
    expect(schoolCollision(profile, { date: '2026-11-02', startTime: '13:00', endTime: '15:00' })).toBe('during');
    expect(schoolCollision(profile, { date: '2026-11-02', startTime: '13:15', endTime: '15:00' })).toBeNull();
    expect(schoolCollision(profile, { date: '2026-07-06', startTime: '09:00', endTime: '12:00' })).toBeNull();
    expect(schoolCollision(profile, { date: '2026-11-02' })).toBeNull();
  });

  it('prüft Monat plus angeschnittene Wochen', () => {
    expect(youthCheckRange('2026-11-18')).toEqual({ from: '2026-10-26', to: '2026-12-06' });
  });
});
