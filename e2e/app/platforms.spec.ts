import { expect, test } from '@playwright/test';

// Spirited Away (TMDB movie 129): used only here. Which platforms carry it changes over
// time, so the test checks the filter itself, not the catalog of a platform.
const PREVIEW = '/title/tmdb/movie/129';

test('filters the library by streaming platform', async ({ page }) => {
  await page.goto(PREVIEW);
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Da vedere', exact: true }).click();
  await page.waitForURL(/\/item\//);

  await page.goto('/library');
  await page.getByRole('combobox', { name: 'Filtra per piattaforma' }).click();
  await page.getByRole('option', { name: 'Netflix' }).click();

  await expect(page).toHaveURL(/provider=netflix/);
  await expect(
    page.getByText('Film e serie che puoi vedere su Netflix in abbonamento o gratis', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText('i libri non sono inclusi', { exact: false })).toBeVisible();
  await expect(page.getByText('JustWatch', { exact: false })).toBeVisible();

  await page.getByRole('combobox', { name: 'Filtra per piattaforma' }).click();
  await page.getByRole('option', { name: 'Tutte le piattaforme' }).click();
  await expect(page).not.toHaveURL(/provider=/);
  await expect(
    page.getByRole('heading', { name: 'La città incantata', exact: true }),
  ).toBeVisible();
});
