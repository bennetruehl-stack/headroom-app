// Schichten aus Kalendern (.ics) und erkannten Dienstplan-Texten (OCR) lesen,
// Jobs zuordnen und Dubletten gegen bereits erfasste Schichten erkennen.
// Alles hier ist rein und ohne Netzwerk- oder Browserzugriff testbar.
import type { Job, Shift } from './types';

export type ShiftCandidate = {
  date: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  /** Termin- oder Zeilentext; dient der Jobzuordnung. */
  title?: string;
  source: 'calendar' | 'photo';
  externalId?: string;
  jobId?: string;
};

const MAX_SHIFT_HOURS = 16;
const DAY_MS = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Dauer zwischen zwei Uhrzeiten (HH:MM) in Stunden; über Mitternacht wird ein Tag addiert. */
export function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

// ---------------------------------------------------------------------------
// Zeitzonen
// ---------------------------------------------------------------------------

type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function validTimeZone(timeZone: string | undefined): timeZone is string {
  if (!timeZone) return false;
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

function wallInZone(instant: number, timeZone: string): Wall {
  const parts = Object.fromEntries(
    formatterFor(timeZone).formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function wallToUtcMs(wall: Wall): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
}

/** Wandzeit in einer Zeitzone → UTC-Zeitpunkt. */
function zonedToInstant(wall: Wall, timeZone: string): number {
  const guess = wallToUtcMs(wall);
  const offset = wallToUtcMs(wallInZone(guess, timeZone)) - guess;
  let instant = guess - offset;
  const corrected = wallToUtcMs(wallInZone(instant, timeZone)) - instant;
  if (corrected !== offset) instant = guess - corrected;
  return instant;
}

function addDays(wall: Wall, days: number): Wall {
  const date = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days));
  return { ...wall, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function wallDate(wall: Wall): string {
  return wall.year + '-' + pad(wall.month) + '-' + pad(wall.day);
}

/** 0 = Montag … 6 = Sonntag */
function weekdayIndex(wall: Wall): number {
  return (new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay() + 6) % 7;
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
  } catch {
    return 'Europe/Berlin';
  }
}

// ---------------------------------------------------------------------------
// iCalendar (.ics)
// ---------------------------------------------------------------------------

type IcsProperty = { name: string; params: Record<string, string>; value: string };

type IcsTime = { instant: number; allDay: boolean; zone: string };

type IcsEvent = {
  uid: string;
  summary: string;
  start?: IcsTime;
  end?: IcsTime;
  duration?: number;
  rrule?: Record<string, string>;
  exdates: IcsTime[];
  recurrenceId?: IcsTime;
  cancelled: boolean;
};

function unfold(text: string): string[] {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/).filter(Boolean);
}

function parseProperty(line: string): IcsProperty | null {
  let inQuotes = false;
  let colon = -1;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') inQuotes = !inQuotes;
    if (char === ':' && !inQuotes) {
      colon = index;
      break;
    }
  }
  if (colon < 0) return null;
  const [rawName, ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const param of rawParams) {
    const [key, ...rest] = param.split('=');
    params[key.toUpperCase()] = rest.join('=').replace(/^"|"$/g, '');
  }
  return { name: rawName.toUpperCase(), params, value: line.slice(colon + 1) };
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

function parseIcsTime(value: string, params: Record<string, string>, targetZone: string): IcsTime | null {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!match) return null;
  const wall: Wall = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
  };
  if (!match[4] || params.VALUE === 'DATE') {
    return { instant: zonedToInstant(wall, targetZone), allDay: true, zone: targetZone };
  }
  if (match[7]) return { instant: wallToUtcMs(wall), allDay: false, zone: 'UTC' };
  const zone = validTimeZone(params.TZID) ? params.TZID : targetZone;
  return { instant: zonedToInstant(wall, zone), allDay: false, zone };
}

