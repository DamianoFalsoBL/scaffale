import type { NextConfig } from 'next';

const securityHeaders = [
  // The app is never meant to be embedded in another site.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  images: {
    // Covers are rendered with `unoptimized` (the CDNs already serve sized images);
    // the allowlist still documents and restricts where they may come from.
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
      { protocol: 'https', hostname: 'books.google.com', pathname: '/books/**' },
      { protocol: 'https', hostname: 'covers.openlibrary.org', pathname: '/b/**' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Later entries override earlier ones for the same key.
      {
        source: '/sw.js',
        headers: [
          // Always check for a new worker; never serve a stale one from the HTTP cache.
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
      { source: '/offline.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};

export default nextConfig;
