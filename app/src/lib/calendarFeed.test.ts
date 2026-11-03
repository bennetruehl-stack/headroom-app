import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBackup, createEmptyState } from './storage';
import { inputsToState, stateToInputs } from './db/migrateV1';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadWithBackend(url: string) {
  vi.stubEnv('VITE_BACKEND_URL', url);
  vi.resetModules();
  return import('./shiftImport');
}

const LINK = 'https://calendar.google.com/calendar/ical/x/private-abc/basic.ics';

describe('Kalender-Abruf über das Backend', () => {
  it('fragt das Backend an, wenn eine Adresse gesetzt ist', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchCalendarFeed } = await loadWithBackend('https://api.example.org/');
    expect(await fetchCalendarFeed(LINK)).toContain('BEGIN:VCALENDAR');
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe('https://api.example.org/v1/calendar/feed');
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(init.body)).toEqual({ url: LINK });
  });

  it('nutzt ohne Backend-Adresse wie bisher den lokalen Server', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('BEGIN:VCALENDAR', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchCalendarFeed } = await loadWithBackend('');
    await fetchCalendarFeed(LINK);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/calendar-feed');
  });

  it('übersetzt die Fehler des Backends in die Meldungen der App', async () => {
    const { fetchCalendarFeed } = await loadWithBackend('https://api.example.org');
    const answer = (status: number, error: string) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error }, { status })));
    const cases: [number, string, string][] = [
      [400, 'host', 'host'],
      [502, 'redirect', 'host'],
      [502, 'notFound', 'notFound'],
      [413, 'tooLarge', 'tooLarge'],
      [502, 'notCalendar', 'notCalendar'],
      [504, 'timeout', 'offline'],
      [429, 'rate_limited', 'offline'],
    ];
    for (const [status, error, code] of cases) {
      answer(status, error);
      await expect(fetchCalendarFeed(LINK)).rejects.toMatchObject({ code });
    }
  });
});

describe('Einwilligung zum Kalender-Abruf', () => {
  it('bleibt beim Speichern als Gerätezustand erhalten', () => {
    const state = { ...createEmptyState(), calendarConsent: '2026-11-03' };
    const inputs = stateToInputs(state);
    expect(inputs.find((input) => input.kind === 'deviceState')?.fields.calendarConsent).toBe('2026-11-03');
    expect(inputsToState(inputs).calendarConsent).toBe('2026-11-03');
  });
});

describe('Einwilligung bleibt auf dem Gerät', () => {
  it('geht nicht mit der Sicherungsdatei auf ein anderes Gerät', () => {
    const backup = createBackup({ ...createEmptyState(), calendarConsent: '2026-11-03' }, [], {});
    expect(backup.state).not.toHaveProperty('calendarConsent');
  });
});

describe('Automatischer Abgleich beim Start', () => {
  const calendar = { id: 'c', name: 'Arbeit', kind: 'url' as const, url: LINK };

  it('ruft ohne Einwilligung keinen Kalender-Link ab', async () => {
    const { calendarsToAutoSync } = await import('./shiftImport');
    expect(calendarsToAutoSync({ ...createEmptyState(), calendars: [calendar] })).toEqual([]);
  });

  it('ruft mit Einwilligung fällige Kalender ab', async () => {
    const { calendarsToAutoSync } = await import('./shiftImport');
    expect(calendarsToAutoSync({ ...createEmptyState(), calendars: [calendar], calendarConsent: '2026-11-03' })).toEqual([calendar]);
  });
});
