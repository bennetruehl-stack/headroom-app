import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig, type Config } from '../src/config';
import { createDb, type Db } from '../src/db';
import { migrateToLatest } from '../src/db/migrate';
import { startTestDatabase, type TestDatabase } from './helpers/db';

function configFor(databaseUrl: string, overrides: Record<string, string> = {}): Config {
  return loadConfig({
    DATABASE_URL: databaseUrl,
    ALLOWED_ORIGINS: 'app://headroom,https://headroom.example',
    PRELOGIN_SECRET: 'x'.repeat(32),
    LOG_LEVEL: 'info',
    ...overrides,
  });
}

/** Sammelt die Log-Zeilen, die die App schreibt. */
function logSink() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(...String(chunk).split('\n').filter(Boolean));
      done();
    },
  });
  return { stream, lines };
}

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

describe('Zustand und Bereitschaft', () => {
  it('meldet mit Datenbank 200 auf /health und /ready', async () => {
    const app = await buildApp({ config: configFor(database.url), db });
    expect((await app.inject('/health')).statusCode).toBe(200);
    const ready = await app.inject('/ready');
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: 'ready' });
    await app.close();
  });

  it('meldet 503 auf /ready, wenn die Datenbank nicht erreichbar ist', async () => {
    const unreachable = 'postgres://postgres@127.0.0.1:1/postgres?connect_timeout=1';
    const offline = createDb(unreachable);
    const app = await buildApp({ config: configFor(unreachable), db: offline });
    expect((await app.inject('/health')).statusCode).toBe(200);
    const ready = await app.inject('/ready');
    expect(ready.statusCode).toBe(503);
    expect(ready.json()).toEqual({ status: 'unavailable' });
    await app.close();
    await offline.destroy();
  });

  it('meldet 503, solange die Migrationen fehlen', async () => {
    const empty = await startTestDatabase();
    const fresh = createDb(empty.url);
    const app = await buildApp({ config: configFor(empty.url), db: fresh });
    expect((await app.inject('/ready')).statusCode).toBe(503);
    await app.close();
    await fresh.destroy();
    await empty.stop();
  }, 60_000);
});

describe('Schutzschichten', () => {
  it('setzt CORS-Header nur für erlaubte Ursprünge, auch für die Mac-App', async () => {
    const app = await buildApp({ config: configFor(database.url), db });
    const allowed = await app.inject({ url: '/health', headers: { origin: 'app://headroom' } });
    expect(allowed.headers['access-control-allow-origin']).toBe('app://headroom');
    const foreign = await app.inject({ url: '/health', headers: { origin: 'https://boese.example' } });
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });

  it('setzt Sicherheits-Header', async () => {
    const app = await buildApp({ config: configFor(database.url), db });
    const response = await app.inject('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    await app.close();
  });

  it('antwortet nach dem globalen Limit mit 429', async () => {
    const app = await buildApp({ config: configFor(database.url, { RATE_LIMIT_GLOBAL_PER_MINUTE: '5' }), db });
    const codes = [];
    for (let i = 0; i < 6; i += 1) codes.push((await app.inject('/health')).statusCode);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
    await app.close();
  });

  it('begrenzt /v1/auth/* enger als den Rest', async () => {
    const app = await buildApp({
      config: configFor(database.url, { RATE_LIMIT_GLOBAL_PER_MINUTE: '50', RATE_LIMIT_AUTH_PER_MINUTE: '2' }),
      db,
      routes: (instance) => instance.post('/v1/auth/probe', async () => ({ ok: true })),
    });
    const codes = [];
    for (let i = 0; i < 3; i += 1) codes.push((await app.inject({ method: 'POST', url: '/v1/auth/probe' })).statusCode);
    expect(codes).toEqual([200, 200, 429]);
    expect((await app.inject('/health')).statusCode).toBe(200);
    await app.close();
  });

  it('antwortet auf unbekannte Pfade mit einem knappen Fehlercode', async () => {
    const app = await buildApp({ config: configFor(database.url), db });
    const response = await app.inject('/gibt-es-nicht');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_found' });
    await app.close();
  });
});

describe('Logs', () => {
  it('schwärzt den Authorization-Header und schreibt keine IP-Adressen', async () => {
    const sink = logSink();
    const app = await buildApp({ config: configFor(database.url), db, logStream: sink.stream });
    await app.inject({
      url: '/health',
      remoteAddress: '203.0.113.7',
      headers: { authorization: 'Bearer geheimes-token', 'x-forwarded-for': '198.51.100.9', cookie: 'sitzung=geheim' },
    });
    await app.close();
    const log = sink.lines.join('\n');
    expect(log).toContain('[REDACTED]');
    for (const secret of ['geheimes-token', 'sitzung=geheim', '203.0.113.7', '198.51.100.9']) expect(log).not.toContain(secret);
  });
});
