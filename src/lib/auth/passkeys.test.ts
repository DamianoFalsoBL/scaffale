import { describe, expect, it } from 'vitest';

import { isPasskeyCancel, passkeyErrorMessage, passkeysAvailableOn } from './passkeys';

describe('passkeysAvailableOn', () => {
  it('allows only the production host (the WebAuthn relying party)', () => {
    expect(passkeysAvailableOn('scaffale.damianofalso.com')).toBe(true);
    expect(passkeysAvailableOn('localhost')).toBe(false);
    expect(passkeysAvailableOn('scaffale-abc-damianofalsobls-projects.vercel.app')).toBe(false);
  });
});

describe('passkeyErrorMessage', () => {
  it('stays quiet when the user cancels the prompt', () => {
    const notAllowed = Object.assign(new Error('cancelled'), {
      code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',
      cause: { name: 'NotAllowedError' },
    });

    expect(isPasskeyCancel(notAllowed)).toBe(true);
    expect(passkeyErrorMessage(notAllowed)).toBeNull();
    expect(passkeyErrorMessage({ code: 'ERROR_CEREMONY_ABORTED' })).toBeNull();
  });

  it('explains the known Supabase and WebAuthn errors in Italian', () => {
    expect(passkeyErrorMessage({ code: 'passkey_disabled', status: 404 })).toBe(
      'Le passkey non sono ancora attive su Scaffale.',
    );
    expect(passkeyErrorMessage({ code: 'webauthn_credential_not_found' })).toContain(
      'Entra con la password',
    );
    expect(passkeyErrorMessage({ code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' })).toBe(
      'Questo dispositivo ha già una passkey per Scaffale.',
    );
    expect(passkeyErrorMessage({ status: 429 })).toContain('Troppi tentativi');
  });

  it('falls back to a generic message', () => {
    expect(passkeyErrorMessage(new Error('boom'))).toBe(
      'Non è stato possibile usare la passkey. Riprova.',
    );
    expect(passkeyErrorMessage(undefined)).toBe('Non è stato possibile usare la passkey. Riprova.');
  });
});