function parseDuration(value: string): number | undefined {
  const match = value.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return undefined;
  const [, sign, weeks, days, hours, minutes, seconds] = match;
  const total =
    (Number(weeks ?? 0) * 7 + Number(days ?? 0)) * DAY_MS +
    Number(hours ?? 0) * 3_600_000 +
    Number(minutes ?? 0) * 60_000 +
    Number(seconds ?? 0) * 1000;
  return sign === '-' ? -total : total;
}

function readEvents(text: string, targetZone: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: IcsEvent | null = null;
  let depth = 0;
  for (const line of unfold(text)) {
    const property = parseProperty(line);
    if (!property) continue;
    if (property.name === 'BEGIN') {
      if (property.value.toUpperCase() === 'VEVENT') {
        current = { uid: '', summary: '', exdates: [], cancelled: false };
        depth = 0;
      } else if (current) {
        depth += 1; // z. B. VALARM innerhalb eines Termins
      }
      continue;
    }
    if (property.name === 'END') {
      if (property.value.toUpperCase() === 'VEVENT' && current) {
        events.push(current);
        current = null;
      } else if (current) {
        depth -= 1;
      }
      continue;
    }
    if (!current || depth > 0) continue;
    switch (property.name) {
      case 'UID':
        current.uid = property.value.trim();
        break;
      case 'SUMMARY':
        current.summary = unescapeText(property.value);
        break;
      case 'DTSTART':
        current.start = parseIcsTime(property.value, property.params, targetZone) ?? undefined;
        break;
      case 'DTEND':
        current.end = parseIcsTime(property.value, property.params, targetZone) ?? undefined;
        break;
      case 'DURATION':
        current.duration = parseDuration(property.value.trim());
        break;
      case 'RRULE':
        current.rrule = Object.fromEntries(
          property.value.split(';').map((part) => {
            const [key, ...rest] = part.split('=');
            return [key.toUpperCase(), rest.join('=').toUpperCase()];
          }),
        );
        break;
      case 'EXDATE':
        for (const value of property.value.split(',')) {
          const parsed = parseIcsTime(value, property.params, targetZone);
          if (parsed) current.exdates.push(parsed);
        }
        break;
      case 'RECURRENCE-ID':
        current.recurrenceId = parseIcsTime(property.value, property.params, targetZone) ?? undefined;
        break;
      case 'STATUS':
        current.cancelled = property.value.trim().toUpperCase() === 'CANCELLED';
        break;
    }
  }
  return events;
}

const BYDAY: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };
const MAX_ITERATIONS = 50_000;

/** Startzeitpunkte einer Serie zwischen `from` und `limit` (inklusive). Unterstützt DAILY und WEEKLY. */
function occurrences(
  start: IcsTime,
  rule: Record<string, string> | undefined,
  from: number,
  limit: number,
  targetZone: string,
): number[] {
  if (!rule || (rule.FREQ !== 'DAILY' && rule.FREQ !== 'WEEKLY')) return [start.instant];
  const zone = start.zone === 'UTC' ? targetZone : start.zone;
  const base = wallInZone(start.instant, zone);
  const interval = Math.max(1, Number(rule.INTERVAL ?? 1) || 1);
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const untilTime = rule.UNTIL ? parseIcsTime(rule.UNTIL, {}, zone) : null;
  const until = untilTime ? (untilTime.allDay ? untilTime.instant + DAY_MS - 1 : untilTime.instant) : Infinity;
  const end = Math.min(limit, until);
  const result: number[] = [];
  let seen = 0;
  let iterations = 0;

  // false = Serie ist zu Ende
  const push = (wall: Wall): boolean => {
    iterations += 1;
    if (iterations > MAX_ITERATIONS) return false;
    const instant = zonedToInstant(wall, zone);
    if (instant < start.instant) return true;
    if (instant > end || seen >= count) return false;
    seen += 1;
    if (instant >= from) result.push(instant);
    return true;
  };

  if (rule.FREQ === 'DAILY') {
    for (let step = 0; ; step += interval) {
      if (!push(addDays(base, step))) break;
    }
    return result;
  }

  const days = (rule.BYDAY ? rule.BYDAY.split(',') : [])
    .map((day) => BYDAY[day.replace(/^[+-]?\d+/, '')])
    .filter((day) => day !== undefined)
    .sort((a, b) => a - b);
  const weekdays = days.length ? days : [weekdayIndex(base)];
  const monday = addDays(base, -weekdayIndex(base));
  for (let week = 0; ; week += interval) {
    let keepGoing = true;
    for (const day of weekdays) {
      if (!push(addDays(monday, week * 7 + day))) {
        keepGoing = false;
        break;
      }
    }
    if (!keepGoing) break;
  }
  return result;
}

