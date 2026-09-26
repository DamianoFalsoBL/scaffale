// API routes are not redirected: each one answers 401 itself (or checks CRON_SECRET).
// The manifest, service worker and offline page must load without a session (install, offline).
const PUBLIC_PATHS = [
  '/login',
  '/api',
  '/info',
  '/manifest.webmanifest',
  '/sw.js',
  '/offline.html',
];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
