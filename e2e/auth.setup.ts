import { expect, test as setup } from '@playwright/test';

import { AUTH_FILE } from './support/paths';
import { testAccount } from './support/test-user';

setup('sign in with the test account', async ({ page }) => {
  const { email, password } = testAccount();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Accedi' }).click();

  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('link', { name: 'Libreria' }).first()).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
