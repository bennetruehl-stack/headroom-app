import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';
import { limitValue } from '@headroom/core';

type ListingInput = { title: string; city: string; date: string; hours: number; hourlyWage: number };
type PeerInput = {
  deviceToken: string;
  jobPresetId: string;
  city: string;
  hourlyWage: number;
  expectedWage: number;
  month: string;
};

function dateAfter(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const databasePath = process.env.HEADROOM_DB_PATH ?? join(process.cwd(), 'data', 'headroom.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    city TEXT NOT NULL,
    shift_date TEXT NOT NULL,
    hours REAL NOT NULL CHECK(hours > 0 AND hours <= 24),
    hourly_wage REAL NOT NULL CHECK(hourly_wage >= 0 AND hourly_wage <= 1000),
    created_at TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS peer_rows (
    id TEXT PRIMARY KEY,
    device_token TEXT NOT NULL,
    job_preset_id TEXT NOT NULL,
    city TEXT NOT NULL,
    hourly_wage REAL NOT NULL CHECK(hourly_wage >= 0 AND hourly_wage <= 1000),
    expected_wage REAL NOT NULL CHECK(expected_wage >= 0 AND expected_wage <= 1000),
    month TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS peer_group ON peer_rows(job_preset_id, city);
  CREATE INDEX IF NOT EXISTS peer_device ON peer_rows(device_token);
  CREATE UNIQUE INDEX IF NOT EXISTS peer_once_per_group ON peer_rows(device_token, job_preset_id, city, month);
`);

const listingColumns = database.prepare('PRAGMA table_info(listings)').all() as { name: string }[];
if (!listingColumns.some((column) => column.name === 'shift_date')) {
  database.exec("ALTER TABLE listings ADD COLUMN shift_date TEXT NOT NULL DEFAULT ''");
  const legacyListings = database.prepare('SELECT id FROM listings ORDER BY created_at, id').all() as { id: string }[];
  const updateLegacyDate = database.prepare('UPDATE listings SET shift_date = ? WHERE id = ?');
  legacyListings.forEach((listing, index) => updateLegacyDate.run(dateAfter((index % 14) + 1), listing.id));
}

const listingCount = (database.prepare('SELECT COUNT(*) AS count FROM listings').get() as { count: number }).count;
if (listingCount === 0) {
  const cities = ['Frankfurt', 'Berlin', 'Hamburg', 'München'];
  const titles = ['Eventaufbau', 'Café-Service', 'Lager / Kommissionierung', 'Einzelhandel'];
  const minimumWage = limitValue('minimumWage');
  const insert = database.prepare(`
    INSERT INTO listings (id, title, city, shift_date, hours, hourly_wage, created_at, demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const seed = database.transaction(() => {
    for (let index = 0; index < 40; index += 1) {
      insert.run(
        `demo-${index + 1}`,
        titles[index % titles.length],
        cities[index % cities.length],
        dateAfter((index % 14) + 1),
        [3, 4, 6, 8][index % 4],
        [minimumWage, minimumWage + 1.1, minimumWage + 2.1, minimumWage + 0.9][index % 4],
        new Date().toISOString(),
      );
    }
  });
  seed();
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8kb', strict: true }));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

function cleanText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

app.get('/health', (_request, response) => response.json({ ok: true, mode: 'local-demo' }));

app.get('/api/listings', (_request, response) => {
  const listings = database.prepare(`
    SELECT id, title, city, shift_date AS date, hours, hourly_wage AS hourlyWage, demo
    FROM listings ORDER BY created_at DESC LIMIT 100
  `).all();
  response.json({ demo: true, listings });
});

app.post('/api/listings', (request, response) => {
  if (!isPlainObject(request.body) || !hasExactKeys(request.body, ['title', 'city', 'date', 'hours', 'hourlyWage'])) {
    response.status(400).json({ error: 'Only title, city, date, hours and hourlyWage are accepted.' });
    return;
  }
  const input = request.body as ListingInput;
  if (
    !cleanText(input.title, 100) ||
    !cleanText(input.city, 80) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    typeof input.hours !== 'number' || !Number.isFinite(input.hours) || input.hours <= 0 || input.hours > 24 ||
    !validMoney(input.hourlyWage)
  ) {
    response.status(400).json({ error: 'Listing fields are invalid.' });
    return;
  }
  const listing = {
    id: randomUUID(),
    title: input.title.trim(),
    city: input.city.trim(),
    date: input.date,
    hours: input.hours,
    hourlyWage: input.hourlyWage,
    demo: true,
  };
  database.prepare(`
    INSERT INTO listings (id, title, city, shift_date, hours, hourly_wage, created_at, demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(listing.id, listing.title, listing.city, listing.date, listing.hours, listing.hourlyWage, new Date().toISOString());
  response.status(201).json(listing);
});

app.post('/api/peer-opt-in', (request, response) => {
  const keys = ['deviceToken', 'jobPresetId', 'city', 'hourlyWage', 'expectedWage', 'month'];
  if (!isPlainObject(request.body) || !hasExactKeys(request.body, keys)) {
    response.status(400).json({ error: 'Only the documented anonymous wage fields are accepted.' });
    return;
  }
  const input = request.body as PeerInput;
  if (
    !/^[0-9a-f-]{36}$/i.test(input.deviceToken) ||
    !/^preset-\d{1,3}$/.test(input.jobPresetId) ||
    !cleanText(input.city, 80) ||
    !validMoney(input.hourlyWage) ||
    !validMoney(input.expectedWage) ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)
  ) {
    response.status(400).json({ error: 'Anonymous wage fields are invalid.' });
    return;
  }
  database.prepare(`
    INSERT INTO peer_rows (id, device_token, job_preset_id, city, hourly_wage, expected_wage, month, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_token, job_preset_id, city, month) DO UPDATE SET
      hourly_wage = excluded.hourly_wage,
      expected_wage = excluded.expected_wage,
      created_at = excluded.created_at
  `).run(
    randomUUID(), input.deviceToken, input.jobPresetId, input.city.trim(),
    input.hourlyWage, input.expectedWage, input.month, new Date().toISOString(),
  );
  response.status(202).json({ accepted: true });
});

app.get('/api/peer-stats', (request, response) => {
  const jobPresetId = request.query.jobPresetId;
  const city = request.query.city;
  if (typeof jobPresetId !== 'string' || !/^preset-\d{1,3}$/.test(jobPresetId) || !cleanText(city, 80)) {
    response.status(400).json({ error: 'A job preset and city are required.' });
    return;
  }
  const rows = database.prepare(`
    SELECT hourly_wage AS hourlyWage, expected_wage AS expectedWage
    FROM peer_rows WHERE job_preset_id = ? AND city = ?
  `).all(jobPresetId, city.trim()) as { hourlyWage: number; expectedWage: number }[];
  if (rows.length < 20) {
    response.json({ enough: false, count: 0 });
    return;
  }
  response.json({
    enough: true,
    count: rows.length,
    median: median(rows.map((row) => row.hourlyWage)),
    medianExpectedWage: median(rows.map((row) => row.expectedWage)),
    medianGap: median(rows.map((row) => row.expectedWage - row.hourlyWage)),
  });
});

app.delete('/api/peer-opt-in/:deviceToken', (request, response) => {
  const token = request.params.deviceToken;
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    response.status(400).json({ error: 'Device token is invalid.' });
    return;
  }
  const result = database.prepare('DELETE FROM peer_rows WHERE device_token = ?').run(token);
  response.json({ deleted: true, count: result.changes });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: 'Invalid JSON.' });
    return;
  }
  response.status(500).json({ error: 'Internal server error.' });
});

const server = app.listen(8787, '127.0.0.1', () => {
  console.log('Headroom local demo server listening on http://127.0.0.1:8787');
});

function closeServer() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}
process.on('SIGINT', closeServer);
process.on('SIGTERM', closeServer);
