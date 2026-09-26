import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isPublicPath } from '@/lib/auth/public-paths';

import manifest from './manifest';

describe('manifest', () => {
  const app = manifest();

  it('describes an installable standalone app starting on the dashboard', () => {
    expect(app).toMatchObject({ name: 'Scaffale', display: 'standalone', start_url: '/dashboard' });
    expect(app.icons?.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(app.icons?.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  it('points only at icons that exist in public/', () => {
    const sources = [
      ...(app.icons ?? []),
      ...(app.shortcuts ?? []).flatMap((shortcut) => shortcut.icons ?? []),
    ].map((icon) => icon.src);

    for (const src of sources) {
      expect(existsSync(join(process.cwd(), 'public', src)), src).toBe(true);
    }
  });

  it('is reachable without a session, like the service worker and offline page', () => {
    expect(isPublicPath('/manifest.webmanifest')).toBe(true);
    expect(existsSync(join(process.cwd(), 'public', 'sw.js'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'public', 'offline.html'))).toBe(true);
  });
});
