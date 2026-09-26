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
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
