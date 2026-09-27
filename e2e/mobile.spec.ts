import { expect, test } from '@playwright/test';

test('menus are easy to tap on a phone', async ({ page }) => {
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);

  await page.goto('/search?type=book');
  await page.getByRole('searchbox', { name: 'Cerca' }).fill('dune');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).first().click();

  const items = page.getByRole('menuitem');
  await expect(items.first()).toBeVisible();
  for (const item of await items.all()) {
    const box = await item.boundingBox();
    // 44 CSS px, give or take the rounding of the Pixel 7's 2.625 pixel ratio.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }

  // The bottom tab bar replaces the header links.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Sezioni' }).last()).toBeVisible();
});
