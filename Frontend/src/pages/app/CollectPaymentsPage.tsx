import { useEffect, useState, type FormEvent } from 'react';

import { ApiError } from '../../lib/http';
import { paymentLinksApi, type PaymentLink } from '../../lib/payment-links';
import { ExplorerTxLink } from '../../components/ExplorerTxLink';
import { useWalletSession } from '../../context/WalletContext';
import { money } from '../../lib/format';

export function CollectPaymentsPage() {
  const { session } = useWalletSession();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [amount, setAmount] = useState('1');
  const [purpose, setPurpose] = useState('Invoice');
  const [clientName, setClientName] = useState('');
  const buckets = links[0]?.amount_buckets ?? [
    '100000',
    '500000',
    '1000000',
    '5000000',
    '10000000',
  ];

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

  if (!session) return null;

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Invoices</h1>
        <p>
          Request payment to your Hypertron ID ({session.handle ?? '…'}). The
          payer sends from their private balance — no Phantom address on the
          invoice.
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
              {busy ? 'Creating…' : 'Create invoice'}
            </button>
          </div>
        </form>

        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Incoming</p>
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
                        {money(link.amount, link.currency)}
                      </span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: 'var(--ink-faint)' }}>
                      {link.client_name ?? 'No customer'} · {link.status}
                      {link.in_pool ? ' · note received' : ''}
                      {link.recipient_handle ? ` · ${link.recipient_handle}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="landing-cta-secondary"
                        style={{ height: '2rem', fontSize: '0.95rem' }}
                      >
                        Open
                      </a>
                      {link.status === 'paid' && (link.tx_signature || link.payment_tx_hash) && (
                        <ExplorerTxLink
                          signature={link.tx_signature ?? link.payment_tx_hash}
                          cluster={link.cluster}
                        />
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
