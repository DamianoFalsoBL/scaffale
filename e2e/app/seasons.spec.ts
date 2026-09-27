import { expect, test } from '@playwright/test';

// Breaking Bad: ended, five seasons (TMDB tv 1396).
const PREVIEW = '/title/tmdb/tv/1396';

test('tracks seasons and moves the status on by itself', async ({ page }) => {
  await page.goto(PREVIEW);
  // The title's own button comes first; recommendations have their own "Aggiungi".
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Da vedere', exact: true }).click();
  // The preview moves to the full detail once the title is saved.
  await page.waitForURL(/\/item\//);

  const seasons = page.getByRole('region', { name: 'Stagioni viste' });
  const first = seasons.getByRole('button', { name: /^Stagione 1\b/ });
  await expect(first).toHaveAttribute('aria-pressed', 'false');

  await first.click();
  await expect(page.getByText('Serie spostata in “In corso”')).toBeVisible();
  await expect(first).toHaveAttribute('aria-pressed', 'true');

  // "Fino a qui" on the last season marks the ones in between too.
  const last = seasons.getByRole('listitem').filter({ hasText: /^Stagione 5/ });
  await last.getByRole('button', { name: 'Fino a qui' }).click();
  await expect(page.getByText('Serie completata: le hai viste tutte')).toBeVisible();
  await expect(seasons.getByText('5 di 5')).toBeVisible();
});
