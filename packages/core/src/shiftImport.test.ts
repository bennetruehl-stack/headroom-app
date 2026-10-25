import { describe, expect, it } from 'vitest';
import { dedupeCandidates, matchJob, parseIcs, parseScheduleText, sameShift, type ShiftCandidate } from './shiftImport';
import type { Job, Shift } from './types';

const zone = 'Europe/Berlin';
const window = { from: '2026-10-01', to: '2026-12-31', timeZone: zone };

function calendar(...events: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//DE', ...events, 'END:VCALENDAR'].join('\r\n');
}

function event(lines: string[]): string {
  return ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');
}

const jobs: Job[] = [
  { id: 'cafe', title: 'Café-Service', type: 'mini-job', wage: 14, startDate: '2026-01-01', company: 'Bohne & Co', calendarKeywords: ['Schicht Bohne'] },
  { id: 'lager', title: 'Lager / Kommissionierung', type: 'mini-job', wage: 15, startDate: '2026-01-01' },
];

describe('parseIcs', () => {
  it('reads TZID times as local wall time and UTC times converted to the target zone', () => {
    const text = calendar(
      event(['UID:a', 'SUMMARY:Café', 'DTSTART;TZID=Europe/Berlin:20261020T090000', 'DTEND;TZID=Europe/Berlin:20261020T143000']),
      // 16:00Z am 3.11. ist 17:00 in Berlin (Winterzeit)
      event(['UID:b', 'SUMMARY:Lager', 'DTSTART:20261103T160000Z', 'DTEND:20261103T200000Z']),
    );
    expect(parseIcs(text, window)).toEqual([
      { date: '2026-10-20', startTime: '09:00', endTime: '14:30', hours: 5.5, title: 'Café', source: 'calendar', externalId: 'a' },
      { date: '2026-11-03', startTime: '17:00', endTime: '21:00', hours: 4, title: 'Lager', source: 'calendar', externalId: 'b' },
    ]);
  });

  it('skips all-day, cancelled, overly long and out-of-window events', () => {
    const text = calendar(
      event(['UID:allday', 'SUMMARY:Urlaub', 'DTSTART;VALUE=DATE:20261020', 'DTEND;VALUE=DATE:20261021']),
      event(['UID:cancel', 'SUMMARY:Café', 'STATUS:CANCELLED', 'DTSTART:20261021T080000Z', 'DTEND:20261021T120000Z']),
      event(['UID:long', 'SUMMARY:Messe', 'DTSTART:20261022T080000Z', 'DTEND:20261023T120000Z']),
      event(['UID:old', 'SUMMARY:Café', 'DTSTART:20260101T080000Z', 'DTEND:20260101T120000Z']),
    );
    expect(parseIcs(text, window)).toEqual([]);
  });

  it('unfolds long lines, unescapes text, supports DURATION and ignores alarms', () => {
    const text = calendar(
      event([
        'UID:folded',
        'SUMMARY:Schicht Bohne\\, Fr',
        ' ühdienst',
        'DTSTART;TZID=Europe/Berlin:20261024T070000',
        'DURATION:PT6H',
        'BEGIN:VALARM',
        'DTSTART:20200101T000000Z',
        'ACTION:DISPLAY',
        'END:VALARM',
      ]),
    );
    const [result] = parseIcs(text, window);
    expect(result.title).toBe('Schicht Bohne, Frühdienst');
    expect(result).toMatchObject({ date: '2026-10-24', startTime: '07:00', endTime: '13:00', hours: 6 });
  });

  it('expands weekly series with BYDAY, COUNT and EXDATE and keeps wall time across the DST change', () => {
    const text = calendar(
      event([
        'UID:series',
        'SUMMARY:Lager',
        'DTSTART;TZID=Europe/Berlin:20261020T180000',
        'DTEND;TZID=Europe/Berlin:20261020T220000',
        'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=6',
        'EXDATE;TZID=Europe/Berlin:20261022T180000',
      ]),
    );
    const result = parseIcs(text, window);
    expect(result.map((item) => item.date)).toEqual(['2026-10-20', '2026-10-27', '2026-10-29', '2026-11-03', '2026-11-05']);
    expect(new Set(result.map((item) => item.startTime))).toEqual(new Set(['18:00']));
    expect(new Set(result.map((item) => item.externalId)).size).toBe(5);
  });

  it('does not lose a long-running daily series before the import window', () => {
    const text = calendar(
      event(['UID:daily', 'SUMMARY:Lager', 'DTSTART;TZID=Europe/Berlin:20150101T080000', 'DTEND;TZID=Europe/Berlin:20150101T100000', 'RRULE:FREQ=DAILY;UNTIL=20261003T235959Z']),
    );
    expect(parseIcs(text, window).map((item) => item.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('replaces a moved occurrence via RECURRENCE-ID and keeps its identity', () => {
    const text = calendar(
      event([
        'UID:moved',
        'SUMMARY:Café',
        'DTSTART;TZID=Europe/Berlin:20261005T100000',
        'DTEND;TZID=Europe/Berlin:20261005T140000',
        'RRULE:FREQ=WEEKLY;UNTIL=20261019T235959Z',
      ]),
      event([
        'UID:moved',
        'RECURRENCE-ID;TZID=Europe/Berlin:20261012T100000',
        'SUMMARY:Café',
        'DTSTART;TZID=Europe/Berlin:20261013T120000',
        'DTEND;TZID=Europe/Berlin:20261013T160000',
      ]),
    );
    const result = parseIcs(text, window);
    expect(result.map((item) => item.date + ' ' + item.startTime)).toEqual(['2026-10-05 10:00', '2026-10-13 12:00', '2026-10-19 10:00']);
    const original = parseIcs(calendar(event(['UID:moved', 'SUMMARY:Café', 'DTSTART;TZID=Europe/Berlin:20261005T100000', 'DTEND;TZID=Europe/Berlin:20261005T140000', 'RRULE:FREQ=WEEKLY;UNTIL=20261019T235959Z'])), window);
    expect(result[1].externalId).toBe(original[1].externalId);
  });
});

describe('parseScheduleText', () => {
  it('reads a table-like duty roster line by line', () => {
    const text = [
      'Dienstplan KW 43 – Café Bohne',
      'Mo 19.10. 09:00 - 14:30 Service',
      'Di 20.10. frei',
      'Mi 21.10. 16:00–22:00',
      'Sa 24.10.2026 10-18 Uhr',
    ].join('\n');
    expect(parseScheduleText(text, { year: 2026 })).toEqual([
      { date: '2026-10-19', startTime: '09:00', endTime: '14:30', hours: 5.5, title: 'Service', source: 'photo' },
      { date: '2026-10-21', startTime: '16:00', endTime: '22:00', hours: 6, title: undefined, source: 'photo' },
      { date: '2026-10-24', startTime: '10:00', endTime: '18:00', hours: 8, title: undefined, source: 'photo' },
    ]);
  });

  it('uses weekday names relative to a calendar week and handles night shifts', () => {
    const text = ['KW 44', 'Freitag 22:00 - 06:00 Lager', 'Samstag 6 Std'].join('\n');
    expect(parseScheduleText(text, { year: 2026 })).toEqual([
      { date: '2026-10-30', startTime: '22:00', endTime: '06:00', hours: 8, title: 'Lager', source: 'photo' },
      { date: '2026-10-31', startTime: undefined, endTime: undefined, hours: 6, title: undefined, source: 'photo' },
    ]);
  });

  it('joins a date line with the time on the next recognized line', () => {
    const text = ['02.11.', '9.30-13.30', '03.11.', 'Urlaub', '04.11.', '4,5 h'].join('\n');
    expect(parseScheduleText(text, { year: 2026 }).map((item) => [item.date, item.startTime ?? '', item.hours])).toEqual([
      ['2026-11-02', '09:30', 4],
      ['2026-11-04', '', 4.5],
    ]);
  });

  it('does not read times as dates and ignores impossible dates', () => {
    expect(parseScheduleText('31.02. 9:00-12:00', { year: 2026 })).toEqual([]);
    expect(parseScheduleText('Do 05.11. 8:15-12:45', { year: 2026 })[0]).toMatchObject({ date: '2026-11-05', startTime: '08:15', endTime: '12:45', hours: 4.5 });
  });
});

describe('matchJob', () => {
  it('prefers keywords, then title or company, and refuses ties', () => {
    expect(matchJob('Schicht Bohne früh', jobs)).toBe('cafe');
    expect(matchJob('Bohne & Co Spätdienst', jobs)).toBe('cafe');
    expect(matchJob('Kommissionierung Halle 3', jobs)).toBe('lager');
    expect(matchJob('Zahnarzt', jobs)).toBeUndefined();
    expect(matchJob('Café-Service und Lager / Kommissionierung', jobs)).toBeUndefined();
    expect(matchJob(undefined, jobs)).toBeUndefined();
  });
});

describe('dedupeCandidates', () => {
  const candidate = (values: Partial<ShiftCandidate>): ShiftCandidate => ({
    date: '2026-10-20',
    startTime: '09:00',
    endTime: '14:00',
    hours: 5,
    source: 'calendar',
    jobId: 'cafe',
    ...values,
  });

  it('treats the same calendar event as a duplicate and a changed time as an update', () => {
    const existing: Shift[] = [{ id: '1', jobId: 'cafe', date: '2026-10-20', hours: 5, startTime: '09:00', endTime: '14:00', source: 'calendar', externalId: 'x' }];
    expect(dedupeCandidates(existing, [candidate({ externalId: 'x' })]).duplicates).toHaveLength(1);
    const moved = dedupeCandidates(existing, [candidate({ externalId: 'x', startTime: '10:00', endTime: '15:00' })]);
    expect(moved.updates[0].changes).toEqual({ startTime: '10:00', endTime: '15:00' });
  });

  it('never overwrites a manually edited imported shift', () => {
    const existing: Shift[] = [{ id: '1', jobId: 'cafe', date: '2026-10-20', hours: 4, source: 'calendar', externalId: 'x', editedManually: true }];
    const result = dedupeCandidates(existing, [candidate({ externalId: 'x' })]);
    expect(result.updates).toEqual([]);
    expect(result.duplicates).toHaveLength(1);
  });

  it('records a shift only once when it arrives by photo and by calendar', () => {
    const fromPhoto: Shift = { id: 'p', jobId: 'cafe', date: '2026-10-20', hours: 5, source: 'photo' };
    const result = dedupeCandidates([fromPhoto], [candidate({ externalId: 'cal-1' })]);
    expect(result.fresh).toEqual([]);
    expect(result.updates).toEqual([
      { candidate: expect.objectContaining({ externalId: 'cal-1' }), existing: fromPhoto, changes: { startTime: '09:00', endTime: '14:00', externalId: 'cal-1' } },
    ]);

    const fromCalendar: Shift = { id: 'c', jobId: 'cafe', date: '2026-10-20', hours: 5, startTime: '09:00', endTime: '14:00', source: 'calendar', externalId: 'cal-1' };
    const second = dedupeCandidates([fromCalendar], [candidate({ source: 'photo', externalId: undefined, startTime: '09:15', endTime: '14:00', hours: 4.75 })]);
    expect(second.fresh).toEqual([]);
    expect(second.duplicates).toHaveLength(1);
  });

  it('keeps separate shifts on the same day and merges repeats within one import', () => {
    const morning: Shift = { id: 'm', jobId: 'cafe', date: '2026-10-20', hours: 4, startTime: '08:00', endTime: '12:00' };
    const result = dedupeCandidates([morning], [
      candidate({ startTime: '16:00', endTime: '20:00', hours: 4 }),
      candidate({ startTime: '16:00', endTime: '20:00', hours: 4, source: 'photo' }),
      candidate({ jobId: 'lager', startTime: '08:00', endTime: '12:00', hours: 4 }),
    ]);
    expect(result.fresh.map((item) => item.jobId + ' ' + item.startTime)).toEqual(['cafe 16:00', 'lager 08:00']);
    expect(result.duplicates).toHaveLength(1);
  });

  it('compares shifts across midnight', () => {
    expect(sameShift(
      { jobId: 'a', date: '2026-10-30', hours: 8, startTime: '22:00', endTime: '06:00' },
      { jobId: 'a', date: '2026-10-30', hours: 7, startTime: '23:00', endTime: '06:00' },
    )).toBe(true);
  });
});
