import { useState, type FormEvent } from 'react';

import { useWalletSession } from '../../context/WalletContext';
import { ApiError } from '../../lib/http';
import { keygenFromServer } from '../../lib/prover';
import {
  downloadShieldBackup,
  loadShieldKeys,
  parseShieldBackup,
  saveShieldKeys,
} from '../../lib/shield-keys';
import { sessionApi } from '../../lib/session';

export function SettingsPage() {
  const { session, refresh } = useWalletSession();
  const [name, setName] = useState(session?.name ?? '');
  const [payout, setPayout] = useState(session?.payout_address ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const localKeys = loadShieldKeys();

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
            Hypertron ID {session.handle ?? 'pending'} · {session.wallet_address}
          </p>
          {error && <p className="gate-error">{error}</p>}
          {message && <p style={{ margin: 0, color: 'var(--mint)', fontSize: '1rem' }}>{message}</p>}
          <button className="gate-submit" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      <div className="panel" style={{ maxWidth: 520, marginTop: '1.2rem' }}>
        <div className="panel-head">
          <p className="eyebrow">Shield keys</p>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: '0.7rem' }}>
          <p style={{ margin: 0, color: 'var(--ink-faint)', fontSize: '0.95rem' }}>
            Spend and viewing secrets stay in this browser. Only owner_pk and
            view_pub are published to the server. To give someone read-only
            access, use the Auditor tab — never this full backup.
          </p>
          <p className="mono" style={{ margin: 0, fontSize: '0.9rem', wordBreak: 'break-all' }}>
            {localKeys
              ? `owner_pk ${localKeys.ownerPk}`
              : session.owner_pk
                ? `published ${session.owner_pk}`
                : 'No shield keys yet'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="landing-cta-secondary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                void keygenFromServer()
                  .then(async (keys) => {
                    saveShieldKeys({
                      spendSk: keys.spend_sk,
                      viewSecret: keys.view_secret,
                      viewPub: keys.view_pub,
                      ownerPk: keys.owner_pk,
                    });
                    downloadShieldBackup({
                      spendSk: keys.spend_sk,
                      viewSecret: keys.view_secret,
                      viewPub: keys.view_pub,
                      ownerPk: keys.owner_pk,
                    });
                    await sessionApi.updateMe({
                      viewPub: keys.view_pub,
                      ownerPk: keys.owner_pk,
                    });
                    await refresh();
                    setMessage('Shield keys generated. Backup downloaded.');
                  })
                  .catch((err) =>
                    setError(
                      err instanceof ApiError
                        ? err.message
                        : 'Could not generate shield keys.',
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Generate shield keys
            </button>
            {localKeys && (
              <button
                type="button"
                className="landing-cta-secondary"
                onClick={() => downloadShieldBackup(localKeys)}
              >
                Download backup
              </button>
            )}
            <label className="landing-cta-secondary" style={{ height: 'auto', cursor: 'pointer' }}>
              Import backup
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  setBusy(true);
                  setError(null);
                  void file
                    .text()
                    .then(async (text) => {
                      const keys = parseShieldBackup(text);
                      saveShieldKeys(keys);
                      await sessionApi.updateMe({
                        viewPub: keys.viewPub,
                        ownerPk: keys.ownerPk,
                      });
                      await refresh();
                      setMessage('Shield keys imported into this browser.');
                    })
                    .catch((err) =>
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'Could not import that key file.',
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
