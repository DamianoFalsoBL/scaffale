import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { InstallHelp } from './install-help';
import { PasskeyManager, type PasskeyList } from './passkey-manager';

export const metadata: Metadata = {
  title: 'Profilo',
};

async function listPasskeys(): Promise<PasskeyList> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.passkey.list();

  if (error) {
    if (error.code === 'passkey_disabled') return { status: 'disabled' };
    console.warn('Listing passkeys failed', { status: error.status, code: error.code });
    return { status: 'error' };
  }
  return {
    status: 'ok',
    passkeys: data.map((passkey) => ({
      id: passkey.id,
      name: passkey.friendly_name,
      createdAt: passkey.created_at,
      lastUsedAt: passkey.last_used_at,
    })),
  };
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const passkeys = await listPasskeys();

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profilo</h1>
        <p className="text-muted-foreground">
          {user.name} · {user.email}
        </p>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="passkeys-title">
        <div className="space-y-1">
          <h2 id="passkeys-title" className="text-lg font-semibold">
            Passkey
          </h2>
          <p className="text-sm text-muted-foreground">
            Entra con Face ID, impronta o il PIN del dispositivo, senza scrivere la password. La
            password resta valida.
          </p>
        </div>
        <PasskeyManager list={passkeys} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="install-title">
        <h2 id="install-title" className="text-lg font-semibold">
          Installa l&apos;app
        </h2>
        <InstallHelp />
      </section>
    </div>
  );
}
