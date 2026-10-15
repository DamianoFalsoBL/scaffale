import { expect, test } from '@playwright/test';

// English titles typed in the search: the right title comes first, shown in Italian.
for (const [query, title] of [
  ['spirited away', 'La città incantata'],
  ['memories of murder', 'Memorie di un assassino'],
] as const) {
  test(`finds "${title}" by its English title`, async ({ page }) => {
    await page.goto('/search?type=movie');
    await page.getByRole('searchbox', { name: 'Cerca' }).fill(query);
    await expect(page.getByRole('article').first().getByRole('heading')).toHaveText(title);
  });
}

// Adding from the preview opens the detail in its place: one "back" returns to the search.
test('goes back to the search after adding a title from its preview', async ({ page }) => {
  await page.goto('/search?type=movie');
  await page.getByRole('searchbox', { name: 'Cerca' }).fill('memories of murder');
  await page.getByRole('article').first().getByRole('link', { name: 'Dettagli' }).click();
  await page.waitForURL(/\/title\//);

  await page.getByRole('button', { name: 'Aggiungi', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Da vedere', exact: true }).click();
  await page.waitForURL(/\/item\//);

  await page.goBack();
  await expect(page).toHaveURL(/\/search\?.*q=memories/);
  await expect(page.getByRole('searchbox', { name: 'Cerca' })).toHaveValue('memories of murder');
});
