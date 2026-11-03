import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type Db } from '../src/db';
import { migrateToLatest } from '../src/db/migrate';
import { startTestDatabase, type TestDatabase } from './helpers/db';

const GOOGLE = 'https://calendar.google.com/calendar/ical/geheim%40group.calendar.google.com/private-abc123/basic.ics';
const ICS = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Schicht Café\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';

let database: TestDatabase;
let db: Db;

beforeAll(async () => {
  database = await startTestDatabase();
  db = createDb(database.url);
  await migrateToLatest(db);
}, 60_000);

afterAll(async () => {
  await db?.destroy();
  await database?.stop();
});

type Upstream = (url: string) => Response;

/** App mit nachgebautem Kalender-Anbieter; zählt, welche Adressen wirklich abgefragt wurden. */
async function appWith(upstream: Upstream, env: Record<string, string> = {}) {
  const lines: string[] = [];
  const logStream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(String(chunk));
      done();
    },
  });
  const requested: string[] = [];
  const config = loadConfig({
    DATABASE_URL: database.url,
    ALLOWED_ORIGINS: 'app://headroom',
    PRELOGIN_SECRET: 'p'.repeat(40),
    LOG_LEVEL: 'info',
    ...env,
  });
  const app = await buildApp({
    config,
    db,
    logStream,
    calendarFetch: async (input) => {
      const url = String(input);
      requested.push(url);
      return upstream(url);
    },
  });
  const fetchFeed = (url: unknown) => app.inject({ method: 'POST', url: '/v1/calendar/feed', payload: { url } });
  return { app, fetchFeed, requested, logs: () => lines.join('') };
}

const ics = (body = ICS) => new Response(body, { status: 200, headers: { 'content-type': 'text/calendar' } });

describe('Kalender-Abruf', () => {
  let current: FastifyInstance | undefined;
  afterAll(async () => current?.close());

  it('liefert den Kalender einer erlaubten Adresse und schreibt weder Adresse noch Inhalt ins Log', async () => {
    const { app, fetchFeed, logs } = await appWith(() => ics());
    current = app;
    const response = await fetchFeed(GOOGLE);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/calendar');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toBe(ICS);
    expect(logs()).toContain('/v1/calendar/feed');
    expect(logs()).not.toContain('private-abc123');
    expect(logs()).not.toContain('Schicht');
    await app.close();
  });

  it('lehnt Adressen außerhalb von Google und iCloud ab, ohne sie abzurufen', async () => {
    const { app, fetchFeed, requested } = await appWith(() => ics());
    for (const url of ['https://example.org/kalender.ics', 'http://calendar.google.com/x.ics', 'https://user:pw@calendar.google.com/x.ics', 'https://169.254.169.254/latest', 42]) {
      const response = await fetchFeed(url);
      expect(response.statusCode).toBe(400);
    }
    expect(requested).toEqual([]);
    await app.close();
  });

  it('akzeptiert webcal-Adressen von iCloud', async () => {
    const { app, fetchFeed, requested } = await appWith(() => ics());
    const response = await fetchFeed('webcal://p42-caldav.icloud.com/published/2/abc');
    expect(response.statusCode).toBe(200);
    expect(requested).toEqual(['https://p42-caldav.icloud.com/published/2/abc']);
    await app.close();
  });

  it('folgt Weiterleitungen nur zu erlaubten Hosts', async () => {
    const internal = await appWith(() => new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }));
    const blocked = await internal.fetchFeed(GOOGLE);
    expect(blocked.statusCode).toBe(502);
    expect(blocked.json()).toEqual({ error: 'redirect' });
    expect(internal.requested).toHaveLength(1);
    await internal.app.close();

    let hop = 0;
    const allowed = await appWith(() => (hop++ === 0 ? new Response(null, { status: 301, headers: { location: 'https://p01-calendarws.icloud.com/ca/abc.ics' } }) : ics()));
    expect((await allowed.fetchFeed(GOOGLE)).statusCode).toBe(200);
    expect(allowed.requested[1]).toBe('https://p01-calendarws.icloud.com/ca/abc.ics');
    await allowed.app.close();
  });

  it('bricht Antworten über 2 MB ab', async () => {
    const big = 'BEGIN:VCALENDAR\r\n' + 'X'.repeat(3 * 1024 * 1024);
    const { app, fetchFeed } = await appWith(() => ics(big));
    const response = await fetchFeed(GOOGLE);
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: 'tooLarge' });
    await app.close();
  });

  it('lehnt Antworten ohne BEGIN:VCALENDAR ab', async () => {
    const { app, fetchFeed } = await appWith(() => ics('<html>Anmelden</html>'));
    const response = await fetchFeed(GOOGLE);
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'notCalendar' });
    await app.close();
  });

  it('meldet einen fehlenden Kalender und einen nicht erreichbaren Anbieter', async () => {
    const missing = await appWith(() => new Response('nope', { status: 404 }));
    expect((await missing.fetchFeed(GOOGLE)).json()).toEqual({ error: 'notFound' });
    await missing.app.close();

    const down = await appWith(() => {
      throw new TypeError('fetch failed: ' + GOOGLE);
    });
    const response = await down.fetchFeed(GOOGLE);
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'upstream' });
    // Für den Betrieb steht die Art des Fehlers im Log, nie die Adresse.
    expect(down.logs()).toContain('TypeError');
    expect(down.logs()).not.toContain('private-abc123');
    await down.app.close();

    const slow = await appWith(() => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });
    const timedOut = await slow.fetchFeed(GOOGLE);
    expect(timedOut.statusCode).toBe(504);
    expect(timedOut.json()).toEqual({ error: 'timeout' });
    await slow.app.close();
  });

  it('bremst viele Abrufe hintereinander', async () => {
    const { app, fetchFeed } = await appWith(() => ics(), { RATE_LIMIT_CALENDAR_PER_MINUTE: '2' });
    expect((await fetchFeed(GOOGLE)).statusCode).toBe(200);
    expect((await fetchFeed(GOOGLE)).statusCode).toBe(200);
    const limited = await fetchFeed(GOOGLE);
    expect(limited.statusCode).toBe(429);
    await app.close();
  });
});
