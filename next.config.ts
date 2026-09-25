import type { NextConfig } from 'next';

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
};

export default nextConfig;
