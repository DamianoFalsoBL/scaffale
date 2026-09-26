import type { Metadata, Viewport } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';

import { ServiceWorker } from '@/components/service-worker';
import { SiteFooter } from '@/components/site-footer';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { publicEnv } from '@/lib/env';

import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

// Display serif for headings ("Carta e inchiostro"); body text stays in Geist.
const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['opsz'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'Scaffale',
    template: '%s · Scaffale',
  },
  description: 'Il mio tracker personale di film, serie TV e libri.',
  // Personal app: keep it out of search engines.
  robots: { index: false, follow: false },
  applicationName: 'Scaffale',
  // Home-screen app on iPhone (the manifest covers Android and desktop).
  appleWebApp: { title: 'Scaffale', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  // Lets the mobile tab bar sit above the home indicator (env(safe-area-inset-bottom)).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5efe3' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1714' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <SiteFooter />
          <Toaster position="bottom-center" richColors closeButton />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
