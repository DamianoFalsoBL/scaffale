import { describe, expect, it } from 'vitest';

import { knownWatchProviderSlugs, servicesCarrying, watchProviderIds } from './catalogs';

describe('streaming services', () => {
  it('collects the ids of one or more services, aliases included', () => {
    expect([...watchProviderIds('prime')]).toEqual([119, 2100]);
    expect([...watchProviderIds(['netflix', 'prime'])]).toEqual([8, 119, 2100]);
    expect(watchProviderIds([]).size).toBe(0);
  });

  it('tells which of the chosen services carry a title', () => {
    const labels = (ids: number[]) =>
      servicesCarrying(ids, ['prime', 'netflix']).map((s) => s.label);
    expect(labels([2100, 337])).toEqual(['Prime Video']);
    expect(labels([8, 119])).toEqual(['Netflix', 'Prime Video']);
    expect(labels([337])).toEqual([]);
  });

  it('keeps known slugs only, once, in catalog order', () => {
    expect(knownWatchProviderSlugs(['prime', 'blockbuster', 'netflix', 'prime'])).toEqual([
      'netflix',
      'prime',
    ]);
  });
});
