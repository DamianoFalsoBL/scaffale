import type { MetadataRoute } from 'next';

/** Web app manifest: served at /manifest.webmanifest and linked by Next automatically. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Scaffale',
    short_name: 'Scaffale',
    description: 'Il mio tracker personale di film, serie TV e libri.',
    lang: 'it',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    // Paper colors, as in globals.css: the splash screen matches the light theme.
    background_color: '#f5efe3',
    theme_color: '#f5efe3',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Cerca', url: '/search', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      {
        name: 'Libreria',
        url: '/library',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
