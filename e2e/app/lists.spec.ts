import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// Interstellar (TMDB movie 157336), not in the test library yet.
const PREVIEW = '/title/tmdb/movie/157336';
const LIST = 'E2E Fantascienza';
const RENAMED = 'E2E Sci-fi';

test('creates a list from the preview and adds the title to it', async ({ page }) => {
  await page.goto(PREVIEW);
  await page.getByRole('button', { name: 'Aggiungi a lista' }).click();
  await page.getByRole('menuitem', { name: 'Nuova lista…' }).click();

  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel('Nome').fill(LIST);
  await dialog.getByRole('button', { name: 'Crea lista' }).click();

  await expect(page.getByText(`Aggiunto a “${LIST}” e alla libreria`)).toBeVisible();
  await page.waitForURL(/\/item\//);
  await expect(
    page.getByRole('region', { name: 'Liste' }).getByRole('link', { name: LIST }),
  ).toBeVisible();
});

test('filters the library by list', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('navigation', { name: 'Liste' }).getByRole('link', { name: LIST }).click();

  await expect(page).toHaveURL(/list=/);
  await expect(page.getByRole('heading', { level: 2, name: LIST })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Interstellar', exact: true })).toBeVisible();
});

test('renames and deletes the list, keeping the title in the library', async ({ page }) => {
  await page.goto('/library/lists');
  await page.getByRole('button', { name: `Modifica ${LIST}` }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel('Nome').fill(RENAMED);
  await dialog.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByText(RENAMED, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: `Elimina ${RENAMED}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Elimina' }).click();
  await expect(page.getByText('Nessuna lista per ora.', { exact: false })).toBeVisible();

  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Interstellar', exact: true })).toBeVisible();
});
