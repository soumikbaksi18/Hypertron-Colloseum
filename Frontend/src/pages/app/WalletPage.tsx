import { useCallback, useEffect, useState } from 'react';

import { ExplorerTxLink } from '../../components/ExplorerTxLink';
import { useWalletSession } from '../../context/WalletContext';
import { ApiError } from '../../lib/http';
import { money } from '../../lib/format';
import {
  addMoney,
  cashOut,
  privateBalance,
  requirePhantom,
  sendPrivate,
  syncIncomingNotes,
} from '../../lib/private-pay';
import { loadShieldKeys } from '../../lib/shield-keys';
import { walletApi } from '../../lib/wallet';

export function WalletPage() {
  const { session, refresh } = useWalletSession();
  const [balance, setBalance] = useState('0');
  const [buckets, setBuckets] = useState<string[]>(['1000000']);
  const [amount, setAmount] = useState('1');
  const [sendTo, setSendTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const keys = loadShieldKeys();

  const reload = useCallback(async () => {
    if (keys) await syncIncomingNotes(keys);
    setBalance(privateBalance().toString());
  }, [keys]);

  useEffect(() => {
    void reload();
    void walletApi
      .config()
      .then((cfg) => {
        if (cfg.amount_buckets?.length) setBuckets(cfg.amount_buckets);
      })
      .catch(() => undefined);
  }, [reload]);

  if (!session) return null;
  const walletAddress = session.wallet_address;
  const handle = session.handle;

  async function onAddMoney() {
    if (!keys) {
      setError('Import shield keys in Settings, or sign in again on this browser.');
      return;
    }
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy('Waiting for Phantom…');
    setError(null);
    setTx(null);
    try {
      const phantom = requirePhantom();
      const connected = await phantom.connect();
      setBusy('Confirm in Phantom…');
      const result = await addMoney({
        keys,
        payer: connected.publicKey.toBase58(),
        amountMinor: BigInt(Math.round(dollars * 1_000_000)),
        signTransaction: (tx) => phantom.signTransaction(tx),
      });
      setTx(result.txSignature);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Add money failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onSend() {
    if (!keys) {
      setError('Import shield keys in Settings, or sign in again on this browser.');
      return;
    }
    const dollars = Number(amount);
    const handle = sendTo.trim();
    if (!handle) {
      setError('Enter a Hypertron ID (ht_…).');
      return;
    }
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy('Looking up ID…');
    setError(null);
    setTx(null);
    try {
      const dest = await walletApi.lookupId(handle);
      setBusy('Proving a private send…');
      const signature = await sendPrivate({
        keys,
        amountMinor: BigInt(Math.round(dollars * 1_000_000)),
        recipientOwnerPk: dest.owner_pk,
        recipientView: dest.view_pub,
      });
      setTx(signature);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onCashOut() {
    if (!keys) {
      setError('Import shield keys in Settings, or sign in again on this browser.');
      return;
    }
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy('Proving cash out…');
    setError(null);
    setTx(null);
    try {
      const signature = await cashOut({
        keys,
        amountMinor: BigInt(Math.round(dollars * 1_000_000)),
        destination: walletAddress,
      });
      setTx(signature);
      await reload();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Cash out failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Private USDC</h1>
        <p>
          Adding money and cashing out are public. Send is not.
        </p>
      </header>

      {error && (
        <div className="console-alert" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="app-page-grid">
        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Balance</p>
            <span className="figure">{money(balance, 'USDC')}</span>
          </div>
          <div className="panel-body">
            <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: '1.05rem' }}>
              Notes in this browser. Incoming payments appear after a scan.
            </p>
            {!keys && session.owner_pk && (
              <p className="gate-error" style={{ marginTop: '0.75rem' }}>
                Shield keys for this ID live on another device. Import a backup in Settings to spend.
              </p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Your Hypertron ID</p>
          </div>
          <div className="panel-body" style={{ display: 'grid', gap: '0.7rem' }}>
            <p className="mono" style={{ margin: 0, fontSize: '1.1rem' }}>
              {handle ?? 'Assigning…'}
            </p>
            <button
              type="button"
              className="landing-cta-secondary"
              disabled={!handle}
              onClick={() => {
                if (!handle) return;
                void navigator.clipboard.writeText(handle);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="panel-head">
          <p className="eyebrow">Move funds</p>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: '0.9rem' }}>
          <label className="gate-field">
            <span className="eyebrow">Amount (USDC)</span>
            <input
              className="gate-input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {buckets.map((minor) => {
              const dollars = (Number(minor) / 1_000_000).toString();
              return (
                <button
                  key={minor}
                  type="button"
                  className="landing-cta-secondary"
                  style={{ height: '1.9rem', fontSize: '0.85rem' }}
                  onClick={() => setAmount(dollars)}
                >
                  {dollars}
                </button>
              );
            })}
          </div>
          <label className="gate-field">
            <span className="eyebrow">Send to Hypertron ID</span>
            <input
              className="gate-input mono"
              value={sendTo}
              onChange={(event) => setSendTo(event.target.value)}
              placeholder="ht_…"
              spellCheck={false}
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              className="gate-submit"
              disabled={Boolean(busy)}
              onClick={() => void onAddMoney()}
            >
              {busy ? busy : 'Add money'}
            </button>
            <button
              type="button"
              className="landing-cta-secondary"
              disabled={Boolean(busy)}
              onClick={() => void onSend()}
            >
              Send
            </button>
            <button
              type="button"
              className="landing-cta-secondary"
              disabled={Boolean(busy)}
              onClick={() => void onCashOut()}
            >
              Cash out
            </button>
          </div>
          <p style={{ margin: 0, color: 'var(--ink-faint)', fontSize: '0.9rem' }}>
            Cash out lands on {walletAddress.slice(0, 4)}…{walletAddress.slice(-4)} (public amount).
          </p>
          {tx && <ExplorerTxLink signature={tx} />}
        </div>
      </div>
    </div>
  );
}
