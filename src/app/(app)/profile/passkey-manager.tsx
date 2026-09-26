'use client';

import { Fingerprint, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { usePasskeysAvailable } from '@/hooks/use-passkeys-available';
import { PASSKEY_RP_ID, passkeyErrorMessage } from '@/lib/auth/passkeys';
import { createClient } from '@/lib/supabase/client';

export interface PasskeySummary {
  id: string;
  name?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export type PasskeyList =
  { status: 'ok'; passkeys: PasskeySummary[] } | { status: 'disabled' } | { status: 'error' };

const dateFormat = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' });

function describe(passkey: PasskeySummary) {
  const added = `aggiunta il ${dateFormat.format(new Date(passkey.createdAt))}`;
  return passkey.lastUsedAt
    ? `${added} · ultimo accesso il ${dateFormat.format(new Date(passkey.lastUsedAt))}`
    : added;
}

export function PasskeyManager({ list }: { list: PasskeyList }) {
  const router = useRouter();
  const available = usePasskeysAvailable();
  const [adding, setAdding] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  if (list.status === 'disabled') {
    return <Notice>Le passkey non sono ancora attive su Scaffale.</Notice>;
  }
  if (list.status === 'error') {
    return <Notice>Non è stato possibile caricare le passkey. Riprova tra poco.</Notice>;
  }

  async function add() {
    setAdding(true);
    try {
      const { error } = await createClient().auth.registerPasskey();
      if (error) {
        const message = passkeyErrorMessage(error);
        if (message) toast.error(message);
        return;
      }
      toast.success('Passkey aggiunta: dalla prossima volta entri senza password.');
      startRefresh(() => router.refresh());
    } catch (caught) {
      const message = passkeyErrorMessage(caught);
      if (message) toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function remove(passkey: PasskeySummary) {
    const { error } = await createClient().auth.passkey.delete({ passkeyId: passkey.id });
    if (error) {
      toast.error(passkeyErrorMessage(error) ?? 'Non è stato possibile eliminare la passkey.');
      return;
    }
    toast.success('Passkey eliminata.');
    startRefresh(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-3">
      {list.passkeys.length > 0 ? (
        <ul className="divide-y rounded-xl border bg-card" aria-busy={refreshing}>
          {list.passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center gap-3 px-4 py-3">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{passkey.name ?? 'Passkey'}</p>
                <p className="text-xs text-muted-foreground">{describe(passkey)}</p>
              </div>
              <DeletePasskey passkey={passkey} onConfirm={() => remove(passkey)} />
            </li>
          ))}
        </ul>
      ) : (
        <Notice>Nessuna passkey per ora.</Notice>
      )}

      {available ? (
        <Button className="self-start" onClick={add} disabled={adding || refreshing}>
          {adding ? <Loader2 className="animate-spin" aria-hidden /> : <Fingerprint aria-hidden />}
          Aggiungi passkey su questo dispositivo
        </Button>
      ) : (
        <Notice>
          Per aggiungere una passkey apri Scaffale da {PASSKEY_RP_ID} sul dispositivo che userai per
          entrare.
        </Notice>
      )}
    </div>
  );
}

function DeletePasskey({ passkey, onConfirm }: { passkey: PasskeySummary; onConfirm: () => void }) {
  const name = passkey.name ?? 'questa passkey';
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Elimina ${name}`}>
          <Trash2 aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Da quel dispositivo dovrai entrare con la password, finché non aggiungi una nuova
            passkey. Ricordati di toglierla anche dal gestore di password del dispositivo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
