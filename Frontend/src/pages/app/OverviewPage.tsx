import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../lib/http';
import { paymentLinksApi, type PaymentLink } from '../../lib/payment-links';
import { useWalletSession } from '../../context/WalletContext';
import { money } from '../../lib/format';

export function OverviewPage() {
  const { session } = useWalletSession();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void paymentLinksApi
      .list()
      .then(setLinks)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load invoices.'),
      );
  }, []);

  if (!session) return null;

  const pending = links.filter((link) => link.status === 'pending').length;
  const paid = links.filter((link) => link.status === 'paid').length;
  const collected = links
    .filter((link) => link.status === 'paid')
    .reduce((sum, link) => sum + Number(link.amount), 0);

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Overview</h1>
        <p>
          Collect with invoices first. Agents and API keys live in the other
          tabs when you need them.
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
            <p className="eyebrow">Open invoices</p>
            <span className="figure">{pending}</span>
          </div>
          <div className="panel-body">
            <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: '1.05rem' }}>
              Waiting on a customer to open the payment page.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Paid</p>
            <span className="figure">{paid}</span>
          </div>
          <div className="panel-body">
            <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: '1.05rem' }}>
              {money(String(collected), 'USDC')} confirmed on links.
            </p>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <p className="eyebrow">Payout</p>
          </div>
          <div className="panel-body">
            <p className="mono" style={{ margin: 0, fontSize: '1rem', wordBreak: 'break-all' }}>
              {session.payout_address ?? 'Set an address in Settings'}
            </p>
          </div>
        </div>
      </div>

      <div className="landing-cta-row">
        <Link to="/app/payments" className="landing-cta-primary">
          Create invoice
        </Link>
        <Link to="/app/developers" className="landing-cta-secondary">
          Issue an API key
        </Link>
      </div>
    </div>
  );
}
