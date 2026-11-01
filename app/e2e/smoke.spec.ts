import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Student:in', exact: true })).toBeVisible();
});

async function finishOnboarding(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Student:in', exact: true }).click();
  await page.getByRole('button', { name: 'Headroom öffnen' }).click();
  await expect(page.getByText(/116/).first()).toBeVisible();
}

test('Onboarding zeigt den Demo-Spielraum von 116 Euro', async ({ page }) => {
  await finishOnboarding(page);
  await expect(page.getByText(/etwa 8 Stunden/)).toBeVisible();
  await expect(page.locator('.hero-metric').getByText('Knapp')).toBeVisible();
});

test('eine neue Schicht aktualisiert den verbleibenden Betrag', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: /Schicht eintragen/ }).click();
  await page.getByLabel('Arbeitsstunden').fill('1');
  await page.getByRole('button', { name: 'Schicht speichern' }).click();
  await expect(page.getByText(/102/).first()).toBeVisible();
});

test('Grenzwerte zeigen verlinkte Quellen und Standdatum', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: /Grenzwerte/ }).last().click();
  await expect(page.getByRole('link', { name: /Minijob-Zentrale/ }).first()).toBeVisible();
  await expect(page.getByText(/Stand 23/).first()).toBeVisible();
});

test('deaktivierte Flags blenden Jobbörse und Partnerkarte aus', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: 'Mehr' }).click();
  await expect(page.getByRole('button', { name: /Offene Schichten/ })).toHaveCount(0);
  await expect(page.getByText('Partner · Demodaten')).toHaveCount(0);
});

test('Wochenkalender ist ohne Advanced-Modus erreichbar', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: /Schichten/ }).last().click();
  await page.getByRole('button', { name: 'Woche', exact: true }).click();
  await expect(page.locator('.week-calendar')).toBeVisible();
});

test('Dashboard bleibt auf 375 Pixeln ohne horizontales Scrollen nutzbar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await finishOnboarding(page);
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test('Lena-Beispiel: zwei Minijobs zusammen über der Grenze, Vorab-Warnung beim Café', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: /Lena, 20/ }).click();

  await expect(page.getByText('Beispiel · Lena, 20')).toBeVisible();
  await expect(page.locator('.hero-metric').getByText('Über der Grenze', { exact: true })).toBeVisible();
  await expect(page.getByText(/17\s*€ über der Grenze/)).toBeVisible();
  await expect(page.getByText(/Mehrere Minijobs werden Monat für Monat zusammengerechnet/)).toBeVisible();

  // Das Jahr wäre noch sicher – die Erklärung steht trotzdem da.
  await page.getByRole('button', { name: 'Jahr', exact: true }).click();
  await expect(page.locator('.year-panel').getByText('Sicher', { exact: true })).toBeVisible();
  await expect(page.locator('.year-panel').getByText(/Monat für Monat zusammengerechnet/)).toBeVisible();

  // Vorab-Warnung: neben der Kneipe passen höchstens 263 €.
  await page.getByRole('button', { name: 'Jobs', exact: true }).click();
  await page.locator('.job-card', { hasText: 'Café' }).getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(page.getByText(/höchstens 263\s*€ im Monat/)).toBeVisible();
});

function icsDate(daysFromToday: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const pad = (value: number) => String(value).padStart(2, '0');
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) + 'T' + pad(hour) + '0000';
}

function testCalendar(): Buffer {
  const event = (uid: string, summary: string, days: number, from: number, to: number) => [
    'BEGIN:VEVENT', 'UID:' + uid, 'SUMMARY:' + summary,
    'DTSTART;TZID=Europe/Berlin:' + icsDate(days, from), 'DTEND;TZID=Europe/Berlin:' + icsDate(days, to), 'END:VEVENT',
  ].join('\r\n');
  return Buffer.from([
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    event('pub-1', 'Schicht Irish Pub', 2, 18, 22),
    event('restaurant-1', 'Restaurant Spätdienst', 3, 17, 21),
    event('dentist', 'Zahnarzt', 4, 9, 10),
    'END:VCALENDAR',
  ].join('\r\n'));
}

test('Kalenderimport übernimmt Schichten und erfasst sie beim zweiten Import nicht doppelt', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: /Aus Kalender oder Foto übernehmen/ }).click();
  await expect(page.getByRole('heading', { name: 'Schichten übernehmen' })).toBeVisible();

  const file = { name: 'arbeit.ics', mimeType: 'text/calendar', buffer: testCalendar() };
  await page.getByLabel('Kalenderdatei (.ics) importieren').setInputFiles(file);
  // Zwei Termine passen zu Jobs, der Zahnarzttermin bleibt unter „Andere Termine“.
  await expect(page.getByRole('button', { name: 'Übernehmen (2)' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Andere Termine anzeigen \(1\)/ })).toBeVisible();
  await page.getByRole('button', { name: 'Übernehmen (2)' }).click();
  await expect(page.getByText('Gespeichert: 2 neu, 0 ergänzt.')).toBeVisible();

  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  await page.getByLabel('Kalenderdatei (.ics) importieren').setInputFiles(file);
  await expect(page.getByRole('button', { name: 'Übernehmen (0)' })).toBeDisabled();
  await expect(page.locator('.import-summary')).toContainText('2 schon erfasst');

  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('button', { name: 'Zu den Schichten' }).click();
  await expect(page.locator('.shift-card .pill-source')).toHaveCount(2);
});