export type IcsOptions = {
  /** Erstes Datum (YYYY-MM-DD), inklusive. */
  from: string;
  /** Letztes Datum (YYYY-MM-DD), inklusive. */
  to: string;
  /** Zeitzone für Datum und Uhrzeit der Ergebnisse. Standard: Gerätezeitzone. */
  timeZone?: string;
};

/** Liest zeitlich begrenzte Termine aus einer .ics-Datei. Ganztägige und abgesagte Termine werden übersprungen. */
export function parseIcs(text: string, options: IcsOptions): ShiftCandidate[] {
  const targetZone = validTimeZone(options.timeZone) ? options.timeZone : deviceTimeZone();
  const events = readEvents(text, targetZone);
  const toWall = (instant: number) => wallInZone(instant, targetZone);
  const [toYear, toMonth, toDay] = options.to.split('-').map(Number);
  const limit = zonedToInstant({ year: toYear, month: toMonth, day: toDay, hour: 23, minute: 59, second: 59 }, targetZone);
  const [fromYear, fromMonth, fromDay] = options.from.split('-').map(Number);
  // Einen Tag Puffer, damit Nachtschichten vom Vortag nicht verloren gehen; das Datum wird unten exakt gefiltert.
  const from = zonedToInstant({ year: fromYear, month: fromMonth, day: fromDay, hour: 0, minute: 0, second: 0 }, targetZone) - DAY_MS;

  const overrides = new Map<string, IcsEvent>();
  for (const event of events) {
    if (event.recurrenceId) overrides.set(event.uid + '|' + event.recurrenceId.instant, event);
  }

  const result: ShiftCandidate[] = [];
  const add = (event: IcsEvent, startInstant: number, externalId: string) => {
    if (event.cancelled || !event.start || event.start.allDay) return;
    const length = event.end && !event.end.allDay
      ? event.end.instant - event.start.instant
      : event.duration ?? 0;
    const hours = round(length / 3_600_000);
    if (hours <= 0 || hours > MAX_SHIFT_HOURS) return;
    const startWall = toWall(startInstant);
    const endWall = toWall(startInstant + length);
    const date = wallDate(startWall);
    if (date < options.from || date > options.to) return;
    result.push({
      date,
      startTime: pad(startWall.hour) + ':' + pad(startWall.minute),
      endTime: pad(endWall.hour) + ':' + pad(endWall.minute),
      hours,
      title: event.summary,
      source: 'calendar',
      externalId,
    });
  };

  for (const event of events) {
    if (!event.start || event.recurrenceId) continue;
    if (!event.rrule) {
      add(event, event.start.instant, event.uid || 'event-' + event.start.instant);
      continue;
    }
    const excluded = new Set(event.exdates.map((value) => (value.allDay ? 'd' + wallDate(toWall(value.instant)) : 't' + value.instant)));
    for (const instant of occurrences(event.start, event.rrule, from, limit, targetZone)) {
      if (excluded.has('t' + instant) || excluded.has('d' + wallDate(toWall(instant)))) continue;
      const key = event.uid + '|' + instant;
      const override = overrides.get(key);
      if (override) {
        if (override.start) add(override, override.start.instant, key);
      } else {
        add(event, instant, key);
      }
    }
  }

  // Ausnahmen, deren Serie fehlt oder außerhalb liegt, trotzdem übernehmen.
  for (const [key, override] of overrides) {
    if (!result.some((candidate) => candidate.externalId === key) && override.start) {
      const series = events.find((event) => event.uid === override.uid && !event.recurrenceId);
      if (!series) add(override, override.start.instant, key);
    }
  }

  return result.sort((a, b) => (a.date + (a.startTime ?? '')).localeCompare(b.date + (b.startTime ?? '')));
}

