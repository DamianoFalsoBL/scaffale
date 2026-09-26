import { expect, test } from '@playwright/test';

test('private pages send visitors to the login', async ({ page }) => {
  await page.goto('/library');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible();
  // Passkeys only exist on scaffale.damianofalso.com.
  await expect(page.getByRole('button', { name: 'Entra con passkey' })).toHaveCount(0);
});

test('the installable app files load without a session', async ({ page, request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ name: 'Scaffale', display: 'standalone' });

  expect((await request.get('/sw.js')).ok()).toBe(true);

  await page.goto('/offline.html');
  await expect(page.getByRole('heading', { name: 'Sei offline' })).toBeVisible();
});
