import { describe, expect, it } from 'vitest';

import { displayName } from './display-name';

describe('displayName', () => {
  it('uses the first part of the email', () => {
    expect(displayName('damiano.falso@gmail.com')).toBe('Damiano');
    expect(displayName('MARIO_ROSSI@example.com')).toBe('Mario');
    expect(displayName('anna@example.com')).toBe('Anna');
  });

  it('prefers the display name from the account metadata', () => {
    expect(displayName('d.f@gmail.com', { display_name: 'Damiano Falso' })).toBe('Damiano');
    expect(displayName('d.f@gmail.com', { full_name: '  Dami ' })).toBe('Dami');
    expect(displayName('damiano.falso@gmail.com', { display_name: '' })).toBe('Damiano');
  });
});
