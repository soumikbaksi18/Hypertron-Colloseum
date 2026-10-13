import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWalletSession } from '../context/WalletContext';
import { ApiError } from '../lib/http';
import { sessionApi } from '../lib/session';
import { shortenAddress } from '../lib/phantom';
import {
  canAccessWorkspaces,
  subscribeToWorkspace,
} from '../lib/workspace-subscription';
import { AuditorPage } from './auditor-page';

export function HubAudit() {
  return <AuditorPage />;
}

export function HubBilling() {
  const { session } = useWalletSession();
  const [subscribed, setSubscribed] = useState(() =>
    session ? canAccessWorkspaces(session) : false,
  );

  return (
    <div className="max-w-2xl">
      <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
        Account
      </p>
      <h1 className="dash-display mt-3 text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] text-[#EEF4FF]">
        Billing & Plans
      </h1>
      <div className="ov-card mt-6">
        <p className="dash-display text-[1.6rem] text-[#EEF4FF]">Workspace</p>
        <p className="mt-3 text-sm leading-relaxed text-[#C3D0E8]/55">
          Personal payments stay open. A workspace subscription unlocks overview, payments, treasury, and developer tools.
        </p>
        {subscribed ? (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#C3D0E8]/45 px-3 py-1 text-[11px] tracking-[0.14em] text-[#C3D0E8] uppercase">
            <span className="size-1.5 rounded-full bg-[#ffe500]" />
            Subscribed
          </span>
        ) : (
          <button
            type="button"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-[#ffe500] px-5 text-sm text-[#14110e]"
            onClick={() => {
              if (!session) return;
              subscribeToWorkspace(session.wallet_address);
              setSubscribed(true);
            }}
          >
            Subscribe
          </button>
        )}
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
      <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
        Account
      </p>
      <h1 className="dash-display mt-3 text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] text-[#EEF4FF]">
        Settings
      </h1>
      <form className="ov-card mt-6 space-y-4" onSubmit={(event) => void onSave(event)}>
        <label className="block">
          <span className="text-sm text-[#EEF4FF]">Display name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-[#C3D0E8]/35 bg-transparent px-3 text-sm text-[#EEF4FF] outline-none focus:border-[#C3D0E8]/70"
          />
        </label>
        <p className="font-mono text-xs text-[#C3D0E8]/55">
          {session.handle ?? 'pending'} · {shortenAddress(session.wallet_address)}
        </p>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center rounded-full bg-[#ffe500] px-4 text-sm text-[#14110e]"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => navigate('/'));
            }}
            className="inline-flex h-10 items-center rounded-full border border-[#C3D0E8]/45 px-4 text-sm text-[#EEF4FF]"
          >
            Disconnect
          </button>
        </div>
      </form>
    </div>
  );
}
