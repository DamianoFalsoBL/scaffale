import { resetTestAccount } from './support/test-user';

/** Every run starts from an empty library for the test account. */
export default async function globalSetup() {
  await resetTestAccount();
}
