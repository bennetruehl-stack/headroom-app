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
  await expect(page.getByText('Knapp')).toBeVisible();
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
