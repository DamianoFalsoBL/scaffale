import { describe, expect, it } from 'vitest';

import { buildInfo, formatBuildInfo } from './build-info';

describe('build info', () => {
  it('shows version and short commit in production', () => {
    const info = buildInfo({
      version: '1.14.0',
      vercelEnv: 'production',
      commitSha: '8180b7d3c2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7',
    });
    expect(info).toEqual({ version: '1.14.0', commit: '8180b7d', environment: 'production' });
    expect(formatBuildInfo(info)).toBe('Versione 1.14.0 · 8180b7d');
  });

  it('marks previews and local builds', () => {
    expect(
      formatBuildInfo(
        buildInfo({ version: '1.14.0', vercelEnv: 'preview', commitSha: 'abcdef12' }),
      ),
    ).toBe('Versione 1.14.0 · abcdef1 · anteprima');
    expect(formatBuildInfo(buildInfo({ version: '1.14.0' }))).toBe(
      'Versione 1.14.0 · build locale',
    );
  });
});
