import { resetTestAccount } from './support/test-user';

/** Leaves nothing behind in the shared (cloud) database. */
export default async function globalTeardown() {
  await resetTestAccount();
}