// ---------------------------------------------------------------------------
// Erkannter Dienstplan-Text (OCR)
// ---------------------------------------------------------------------------

const WEEKDAY_WORDS: [RegExp, number][] = [
  [/^(mo|mon|montag|monday)$/i, 0],
  [/^(di|tue|tues|dienstag|tuesday)$/i, 1],
  [/^(mi|wed|mittwoch|wednesday)$/i, 2],
  [/^(do|thu|thur|thurs|donnerstag|thursday)$/i, 3],
  [/^(fr|fri|freitag|friday)$/i, 4],
  [/^(sa|sat|samstag|sonnabend|saturday)$/i, 5],
  [/^(so|sun|sonntag|sunday)$/i, 6],
];

const TIME_RANGE = /(?<![\d.:])([01]?\d|2[0-4])(?:[:.]([0-5]\d))?\s*(?:uhr|h)?\s*(?:-|–|—|bis|to)\s*([01]?\d|2[0-4])(?:[:.]([0-5]\d))?\s*(?:uhr|h)?(?![\d])/i;
const DATE = /(?<!\d)([0-3]?\d)[./]([01]?\d)(?:[./](\d{4}|\d{2}))?\.?(?![\d:])/;
const HOURS = /(?<![\d.,])(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:h|std\.?|stunden|hours?)(?![a-z])/i;
const CALENDAR_WEEK = /\b(?:kw|week|woche)\s*(\d{1,2})\b/i;
const DAY_OFF = /\b(frei|urlaub|off|krank|day off)\b/i;

function isoWeekMonday(year: number, week: number): Wall {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS + (week - 1) * 7 * DAY_MS);
  return { year: monday.getUTCFullYear(), month: monday.getUTCMonth() + 1, day: monday.getUTCDate(), hour: 12, minute: 0, second: 0 };
}

function validDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export type ScheduleTextOptions = {
  /** Jahr für Datumsangaben ohne Jahreszahl. */
  year: number;
};

