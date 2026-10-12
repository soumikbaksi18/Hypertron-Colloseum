import { Check, Download, EyeOff, KeyRound, Shield, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useWalletSession } from '../context/WalletContext';
import { ApiError } from '../lib/http';
import { completePrivacyOnboarding } from '../lib/onboarding';
import { keygenFromServer } from '../lib/prover';
import { sessionApi } from '../lib/session';
import {
  downloadShieldBackup,
  loadShieldKeys,
  parseShieldBackup,
  saveShieldKeys,
} from '../lib/shield-keys';
import { DashboardChrome } from './chrome';

const POINTS = [
  {
    icon: EyeOff,
    title: 'Sends stay in the pool',
    body: 'Paying a Hypertron ID does not publish the amount or who you paid. The chain only sees that a private transfer happened.',
  },
  {
    icon: Shield,
    title: 'Adding money is public',
    body: 'A deposit shows the USDC amount, your Phantom address, and the time. Cash out is public the same way. Do this before you need the funds to be private.',
  },
  {
    icon: KeyRound,
    title: 'Keys live in this browser',
    body: 'Your spend key never goes on-chain. Download a backup now. Another computer cannot spend or recover your balance without that file.',
  },
];

export function PrivacyOnboarding({ onDone }: { onDone: () => void }) {
  const { session, refresh } = useWalletSession();
  const [keysReady, setKeysReady] = useState(() => Boolean(loadShieldKeys()));
  const [backedUp, setBackedUp] = useState(() => Boolean(loadShieldKeys()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!session) return null;
  const current = session;
  const returning = Boolean(current.owner_pk) && !keysReady;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const generated = await keygenFromServer();
      const keys = {
        spendSk: generated.spend_sk,
        viewSecret: generated.view_secret,
        viewPub: generated.view_pub,
        ownerPk: generated.owner_pk,
      };
      saveShieldKeys(keys);
      downloadShieldBackup(keys);
      await sessionApi.updateMe({
        viewPub: keys.viewPub,
        ownerPk: keys.ownerPk,
      });
      await refresh();
      setKeysReady(true);
      setBackedUp(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create shield keys.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const keys = parseShieldBackup(await file.text());
      saveShieldKeys(keys);
      await sessionApi.updateMe({
        viewPub: keys.viewPub,
        ownerPk: keys.ownerPk,
      });
      await refresh();
      setKeysReady(true);
      setBackedUp(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'That file is not a Hypertron backup.',
      );
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    if (!keysReady) {
      setError('Create or import shield keys before continuing.');
      return;
    }
    completePrivacyOnboarding(current.wallet_address);
    onDone();
  }

  return (
    <DashboardChrome
      navItems={[]}
      activeId=""
      onSelect={() => undefined}
      breadcrumb="Account / Setup"
      searchPlaceholder="Search"
      identity={{
        title: current.handle ?? 'Hypertron',
        subtitle: current.wallet_address,
      }}
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
          Get started
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
          How private payments work
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Read this once. The wallet stays simple after this — deposits still
          warn you at the moment you add money.
        </p>

        <ol className="mt-8 grid gap-3">
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <li
                key={point.title}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F8F0E2] text-[#C9A46A]">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{point.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{point.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">
            {keysReady
              ? 'Keys are ready'
              : returning
                ? 'No backup on this computer?'
                : 'Save a backup'}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {keysReady
              ? 'You can continue. Download another copy of the backup if you want.'
              : returning
                ? 'Import a backup only if you have the file from the browser that created this Hypertron ID. If you do not have that file, create new keys and start a fresh private balance. Old notes stay locked to the lost key.'
                : 'We will generate spend and viewing keys in this browser and download a JSON backup. Keep that file offline.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#121F46] to-[#4A63BE] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Download className="size-4" />
              {keysReady
                ? 'Download backup again'
                : busy
                  ? 'Creating…'
                  : returning
                    ? 'Create new keys'
                    : 'Create keys and download backup'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Upload className="size-4" />
              Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importFile(file);
              }}
            />
          </div>
          {keysReady ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
              <Check className="size-4" strokeWidth={2.4} />
              Keys are in this browser{backedUp ? ' and a backup was saved.' : '.'}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </section>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={finish}
            disabled={!keysReady || busy}
            className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-[#121F46] to-[#4A63BE] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,31,70,0.22)] disabled:opacity-40"
          >
            Continue to wallet
          </button>
        </div>
      </div>
    </DashboardChrome>
  );
}
