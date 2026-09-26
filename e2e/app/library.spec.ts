import { expect, test } from '@playwright/test';

// One flow on one title: add from search, find it in the library, remove it.
test.describe.configure({ mode: 'serial' });

const TITLE = 'Interstellar';

test('adds a search result to the library', async ({ page }) => {
  await page.goto('/search?type=movie');
  await page.getByRole('searchbox', { name: 'Cerca' }).fill('interstellar');

  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: TITLE, exact: true }) })
    .first();
  await card.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Da vedere', exact: true }).click();

  await expect(page.getByText(`“${TITLE}” aggiunto alla libreria`)).toBeVisible();
  // The status takes the button's place.
  await expect(
    card.getByRole('link', { name: `${TITLE}: Da vedere. Apri il dettaglio` }),
  ).toBeVisible();
});

test('keeps the search when coming back from a detail page', async ({ page }) => {
  await page.goto('/search?type=movie');
  await page.getByRole('searchbox', { name: 'Cerca' }).fill('interstellar');
  await page.getByRole('link', { name: 'Dettagli' }).first().click();
  await expect(page).toHaveURL(/\/(item|title)\//);

  await page.getByRole('button', { name: 'Indietro' }).click();
  await expect(page.getByRole('searchbox', { name: 'Cerca' })).toHaveValue('interstellar');
  await expect(page.getByRole('heading', { name: TITLE, exact: true }).first()).toBeVisible();
});

test('shows the title in the library and removes it', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('heading', { name: TITLE, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();

  await page.getByRole('button', { name: 'Rimuovi dalla libreria' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Rimuovi' }).click();

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText('La tua libreria è vuota')).toBeVisible();
});

test('explores by genre with the filters', async ({ page }) => {
  await page.goto('/search?type=movie&genre=horror&from=2015');
  await expect(page.getByRole('heading', { name: 'Esplora' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rimuovi filtro Horror' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aggiungi', exact: true }).first()).toBeVisible();
});
