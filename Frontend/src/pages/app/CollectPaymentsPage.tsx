import { useEffect, useState, type FormEvent } from 'react';

import { ApiError } from '../../lib/http';
import {
  paymentLinksApi,
  type PaymentLink,
} from '../../lib/payment-links';
import { ExplorerTxLink } from '../../components/ExplorerTxLink';
import { useWalletSession } from '../../context/WalletContext';

export function CollectPaymentsPage() {
  const { session } = useWalletSession();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [amount, setAmount] = useState('120');
  const [purpose, setPurpose] = useState('Invoice');
  const [clientName, setClientName] = useState('');
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawTo, setWithdrawTo] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  async function refresh() {
    const next = await paymentLinksApi.list();
    setLinks(next);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Could not load invoices.'),
    );
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await paymentLinksApi.create({
        amount_minor: Math.round(dollars * 1_000_000),
        currency: 'USDC',
        purpose: purpose.trim() || undefined,
        client_name: clientName.trim() || undefined,
      });
      setLinks((current) => [created, ...current]);
      await navigator.clipboard.writeText(created.url).catch(() => undefined);
      setCopied(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this invoice.');
    } finally {
      setBusy(false);
    }
  }

  function startWithdraw(link: PaymentLink) {
    setError(null);
    setWithdrawId(link.id);
    setWithdrawTo(
      session?.payout_address ||
        session?.wallet_address ||
        link.destination_address,
    );
  }

  async function submitWithdraw(link: PaymentLink) {
    const destination = withdrawTo.trim();
    if (!destination) {
      setError('Enter a Solana address to withdraw to.');
      return;
    }
    setWithdrawing(true);
    setError(null);
    try {
      const next = await paymentLinksApi.withdraw(link.id, { destination });
      setLinks((current) =>
        current.map((row) => (row.id === next.id ? next : row)),
      );
      setWithdrawId(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not withdraw this invoice.',
      );
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Payments</h1>
        <p>
          Create an invoice and send the link. Paid invoices stay in the
          shielded pool until you withdraw to any address.
        </p>
      </header>

      {error && (
        <div className="console-alert" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="app-page-grid">
        <form className="panel" onSubmit={(event) => void onCreate(event)}>
          <div className="panel-head">
            <p className="eyebrow">New invoice</p>
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
            <label className="gate-field">
              <span className="eyebrow">Purpose</span>
              <input
                className="gate-input"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Invoice #1829"
              />
            </label>
            <label className="gate-field">
              <span className="eyebrow">Customer</span>
              <input
                className="gate-input"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Optional"
              />
            </label>
            <button className="gate-submit" disabled={busy} type="submit">
              {busy ? 'Creating…' : 'Create payment link'}
            </button>
          </div>
        </form>

        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Links</p>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {links.length === 0 ? (
              <p style={{ margin: 0, padding: '1rem', color: 'var(--ink-faint)' }}>
                No invoices yet.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {links.map((link) => (
                  <li
                    key={link.id}
                    style={{
                      padding: '0.9rem 1rem',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <strong>{link.purpose ?? 'Invoice'}</strong>
                      <span className="mono" style={{ fontSize: '1rem' }}>
                        {(Number(link.amount) / 1_000_000).toFixed(2)} {link.currency}
                      </span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: 'var(--ink-faint)' }}>
                      {link.client_name ?? 'No customer'} · {link.status}
                      {link.in_pool ? ' · in pool' : ''}
                      {link.payout_tx_signature ? ' · withdrawn' : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <a href={link.url} target="_blank" rel="noreferrer" className="landing-cta-secondary" style={{ height: '2rem', fontSize: '0.95rem' }}>
                        Open
                      </a>
                      {link.status === 'paid' && (link.tx_signature || link.payment_tx_hash) && (
                        <ExplorerTxLink
                          signature={link.tx_signature ?? link.payment_tx_hash}
                        />
                      )}
                      {link.payout_tx_signature && (
                        <ExplorerTxLink signature={link.payout_tx_signature} />
                      )}
                      {link.in_pool && (
                        <button
                          type="button"
                          className="landing-cta-secondary"
                          style={{ height: '2rem', fontSize: '0.95rem' }}
                          onClick={() => startWithdraw(link)}
                        >
                          Withdraw
                        </button>
                      )}
                      <button
                        type="button"
                        className="landing-cta-secondary"
                        style={{ height: '2rem', fontSize: '0.95rem' }}
                        onClick={() => {
                          void navigator.clipboard.writeText(link.url);
                          setCopied(link.id);
                        }}
                      >
                        {copied === link.id ? 'Copied' : 'Copy link'}
                      </button>
                    </div>
                    {withdrawId === link.id && (
                      <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.7rem' }}>
                        <label className="gate-field">
                          <span className="eyebrow">Withdraw to</span>
                          <input
                            className="gate-input mono"
                            value={withdrawTo}
                            onChange={(event) => setWithdrawTo(event.target.value)}
                            spellCheck={false}
                            placeholder="Solana address"
                          />
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="gate-submit"
                            style={{ height: '2.2rem' }}
                            disabled={withdrawing}
                            onClick={() => void submitWithdraw(link)}
                          >
                            {withdrawing ? 'Withdrawing…' : 'Confirm withdraw'}
                          </button>
                          <button
                            type="button"
                            className="landing-cta-secondary"
                            style={{ height: '2.2rem' }}
                            disabled={withdrawing}
                            onClick={() => setWithdrawId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
