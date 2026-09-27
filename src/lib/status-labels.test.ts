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
    expect(statusLabel('tv', 'waiting')).toBe('In attesa');
  });

  it('has no in progress or waiting state for movies', () => {
    expect(allowedStatuses('movie')).toEqual(['planned', 'completed', 'dropped']);
    expect(isStatusAllowed('movie', 'in_progress')).toBe(false);
    expect(isStatusAllowed('movie', 'waiting')).toBe(false);
  });

  it('lets only series wait for a new season, in display order', () => {
    expect(allowedStatuses('tv')).toEqual([
      'planned',
      'in_progress',
      'waiting',
      'completed',
      'dropped',
    ]);
    expect(allowedStatuses('book')).toEqual(['planned', 'in_progress', 'completed', 'dropped']);
  });
});
