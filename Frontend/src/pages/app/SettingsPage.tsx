import { useState, type FormEvent } from 'react';

import { useWalletSession } from '../../context/WalletContext';
import { ApiError } from '../../lib/http';
import { sessionApi } from '../../lib/session';

export function SettingsPage() {
  const { session, refresh } = useWalletSession();
  const [name, setName] = useState(session?.name ?? '');
  const [payout, setPayout] = useState(session?.payout_address ?? '');
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
      await sessionApi.updateMe({
        name: name.trim(),
        payoutAddress: payout.trim(),
      });
      await refresh();
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Settings</h1>
        <p>
          This wallet owns the workspace. Withdraw uses this payout address
          by default; you can send each invoice somewhere else.
        </p>
      </header>

      <form className="panel" style={{ maxWidth: 520 }} onSubmit={(event) => void onSave(event)}>
        <div className="panel-head">
          <p className="eyebrow">Business</p>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: '0.9rem' }}>
          <label className="gate-field">
            <span className="eyebrow">Name</span>
            <input
              className="gate-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="gate-field">
            <span className="eyebrow">Payout address</span>
            <input
              className="gate-input mono"
              value={payout}
              onChange={(event) => setPayout(event.target.value)}
              spellCheck={false}
            />
          </label>
          <p className="mono" style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ink-faint)' }}>
            Signed in as {session.wallet_address}
          </p>
          {error && <p className="gate-error">{error}</p>}
          {message && <p style={{ margin: 0, color: 'var(--mint)', fontSize: '1rem' }}>{message}</p>}
          <button className="gate-submit" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
