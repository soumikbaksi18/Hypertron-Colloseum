import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Transaction } from '@solana/web3.js';

import { ApiError } from '../lib/http';
import { money } from '../lib/format';
import { paymentLinksApi, type PaymentLink } from '../lib/payment-links';
import { bytesToBase64, getPhantom, shortenAddress } from '../lib/phantom';
import { ExplorerTxLink } from '../components/ExplorerTxLink';
import './CheckoutPage.css';

export function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Waiting for Phantom…');

  useEffect(() => {
    if (!id) return;
    void paymentLinksApi
      .getPublic(id)
      .then(setLink)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Invoice not found.'),
      );
  }, [id]);

  async function pay() {
    if (!id || !link) return;
    const phantom = getPhantom();
    if (!phantom) {
      window.open('https://phantom.app/', '_blank', 'noopener,noreferrer');
      setError('Install Phantom to pay this invoice.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const connected = await phantom.connect();
      const payer = connected.publicKey.toBase58();

      if (link.rail === 'pool') {
        setBusyLabel('Proving a shielded deposit…');
        const prepared = await paymentLinksApi.prepareShield(id, payer);
        const raw = Uint8Array.from(
          atob(prepared.transaction),
          (ch) => ch.charCodeAt(0),
        );
        const tx = Transaction.from(raw);
        setBusyLabel('Confirm in Phantom…');
        const signed = await phantom.signTransaction(tx);
        setBusyLabel('Landing on localnet…');
        const serialized = signed.serialize();
        const bytes =
          serialized instanceof Uint8Array
            ? serialized
            : Uint8Array.from(serialized);
        const next = await paymentLinksApi.broadcast(id, {
          signed_transaction: bytesToBase64(bytes),
          payer_pubkey: payer,
        });
        setLink(next);
        return;
      }

      const message = [
        'Hypertron payment',
        `Invoice: ${link.id}`,
        `Amount: ${money(link.amount, link.currency)}`,
        `To: ${link.destination_address}`,
      ].join('\n');
      const signed = await phantom.signMessage(
        new TextEncoder().encode(message),
        'utf8',
      );
      const signatureBytes =
        signed instanceof Uint8Array ? signed : signed.signature;
      const next = await paymentLinksApi.confirm(id, {
        tx_signature: bytesToBase64(signatureBytes),
        payer_pubkey: payer,
      });
      setLink(next);
    } catch (err) {
      const fallback =
        err instanceof ApiError ? err.message : 'Payment was not completed.';
      const looksLikeWrongCluster =
        /simulat|blockhash|network|0x1|not been approved/i.test(fallback);
      setError(
        link.rail === 'pool' && looksLikeWrongCluster
          ? 'Phantom simulated this on the wrong cluster. Switch it to Localhost (http://127.0.0.1:8899), then Shield and pay again. If it still warns, confirm anyway — we submit the signed deposit to localnet.'
          : fallback,
      );
    } finally {
      setBusy(false);
      setBusyLabel('Waiting for Phantom…');
    }
  }

  if (error && !link) {
    return (
      <div className="checkout">
        <p className="gate-error">{error}</p>
        <Link to="/">Back to Hypertron</Link>
      </div>
    );
  }

  if (!link) {
    return <div className="boot" />;
  }

  const paid = link.status === 'paid';
  const pool = link.rail === 'pool';

  return (
    <div className="checkout">
      <div className="checkout-brand">
        <Link to="/" className="landing-brand">
          <img src="/media/logo_white.png" alt="" width={28} height={28} />
          <span>Hypertron</span>
        </Link>
        <p className="landing-eyebrow">Paying</p>
        <h1>{link.business_name}</h1>
        <p>{link.purpose ?? 'Private invoice'}</p>
        <p className="checkout-amount">{money(link.amount, link.currency)}</p>
        {link.client_name && <p>For {link.client_name}</p>}
      </div>

      <div className="checkout-main panel">
        <div className="panel-head">
          <p className="eyebrow">
            {paid ? 'Paid' : pool ? 'Pay privately' : 'Pay with Phantom'}
          </p>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: '0.9rem' }}>
          <p style={{ margin: 0, color: 'var(--ink-dim)' }}>
            {paid
              ? 'This invoice is settled. You can close this page.'
              : pool
                ? 'Switch Phantom to Localhost (http://127.0.0.1:8899). A red mainnet simulation warning is expected — confirm anyway; we land the signed deposit on localnet. The merchant withdraws from the pool to any address.'
                : 'Sign with Phantom to confirm. Funds settle to the merchant payout address.'}
          </p>
          <p
            className="mono"
            style={{
              margin: 0,
              fontSize: '0.95rem',
              color: 'var(--ink-faint)',
              wordBreak: 'break-all',
            }}
          >
            {shortenAddress(link.destination_address, 6)}
          </p>
          {link.memo && <p style={{ margin: 0 }}>Memo: {link.memo}</p>}
          {error && <p className="gate-error">{error}</p>}
          {paid ? (
            <>
              <p style={{ margin: 0, color: 'var(--mint)' }}>Receipt recorded.</p>
              <ExplorerTxLink
                signature={link.payment_tx_hash ?? link.tx_signature}
              />
            </>
          ) : (
            <button
              type="button"
              className="gate-submit"
              disabled={busy}
              onClick={() => void pay()}
            >
              {busy ? busyLabel : pool ? 'Shield and pay' : 'Pay with Phantom'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
