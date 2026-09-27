import { expect, test } from '@playwright/test';

// A past week with known Italian cinema releases on Thursday the 24th.
const WEEK = '/releases?week=2026-09-24';

test('opens the releases from the navigation', async ({ page }) => {
  await page.goto('/dashboard');
  await page
    .getByRole('navigation', { name: 'Sezioni' })
    .getByRole('link', { name: 'Uscite' })
    .first()
    .click();
  await expect(page).toHaveURL(/\/releases$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Uscite' })).toBeVisible();
  await expect(page.getByText('Oggi', { exact: true }).first()).toBeVisible();
});

test('lists a week day by day', async ({ page }) => {
  await page.goto(WEEK);
  await expect(page.getByText('Settimana 21 – 27 settembre 2026')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(7);

  const thursday = page.getByRole('region', { name: /Giovedì 24 settembre/ });
  await expect(thursday.getByRole('article').first()).toBeVisible();
  await expect(thursday.getByText(/Al cinema/).first()).toBeVisible();
});

test('moves between weeks and filters by type', async ({ page }) => {
  await page.goto(WEEK);
  await page.getByRole('link', { name: 'Settimana successiva' }).click();
  await expect(page).toHaveURL(/week=2026-09-28/);
  await expect(page.getByText('Settimana 28 settembre – 4 ottobre 2026')).toBeVisible();

  await page.getByRole('navigation', { name: 'Tipo' }).getByRole('link', { name: 'Serie' }).click();
  await expect(page).toHaveURL(/week=2026-09-28&type=tv/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(7);
  await expect(page.getByText(/Al cinema|In streaming/)).toHaveCount(0);
});
