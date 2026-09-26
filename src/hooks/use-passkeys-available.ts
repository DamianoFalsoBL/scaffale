import { useSyncExternalStore } from 'react';

import { passkeysAvailableOn } from '@/lib/auth/passkeys';

const noSubscribe = () => () => {};

/** WebAuthn in this browser, on the host the passkeys are bound to (false while rendering on the server). */
export function usePasskeysAvailable() {
  return useSyncExternalStore(
    noSubscribe,
    () => 'PublicKeyCredential' in window && passkeysAvailableOn(window.location.hostname),
    () => false,
  );
}
