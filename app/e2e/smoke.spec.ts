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
