import { useCallback, useEffect, useState } from 'react';

import { ExplorerTxLink } from '../../components/ExplorerTxLink';
import { useWalletSession } from '../../context/WalletContext';
import { DepositPreflightError } from '../../lib/deposit-preflight';
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
import { formatUsdcMinor, parseUsdcInput } from '../../lib/usdc-amount';
import { useDepositPreflight } from '../../lib/use-deposit-preflight';
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
  const [confirmDeposit, setConfirmDeposit] = useState(false);
  const keys = loadShieldKeys();
  const { preflight, checking } = useDepositPreflight({
    payer: session?.wallet_address,
    amountInput: amount,
  });

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
    const parsed = parseUsdcInput(amount);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (!confirmDeposit) {
      setConfirmDeposit(true);
      setError(null);
      return;
    }
    setBusy('Checking wallet…');
    setError(null);
    setTx(null);
    setConfirmDeposit(false);
    try {
      const phantom = requirePhantom();
      const connected = await phantom.connect();
      setBusy('Confirm in Phantom…');
      const result = await addMoney({
        keys,
        payer: connected.publicKey.toBase58(),
        expectedPayer: walletAddress,
        amountMinor: parsed.minor,
        signTransaction: (tx) => phantom.signTransaction(tx),
      });
      setTx(result.txSignature);
      if (!result.note) {
        setError(
          'Deposit submitted. It stays pending until the transaction confirms on-chain. Recovery material is saved in this browser.',
        );
      }
      await reload();
    } catch (err) {
      setError(
        err instanceof DepositPreflightError || err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Add money failed.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function onSend() {
    if (!keys) {
      setError('Import shield keys in Settings, or sign in again on this browser.');
      return;
    }
    const parsed = parseUsdcInput(amount);
    const handle = sendTo.trim();
    if (!handle) {
      setError('Enter a Hypertron ID (ht_…).');
      return;
    }
    if (!parsed.ok) {
      setError(parsed.error);
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
        amountMinor: parsed.minor,
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
    const parsed = parseUsdcInput(amount);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy('Proving cash out…');
    setError(null);
    setTx(null);
    try {
      const signature = await cashOut({
        keys,
        amountMinor: parsed.minor,
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
              onChange={(event) => {
                setConfirmDeposit(false);
                setAmount(event.target.value);
              }}
              inputMode="decimal"
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {buckets.map((minor) => {
              const label = formatUsdcMinor(BigInt(minor));
              return (
                <button
                  key={minor}
                  type="button"
                  className="landing-cta-secondary"
                  style={{ height: '1.9rem', fontSize: '0.85rem' }}
                  onClick={() => setAmount(label)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {preflight && !preflight.ok && !checking ? (
            <p className="gate-error" role="alert">
              {preflight.error}
            </p>
          ) : null}
          {confirmDeposit && preflight?.ok ? (
            <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: '0.95rem' }}>
              This deposit is public: {preflight.disclosure.amount} from your
              Phantom wallet, with the confirmation time. Sends after that stay private.
            </p>
          ) : null}
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
              disabled={Boolean(busy) || checking || Boolean(preflight && !preflight.ok)}
              onClick={() => void onAddMoney()}
            >
              {busy ? busy : confirmDeposit ? 'Confirm public deposit' : 'Add money'}
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
