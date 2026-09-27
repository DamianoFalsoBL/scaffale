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
