import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// Spirited Away (TMDB movie 129): used by platforms.spec too, but the library is wiped
// before each run and that spec leaves it planned, which is what this one needs.
const PREVIEW = '/title/tmdb/movie/129';
const TITLE = 'La città incantata';

test('saves my streaming services in the profile', async ({ page }) => {
  await page.goto('/profile');
  const section = page.getByRole('region', { name: 'Le mie piattaforme' });
  await section.getByRole('button', { name: 'Netflix' }).click();
  await expect(section.getByRole('button', { name: 'Netflix' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await section.getByRole('button', { name: 'Salva piattaforme' }).click();
  await expect(page.getByText('Piattaforme salvate')).toBeVisible();

  await page.goto('/library?provider=mine');
  await expect(
    page.getByText('Film e serie che puoi vedere su Netflix', { exact: false }),
  ).toBeVisible();
});

test('puts a planned title among the next ones', async ({ page }) => {
  await page.goto(PREVIEW);
  // Already in the library (platforms.spec): the preview redirects to the detail.
  if (page.url().includes('/title/')) {
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).first().click();
    await page.getByRole('menuitem', { name: 'Da vedere', exact: true }).click();
  }
  await page.waitForURL(/\/item\//);

  await page.getByRole('button', { name: 'Metti tra i prossimi' }).click();
  await expect(page.getByText(`“${TITLE}” è tra i prossimi`)).toBeVisible();

  await page.goto('/dashboard');
  const upNext = page.getByRole('region', { name: 'Prossimi' });
  await expect(upNext.getByRole('heading', { name: TITLE, exact: true })).toBeVisible();
  // Netflix is saved: the shelf (or its empty message) is there.
  await expect(page.getByRole('region', { name: 'Puoi vederli subito' })).toBeVisible();
});

test('takes it out from the card menu, and seeing it clears the mark', async ({ page }) => {
  await page.goto('/dashboard');
  const upNext = page.getByRole('region', { name: 'Prossimi' });
  await upNext.getByRole('button', { name: new RegExp(`Stato di “${TITLE}”`) }).click();
  await page.getByRole('menuitem', { name: 'Togli dai prossimi' }).click();
  await expect(page.getByText(`“${TITLE}” tolto dai prossimi`)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Prossimi' })).toHaveCount(0);

  // Back in from the library, then marked as seen: it leaves the queue by itself.
  await page.goto('/library?status=planned');
  const menu = page.getByRole('button', { name: new RegExp(`Stato di “${TITLE}”`) });
  await menu.click();
  await page.getByRole('menuitem', { name: 'Metti tra i prossimi' }).click();
  await expect(page.getByText('Prossimo', { exact: true })).toBeVisible();

  await menu.click();
  await page.getByRole('menuitemradio', { name: 'Visto' }).click();
  // Saved once it leaves the planned list (leaving earlier would cancel the save).
  await expect(menu).toHaveCount(0);
  await page.goto('/dashboard');
  await expect(page.getByRole('region', { name: 'Prossimi' })).toHaveCount(0);
});