/** Wandelt erkannten Text eines Dienstplans in Schichtvorschläge um. Jede Zeile wird für sich gelesen. */
export function parseScheduleText(text: string, options: ScheduleTextOptions): ShiftCandidate[] {
  const result: ShiftCandidate[] = [];
  let weekStart: Wall | null = null;
  let pendingDate: string | null = null;
  let pendingTitle = '';

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.replace(/[|_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!line) continue;

    const week = line.match(CALENDAR_WEEK);
    if (week) {
      const number = Number(week[1]);
      if (number >= 1 && number <= 53) weekStart = isoWeekMonday(options.year, number);
      line = line.replace(week[0], ' ');
    }

    let startTime: string | undefined;
    let endTime: string | undefined;
    let hours: number | undefined;
    const range = line.match(TIME_RANGE);
    if (range) {
      const startHour = Number(range[1]);
      const endHour = Number(range[3]);
      const start = pad(startHour % 24) + ':' + (range[2] ?? '00');
      const end = pad(endHour % 24) + ':' + (range[4] ?? '00');
      const duration = hoursBetween(start, end);
      if (duration > 0 && duration <= MAX_SHIFT_HOURS) {
        startTime = start;
        endTime = end;
        hours = round(duration);
        line = line.replace(range[0], ' ');
      }
    }
    if (hours === undefined) {
      const amount = line.match(HOURS);
      if (amount) {
        const value = Number(amount[1].replace(',', '.'));
        if (value > 0 && value <= MAX_SHIFT_HOURS) {
          hours = value;
          line = line.replace(amount[0], ' ');
        }
      }
    }

    let date: string | undefined;
    const dateMatch = line.match(DATE);
    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const month = Number(dateMatch[2]);
      const year = dateMatch[3] ? Number(dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]) : options.year;
      if (validDate(year, month, day)) {
        date = year + '-' + pad(month) + '-' + pad(day);
        const wall: Wall = { year, month, day, hour: 12, minute: 0, second: 0 };
        weekStart = addDays(wall, -weekdayIndex(wall));
        line = line.replace(dateMatch[0], ' ');
      }
    }

    const words = line.split(/[\s,.:;]+/).filter(Boolean);
    // Kurze Wörter wie „so“ oder „do“ zählen nur am Zeilenanfang als Wochentag.
    const weekdayWord = words.slice(0, 2).findIndex((word) => WEEKDAY_WORDS.some(([pattern]) => pattern.test(word)));
    if (weekdayWord >= 0) {
      const day = WEEKDAY_WORDS.find(([pattern]) => pattern.test(words[weekdayWord]))![1];
      if (!date && weekStart) date = wallDate(addDays(weekStart, day));
      words.splice(weekdayWord, 1);
    }
    const title = words.join(' ').replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();

    if (DAY_OFF.test(rawLine) && hours === undefined) {
      pendingDate = null;
      continue;
    }

    if (hours === undefined) {
      // Datum ohne Zeit: In Tabellen steht die Zeit oft in der nächsten erkannten Zeile.
      if (date) {
        pendingDate = date;
        pendingTitle = title;
      }
      continue;
    }

    const shiftDate = date ?? pendingDate;
    if (!shiftDate) continue;
    const candidate: ShiftCandidate = {
      date: shiftDate,
      startTime,
      endTime,
      hours,
      title: [date ? '' : pendingTitle, title].filter(Boolean).join(' ').trim() || undefined,
      source: 'photo',
    };
    pendingDate = null;
    pendingTitle = '';
    const duplicate = result.some(
      (item) => item.date === candidate.date && item.startTime === candidate.startTime && item.hours === candidate.hours,
    );
    if (!duplicate) result.push(candidate);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Jobzuordnung
// ---------------------------------------------------------------------------