test('Advanced-Modus schaltet Partner-Jobbörsen ein und wieder aus', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: 'Mehr' }).click();
  await expect(page.getByRole('button', { name: /Offene Schichten/ })).toHaveCount(0);

  await page.getByRole('button', { name: /Einstellungen/ }).click();
  await page.getByLabel(/Advanced-Modus/).check();
  await page.getByRole('button', { name: 'Mehr' }).click();
  await page.getByRole('button', { name: /Offene Schichten/ }).click();
  await expect(page.getByRole('heading', { name: 'Partner-Jobbörsen' })).toBeVisible();
  await page.getByRole('button', { name: /Jobwolke/ }).click();
  await expect(page.locator('.listing-card').first()).toContainText('über Jobwolke');

  await page.getByRole('button', { name: 'Mehr' }).click();
  await page.getByRole('button', { name: /Einstellungen/ }).click();
  await page.getByLabel(/Advanced-Modus/).uncheck();
  await page.getByRole('button', { name: 'Mehr' }).click();
  await expect(page.getByRole('button', { name: /Offene Schichten/ })).toHaveCount(0);
});

test('übernimmt gespeicherte Daten aus Version 1 und sortiert eine kaputte Schicht aus', async ({ page }) => {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const removal = indexedDB.deleteDatabase('headroom-local');
      removal.onsuccess = removal.onerror = removal.onblocked = () => resolve();
    });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('headroom-local', 1);
      opening.onupgradeneeded = () => opening.result.createObjectStore('app-state');
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    const block = {
      profile: { status: 'Student', age: 21, familyInsured: true, bafoeg: false, hasMainJob: false, semesterPeriods: [] },
      jobs: [{ id: 'kino', title: 'Kino Lichtspiel', type: 'mini-job', wage: 14, startDate: '2026-01-01' }],
      shifts: [
        { id: 'a', jobId: 'kino', date: '2026-11-02', hours: 4 },
        { id: 'kaputt', jobId: 'kino', date: 'kein Datum', hours: 4 },
      ],
      payments: [],
      onboarded: true,
      language: 'de',
      darkMode: false,
      isPremium: false,
      dismissedRecommendations: [],
      peerOptIn: false,
      calendars: [],
      pendingImports: [],
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('app-state', 'readwrite');
      transaction.objectStore('app-state').put(block, 'main');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByText(/Ungültige gespeicherte Einträge: 1/)).toBeVisible();
  await page.getByRole('button', { name: /Jobs/ }).last().click();
  await expect(page.getByText('Kino Lichtspiel')).toBeVisible();

  // Nach einem weiteren Start ist der alte Block entfernt, die Daten bleiben.
  await page.reload();
  await page.getByRole('button', { name: /Jobs/ }).last().click();
  await expect(page.getByText('Kino Lichtspiel')).toBeVisible();
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('headroom-local');
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    const read = (store: string, query: 'all' | 'main') => new Promise<unknown>((resolve) => {
      const objects = db.transaction(store, 'readonly').objectStore(store);
      const request = query === 'all' ? objects.getAll() : objects.get('main');
      request.onsuccess = () => resolve(request.result);
    });
    const result = { legacy: await read('app-state', 'main'), records: (await read('records', 'all')) as unknown[], quarantine: (await read('quarantine', 'all')) as unknown[] };
    db.close();
    return { legacy: result.legacy ?? null, records: result.records.length, quarantine: result.quarantine.length };
  });
  expect(stored).toEqual({ legacy: null, records: 5, quarantine: 1 });
});

test('Auf diesem Gerät löschen entfernt das Beispielprofil', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: 'Mehr' }).click();
  await page.getByRole('button', { name: /Einstellungen/ }).first().click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Auf diesem Gerät löschen' }).click();
  await expect(page.getByRole('button', { name: 'Student:in', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Student:in', exact: true })).toBeVisible();
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('headroom-local');
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    const rows = await new Promise<{ record: { id: string; deleted: boolean; fields: Record<string, unknown> } }[]>((resolve) => {
      const request = db.transaction('records', 'readonly').objectStore('records').getAll();
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return {
      example: rows.find((row) => row.record.id === 'device')?.record.fields.example ?? null,
      deleted: rows.filter((row) => row.record.deleted).length,
      jobs: rows.filter((row) => row.record.id.startsWith('job:')).length,
    };
  });
  expect(stored).toEqual({ example: null, deleted: 0, jobs: 0 });
});
