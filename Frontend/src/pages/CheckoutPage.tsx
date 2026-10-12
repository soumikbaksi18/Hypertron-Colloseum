import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ExplorerTxLink } from '../components/ExplorerTxLink';
import { useWalletSession } from '../context/WalletContext';
import { phantomClusterError } from '../lib/cluster';
import { DepositPreflightError } from '../lib/deposit-preflight';
import { money } from '../lib/format';
import { ApiError } from '../lib/http';
import { paymentLinksApi, type PaymentLink } from '../lib/payment-links';
import {
  addMoney,
  privateBalance,
  requirePhantom,
  sendPrivate,
  syncIncomingNotes,
} from '../lib/private-pay';
import { loadShieldKeys } from '../lib/shield-keys';
import { useDepositPreflight } from '../lib/use-deposit-preflight';
import './CheckoutPage.css';

export function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const { session, signIn, signingIn, refresh } = useWalletSession();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Waiting for Phantom…');
  const [balance, setBalance] = useState('0');
  const keys = loadShieldKeys();
  const invoiceMinor = link ? BigInt(link.amount) : 0n;
  const privateAvail = BigInt(balance);
  const shortfall = invoiceMinor > privateAvail ? invoiceMinor - privateAvail : 0n;
  const { preflight, checking } = useDepositPreflight({
    payer: session?.wallet_address,
    amountMinor: shortfall,
    enabled: Boolean(session && link && shortfall > 0n && link.status !== 'paid'),
  });

  useEffect(() => {
    if (!id) return;
    void paymentLinksApi
      .getPublic(id)
      .then(setLink)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Invoice not found.'),
      );
  }, [id]);

  useEffect(() => {
    if (!keys) {
      setBalance('0');
      return;
    }
    void syncIncomingNotes(keys)
      .then(() => setBalance(privateBalance().toString()))
      .catch(() => setBalance(privateBalance().toString()));
  }, [keys, session?.owner_pk]);

  async function pay() {
    if (!id || !link) return;
    if (!session) {
      await signIn();
      await refresh();
      return;
    }
    if (!keys) {
      setError('Import shield keys in Settings, or sign in again on this browser.');
      return;
    }
    if (!link.owner_pk || !link.view_pub) {
      setError('This invoice has no Hypertron payee keys yet.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const phantom = requirePhantom();
      const connected = await phantom.connect();
      const need = BigInt(link.amount);
      let available = privateBalance();
      if (available < need) {
        setBusyLabel('Checking wallet…');
        await addMoney({
          keys,
          payer: connected.publicKey.toBase58(),
          expectedPayer: session.wallet_address,
          amountMinor: need - available,
          signTransaction: (tx) => phantom.signTransaction(tx),
        });
        available = privateBalance();
      }
      if (available < need) {
        throw new Error('Private balance is still short after adding money.');
      }
      setBusyLabel('Paying privately…');
      const signature = await sendPrivate({
        keys,
        amountMinor: need,
        recipientOwnerPk: link.owner_pk,
        recipientView: link.view_pub,
        paymentLinkId: id,
      });
      const next = await paymentLinksApi.confirm(id, {
        tx_signature: signature,
        payer_pubkey: connected.publicKey.toBase58(),
      });
      setLink(next);
      setBalance(privateBalance().toString());
    } catch (err) {
      const fallback =
        err instanceof DepositPreflightError || err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Payment was not completed.';
      const looksLikeWrongCluster =
        /simulat|blockhash|network|0x1|not been approved/i.test(fallback);
      setError(looksLikeWrongCluster ? phantomClusterError() : fallback);
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
  const funded = BigInt(balance) >= BigInt(link.amount);

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
        {link.recipient_handle && (
          <p className="mono" style={{ color: 'var(--ink-faint)' }}>
            To {link.recipient_handle}
          </p>
        )}
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
                ? session
                  ? funded
                    ? 'Pay from your private USDC. The amount stays in the pool.'
                    : 'Add money from Phantom, then pay. Adding money is public; the payment is not.'
                  : 'Sign in with Phantom to pay from your Hypertron wallet.'
                : 'Sign with Phantom to confirm this invoice.'}
          </p>
          {pool && session && !paid && (
            <p className="mono" style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ink-faint)' }}>
              Private balance {money(balance, 'USDC')}
            </p>
          )}
          {pool && session && !paid && !funded && preflight && !preflight.ok && !checking ? (
            <p className="gate-error" role="alert">
              {preflight.error}
            </p>
          ) : null}
          {link.memo && <p style={{ margin: 0 }}>Memo: {link.memo}</p>}
          {error && <p className="gate-error">{error}</p>}
          {paid ? (
            <>
              <p style={{ margin: 0, color: 'var(--mint)' }}>Receipt recorded.</p>
              <ExplorerTxLink
                signature={link.payment_tx_hash ?? link.tx_signature}
                cluster={link.cluster}
              />
            </>
          ) : (
            <button
              type="button"
              className="gate-submit"
              disabled={
                busy ||
                signingIn ||
                Boolean(
                  pool &&
                    session &&
                    !funded &&
                    (checking || (preflight && !preflight.ok)),
                )
              }
              onClick={() => void pay()}
            >
              {busy || signingIn
                ? busyLabel
                : !session
                  ? 'Sign in to pay'
                  : funded
                    ? 'Pay'
                    : 'Add money and pay'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
