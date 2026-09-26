import { describe, expect, it } from 'vitest';

import { isPublicPath } from './public-paths';

describe('isPublicPath', () => {
  it('lets the login, API and install/offline files through without a session', () => {
    for (const path of [
      '/login',
      '/api/search',
      '/info',
      '/manifest.webmanifest',
      '/sw.js',
      '/offline.html',
    ]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });

  it('keeps the app itself private, including look-alike paths', () => {
    for (const path of ['/', '/dashboard', '/profile', '/sw.jsx', '/login-other', '/apis']) {
      expect(isPublicPath(path)).toBe(false);
    }
  });
});
