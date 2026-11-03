// App-Seite des Schicht-Imports: Kandidaten in Schichten umwandeln, anwenden und Kalender abgleichen.
import {
  dedupeCandidates,
  matchJob,
  parseIcs,
  type DedupeResult,
  type Job,
  type Shift,
  type ShiftCandidate,
  type ShiftSource,
} from '@headroom/core';
import type { CalendarSource } from './storage';
import { backendUrl } from './account/config';

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

export function localDate(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function shiftDate(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

/** Zeitraum, der aus Kalendern übernommen wird: 30 Tage zurück bis 60 Tage voraus. */
export function importWindow() {
  return { from: shiftDate(-30), to: shiftDate(60) };
}

export type ShiftValues = {
  id?: string;
  date: string;
  hours: number;
  startTime?: string;
  endTime?: string;
  planned?: boolean;
  recurring?: 'weekly';
  source?: ShiftSource;
  externalId?: string;
  calendarId?: string;
};

/** Eine Schicht mit Zuschlag, Trinkgeld und Arbeitstag wie beim manuellen Eintragen. */
export function buildShift(job: Job, values: ShiftValues): Shift {
  return {
    id: values.id ?? newId(),
    jobId: job.id,
    date: values.date,
    hours: values.hours,
    startTime: values.startTime || undefined,
    endTime: values.endTime || undefined,
    planned: Boolean(values.planned),
    days: job.type === 'short-term' ? 1 : undefined,
    surchargeAmount: values.hours * job.wage * Math.max(0, job.surcharges ?? 0) / 100,
    tips: job.tipsEnabled ? job.tips ?? 0 : undefined,
    recurring: values.recurring,
    source: values.source,
    externalId: values.externalId,
    calendarId: values.calendarId,
  };
}

/** Wendet ein Dedup-Ergebnis an: neue Schichten anlegen, bestehende ergänzen. */
export function applyImport(
  shifts: Shift[],
  jobs: Job[],
  result: DedupeResult,
  options: { today?: string; calendarId?: string } = {},
): { shifts: Shift[]; added: number; updated: number } {
  const today = options.today ?? localDate();
  const updates = new Map(result.updates.map((update) => [update.existing, update]));
  const next = shifts.map((shift) => {
    const update = updates.get(shift);
    if (!update) return shift;
    const job = jobs.find((item) => item.id === shift.jobId);
    const merged = { ...shift, ...update.changes };
    if (job && update.changes.hours !== undefined) {
      merged.surchargeAmount = merged.hours * job.wage * Math.max(0, job.surcharges ?? 0) / 100;
    }
    if (update.changes.date) merged.planned = merged.date > today;
    return merged;
  });
  let added = 0;
  for (const candidate of result.fresh) {
    const job = jobs.find((item) => item.id === candidate.jobId);
    if (!job) continue;
    next.push(buildShift(job, {
      date: candidate.date,
      hours: candidate.hours,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      planned: candidate.date > today,
      source: candidate.source,
      externalId: candidate.externalId,
      calendarId: candidate.source === 'calendar' ? options.calendarId : undefined,
    }));
    added += 1;
  }
  return { shifts: next, added, updated: result.updates.length };
}

export function withJobs(candidates: ShiftCandidate[], jobs: Job[]): ShiftCandidate[] {
  return candidates.map((candidate) => ({ ...candidate, jobId: candidate.jobId ?? matchJob(candidate.title, jobs) }));
}

export type FeedError = 'host' | 'notFound' | 'offline' | 'tooLarge' | 'notCalendar' | 'unknown';

export class CalendarFeedError extends Error {
  constructor(public code: FeedError) {
    super(code);
  }
}

/** Ohne Backend-Adresse im Build bleibt der lokale Demo-Server zuständig. */
const calendarFeedEndpoint = () => (backendUrl ? backendUrl + '/v1/calendar/feed' : '/api/calendar-feed');

/**
 * Holt einen abonnierten Kalender über den Headroom-Server (Google/iCloud erlauben keinen Direktabruf im Browser).
 * Link und Inhalt laufen dabei durch den Server; vorher braucht es die Einwilligung der Person.
 */
export async function fetchCalendarFeed(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(calendarFeedEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new CalendarFeedError('offline');
  }
  if (response.ok) return response.text();
  let code: FeedError = 'unknown';
  try {
    const body = await response.json() as { error?: string };
    if (body.error === 'host' || body.error === 'notFound' || body.error === 'tooLarge' || body.error === 'notCalendar') code = body.error;
    else if (body.error === 'redirect') code = 'host';
    else if (body.error === 'timeout' || body.error === 'rate_limited') code = 'offline';
  } catch {
    // Keine JSON-Antwort: Der Dev-Proxy erreicht den lokalen Server nicht.
    code = 'offline';
  }
  if (response.status >= 500 && code === 'unknown') code = 'offline';
  throw new CalendarFeedError(code);
}

export function isCalendarLink(value: string): boolean {
  try {
    const url = new URL(value.trim().replace(/^webcals?:\/\//i, 'https://'));
    return url.protocol === 'https:' && (/^calendar\.google\.com$/i.test(url.hostname) || /(^|\.)icloud\.com$/i.test(url.hostname));
  } catch {
    return false;
  }
}

/** Typische Wörter für Arbeitstermine, die keinem Job eindeutig zugeordnet sind. */
const WORK_WORDS = /\b(schicht|dienst|arbeit|arbeiten|job|frühdienst|spätdienst|nachtdienst|shift|work)\b/i;

export type SyncOutcome = {
  shifts: Shift[];
  pending: ShiftCandidate[];
  added: number;
  updated: number;
};

/**
 * Automatischer Abgleich: Eindeutig zugeordnete, neue Termine werden direkt übernommen,
 * nach Arbeit klingende Termine ohne Job landen zur Prüfung. Alles andere (Arzttermin, Geburtstag) bleibt unberührt.
 */
export function syncFromIcs(
  text: string,
  calendar: CalendarSource,
  state: { shifts: Shift[]; jobs: Job[]; pendingImports: ShiftCandidate[] },
): SyncOutcome {
  const candidates = withJobs(parseIcs(text, importWindow()), state.jobs);
  const matched = candidates.filter((candidate) => candidate.jobId);
  const result = dedupeCandidates(state.shifts, matched);
  const applied = applyImport(state.shifts, state.jobs, result, { calendarId: calendar.id });
  const known = new Set(state.pendingImports.map((item) => item.externalId).filter(Boolean));
  const pending = candidates.filter((candidate) =>
    !candidate.jobId && WORK_WORDS.test(candidate.title ?? '') && candidate.externalId && !known.has(candidate.externalId) &&
    !state.shifts.some((shift) => shift.externalId === candidate.externalId));
  return { shifts: applied.shifts, pending: [...state.pendingImports, ...pending], added: applied.added, updated: applied.updated };
}

export const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function syncDue(calendar: CalendarSource, now = Date.now()): boolean {
  if (calendar.kind !== 'url' || !calendar.url) return false;
  if (!calendar.lastSync) return true;
  return now - new Date(calendar.lastSync).getTime() >= SYNC_INTERVAL_MS;
}