function normalize(value: string): string {
  return value.toLocaleLowerCase('de-DE').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Ordnet einen Termin- oder Zeilentext einem Job zu. Bei keinem oder mehrdeutigem Treffer: undefined. */
export function matchJob(title: string | undefined, jobs: Job[]): string | undefined {
  if (!title) return undefined;
  const text = normalize(title);
  if (!text) return undefined;
  let best: { id: string; score: number } | null = null;
  let tie = false;
  for (const job of jobs) {
    let score = 0;
    for (const keyword of job.calendarKeywords ?? []) {
      const value = normalize(keyword);
      if (value && text.includes(value)) score = Math.max(score, 3);
    }
    if (job.company && normalize(job.company).length >= 2 && text.includes(normalize(job.company))) score = Math.max(score, 2);
    if (text.includes(normalize(job.title))) score = Math.max(score, 2);
    if (!score) {
      const words = normalize(job.title).split(/[\s/,-]+/).filter((word) => word.length >= 4);
      if (words.some((word) => text.includes(word))) score = 1;
    }
    if (!score) continue;
    if (!best || score > best.score) {
      best = { id: job.id, score };
      tie = false;
    } else if (score === best.score) {
      tie = true;
    }
  }
  return best && !tie ? best.id : undefined;
}

// ---------------------------------------------------------------------------
// Dubletten
// ---------------------------------------------------------------------------

export type CandidateUpdate = { candidate: ShiftCandidate; existing: Shift; changes: Partial<Shift> };

export type DedupeResult = {
  fresh: ShiftCandidate[];
  updates: CandidateUpdate[];
  duplicates: { candidate: ShiftCandidate; existing?: Shift }[];
};

function minutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function interval(start: string, end: string): [number, number] {
  const from = minutes(start);
  let to = minutes(end);
  if (to <= from) to += 24 * 60;
  return [from, to];
}

type Comparable = Pick<Shift, 'jobId' | 'date' | 'hours' | 'startTime' | 'endTime'>;

/** Gleiche Schicht? Gleicher Job und Tag, und Zeiten überlappen zu mindestens 50 % (ohne Zeiten: Stunden ±0,25). */
export function sameShift(a: Comparable, b: Comparable): boolean {
  if (!a.jobId || a.jobId !== b.jobId || a.date !== b.date) return false;
  if (a.startTime && a.endTime && b.startTime && b.endTime) {
    const [aStart, aEnd] = interval(a.startTime, a.endTime);
    const [bStart, bEnd] = interval(b.startTime, b.endTime);
    const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
    const shorter = Math.min(aEnd - aStart, bEnd - bStart);
    return shorter > 0 && overlap / shorter >= 0.5;
  }
  return Math.abs(a.hours - b.hours) <= 0.25;
}

/**
 * Vergleicht Importvorschläge mit vorhandenen Schichten.
 * - gleiche Kalender-Kennung: geänderte Zeit wird zur Aktualisierung (außer nach manueller Bearbeitung)
 * - gleiche Schicht aus anderer Quelle (z. B. Foto und Kalender): bestehender Eintrag bleibt, fehlende Angaben werden ergänzt
 * - Doppelte Zeilen innerhalb desselben Imports werden zusammengefasst
 */
export function dedupeCandidates(existing: Shift[], candidates: ShiftCandidate[]): DedupeResult {
  const result: DedupeResult = { fresh: [], updates: [], duplicates: [] };
  const touched = new Set<Shift>();

  for (const candidate of candidates) {
    const byId = candidate.externalId ? existing.find((shift) => shift.externalId === candidate.externalId) : undefined;
    if (byId) {
      const changes: Partial<Shift> = {};
      if (!byId.editedManually) {
        if (byId.date !== candidate.date) changes.date = candidate.date;
        if (candidate.startTime && byId.startTime !== candidate.startTime) changes.startTime = candidate.startTime;
        if (candidate.endTime && byId.endTime !== candidate.endTime) changes.endTime = candidate.endTime;
        if (Math.abs(byId.hours - candidate.hours) > 0.001) changes.hours = candidate.hours;
      }
      if (Object.keys(changes).length && !touched.has(byId)) {
        touched.add(byId);
        result.updates.push({ candidate, existing: byId, changes });
      } else {
        result.duplicates.push({ candidate, existing: byId });
      }
      continue;
    }

    const comparable: Comparable = { ...candidate, jobId: candidate.jobId ?? '' };
    const match = existing.find((shift) => sameShift(comparable, shift));
    if (match) {
      const changes: Partial<Shift> = {};
      if (!match.startTime && !match.endTime && candidate.startTime && candidate.endTime) {
        changes.startTime = candidate.startTime;
        changes.endTime = candidate.endTime;
      }
      if (!match.externalId && candidate.externalId) changes.externalId = candidate.externalId;
      if (Object.keys(changes).length && !touched.has(match)) {
        touched.add(match);
        result.updates.push({ candidate, existing: match, changes });
      } else {
        result.duplicates.push({ candidate, existing: match });
      }
      continue;
    }

    const repeated = result.fresh.some(
      (item) => (candidate.externalId && item.externalId === candidate.externalId) || sameShift(comparable, { ...item, jobId: item.jobId ?? '' }),
    );
    if (repeated) {
      result.duplicates.push({ candidate });
      continue;
    }
    result.fresh.push(candidate);
  }

  return result;
}
