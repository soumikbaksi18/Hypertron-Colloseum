import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWalletSession } from '../context/WalletContext';
import { ApiError } from '../lib/http';
import { sessionApi } from '../lib/session';
import { shortenAddress } from '../lib/phantom';
import { AuditorPage } from './auditor-page';

export function HubAudit() {
  return <AuditorPage />;
}

export function HubBilling() {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
        Account
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
        Billing & Plans
      </h1>
      <div className="mt-6 rounded-2xl border border-[#E7B66D]/35 bg-[#F8F0E2]/70 p-6">
        <p className="text-sm font-semibold text-slate-900">Starter</p>
        <p className="mt-1 text-sm text-slate-500">
          Private USDC collection on Solana. Plans and seats come later.
        </p>
        <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0F1939]">
          Coming soon
        </span>
      </div>
    </div>
  );
}

export function HubSettingsPanel() {
  const { session, refresh, signOut } = useWalletSession();
  const navigate = useNavigate();
  const [name, setName] = useState(session?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await sessionApi.updateMe({ name: name.trim() });
      await refresh();
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
        Account
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
        Settings
      </h1>
      <form className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={(event) => void onSave(event)}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-900">Display name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#4A63BE]"
          />
        </label>
        <p className="font-mono text-xs text-slate-500">
          {session.handle ?? 'pending'} · {shortenAddress(session.wallet_address)}
        </p>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-[#121F46] to-[#4A63BE] px-4 text-sm font-semibold text-white"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => navigate('/'));
            }}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
          >
            Disconnect
          </button>
        </div>
      </form>
    </div>
  );
}
