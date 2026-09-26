'use client';

import { useEffect } from 'react';

/** Registers public/sw.js (offline page for the installed app). Production only. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((error: unknown) => console.warn('Service worker registration failed', error));
  }, []);

  return null;
}
