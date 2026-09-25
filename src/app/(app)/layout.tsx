import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/app-header';
import { getCurrentUser } from '@/lib/auth/session';

// The proxy already redirects anonymous visitors; this also enforces ALLOWED_EMAILS.
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
