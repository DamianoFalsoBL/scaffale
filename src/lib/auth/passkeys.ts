/**
 * WebAuthn relying party, as in supabase/config.toml ([auth.webauthn] rp_id).
 * Passkeys only work on this host: previews and localhost keep using the password.
 */
export const PASSKEY_RP_ID = 'scaffale.damianofalso.com';

export function passkeysAvailableOn(hostname: string) {
  return hostname === PASSKEY_RP_ID;
}

type MaybeError = {
  name?: unknown;
  code?: unknown;
  status?: unknown;
  cause?: { name?: unknown } | null;
};

/** The user closed the Face ID / fingerprint prompt, or it timed out: not worth an error. */
export function isPasskeyCancel(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const { name, code, cause } = error as MaybeError;
  return (
    code === 'ERROR_CEREMONY_ABORTED' ||
    name === 'AbortError' ||
    name === 'NotAllowedError' ||
    cause?.name === 'NotAllowedError' ||
    cause?.name === 'AbortError'
  );
}

const MESSAGES: Record<string, string> = {
  passkey_disabled: 'Le passkey non sono ancora attive su Scaffale.',
  webauthn_credential_not_found:
    'Questa passkey non è collegata a Scaffale. Entra con la password e aggiungila dal Profilo.',
  webauthn_challenge_expired: 'Tempo scaduto. Riprova.',
  webauthn_challenge_not_found: 'Tempo scaduto. Riprova.',
  webauthn_credential_exists: 'Questo dispositivo ha già una passkey per Scaffale.',
  ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED: 'Questo dispositivo ha già una passkey per Scaffale.',
  too_many_passkeys: 'Hai raggiunto il numero massimo di passkey. Eliminane una prima.',
  ERROR_INVALID_DOMAIN: `Le passkey funzionano solo su ${PASSKEY_RP_ID}.`,
  ERROR_INVALID_RP_ID: `Le passkey funzionano solo su ${PASSKEY_RP_ID}.`,
};

/** Italian message for a passkey failure, or null when the user just cancelled. */
export function passkeyErrorMessage(error: unknown): string | null {
  if (isPasskeyCancel(error)) return null;

  const { code, status } = (error && typeof error === 'object' ? error : {}) as MaybeError;
  if (status === 429) return 'Troppi tentativi. Riprova tra qualche minuto.';
  if (typeof code === 'string' && code in MESSAGES) return MESSAGES[code]!;
  return 'Non è stato possibile usare la passkey. Riprova.';
}
