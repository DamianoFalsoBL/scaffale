import { describe, expect, it } from 'vitest';

import { allowedStatuses, isStatusAllowed, statusLabel } from './status-labels';

describe('status labels', () => {
  it('follows the spec table', () => {
    expect(statusLabel('movie', 'planned')).toBe('Da vedere');
    expect(statusLabel('movie', 'completed')).toBe('Visto');
    expect(statusLabel('tv', 'completed')).toBe('Completata');
    expect(statusLabel('tv', 'dropped')).toBe('Abbandonata');
    expect(statusLabel('book', 'planned')).toBe('Da leggere');
    expect(statusLabel('book', 'in_progress')).toBe('In lettura');
    expect(statusLabel('book', 'on_hold')).toBe('In pausa');
  });

  it('has no in progress or on hold state for movies', () => {
    expect(allowedStatuses('movie')).toEqual(['planned', 'completed', 'dropped']);
    expect(isStatusAllowed('movie', 'in_progress')).toBe(false);
    expect(isStatusAllowed('movie', 'on_hold')).toBe(false);
  });

  it('allows every status for series and books, in display order', () => {
    const all = ['planned', 'in_progress', 'on_hold', 'completed', 'dropped'];
    expect(allowedStatuses('tv')).toEqual(all);
    expect(allowedStatuses('book')).toEqual(all);
  });
});
