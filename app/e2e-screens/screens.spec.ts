import { expect, test, type Page } from '@playwright/test';

const sizes = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
];
const dir = '../screenshots/';

async function shot(page: Page, name: string, width: number) {
  await page.waitForTimeout(450); // Einblend-Animationen abwarten
  // Ganzseitige Aufnahmen frieren fixierte Elemente mitten im Bild ein.
  // Für das Review steht die Navigation deshalb am Seitenende, wie nach dem Scrollen auf dem Handy.
  const style = await page.addStyleTag({
    content: '.bottom-nav{position:absolute!important;left:0!important;transform:none!important;width:100%!important}',
  });
  await page.screenshot({ path: `${dir}${width}-${name}.png`, fullPage: true });
  await style.evaluate((node) => node.remove());
}

async function viewportShot(page: Page, name: string, width: number) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${dir}${width}-${name}.png` });
}

async function openExample(page: Page, example: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: example }).click();
  await expect(page.locator('.hero-metric')).toBeVisible();
}

for (const size of sizes) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('Onboarding', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Student:in', exact: true })).toBeVisible();
      await shot(page, '01-onboarding', size.width);
    });

    for (const [key, example] of [['standard', /knapp unter der Grenze/], ['lena', /Lena, 20/]] as const) {
      test(`Dashboard ${key}`, async ({ page }) => {
        await openExample(page, example);
        await viewportShot(page, `00-${key}-handyansicht`, size.width);
        await shot(page, `02-${key}-monat`, size.width);
        await page.getByRole('button', { name: 'Jahr', exact: true }).click();
        await shot(page, `03-${key}-jahr`, size.width);
        await page.getByRole('button', { name: 'Saison', exact: true }).click();
        await shot(page, `04-${key}-saison`, size.width);
      });
    }

    test('Grenzwerte', async ({ page }) => {
      await openExample(page, /knapp unter der Grenze/);
      await page.getByRole('button', { name: 'Grenzwerte' }).last().click();
      await shot(page, '05-grenzwerte', size.width);
    });

    test('Schicht eintragen', async ({ page }) => {
      await openExample(page, /knapp unter der Grenze/);
      await page.getByRole('button', { name: /Schicht eintragen/ }).click();
      await page.getByLabel('Arbeitsstunden').scrollIntoViewIfNeeded();
      await shot(page, '06-schicht-eintragen', size.width);
    });

    for (const [key, example] of [['standard', /knapp unter der Grenze/], ['lena', /Lena, 20/]] as const) {
      test(`Kein horizontales Scrollen ${key}`, async ({ page }) => {
        await openExample(page, example);
        for (const tab of ['Übersicht', 'Schichten', 'Jobs', 'Grenzwerte', 'Mehr']) {
          await page.locator('.bottom-nav').getByRole('button', { name: tab }).click();
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, tab).toBeLessThanOrEqual(0);
        }
      });
    }
  });
}
