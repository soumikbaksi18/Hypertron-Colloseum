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
      <div className="pay pay-empty">
        <p className="pay-error" role="alert">{error}</p>
        <Link to="/" className="pay-back">Back to Hypertron</Link>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="pay pay-empty">
        <p className="pay-kicker">Invoice</p>
        <p className="pay-muted">Loading…</p>
      </div>
    );
  }

  const paid = link.status === 'paid';
  const pool = link.rail === 'pool';
  const funded = BigInt(balance) >= BigInt(link.amount);
  const purpose = link.purpose ?? 'Private invoice';
  const payLabel = busy || signingIn
    ? busyLabel
    : !session
      ? 'Sign in with Phantom'
      : funded
        ? `Pay ${money(link.amount, link.currency)}`
        : 'Add money and pay';

  return (
    <div className="pay">
      <section className="pay-invoice">
        <img src="/media/image2.png" alt="" className="pay-hero" />
        <div className="pay-scrim" aria-hidden />
        <div className="pay-invoice-body">
          <Link to="/" className="pay-brand">
            <img src="/media/logo_white.png" alt="" width={28} height={28} />
            <span>Hypertron</span>
          </Link>
          <p className="pay-kicker">Invoice</p>
          <h1>{link.business_name}</h1>
          <ul className="pay-lines">
            <li>
              <span>
                {purpose}
                {link.client_name ? <small>For {link.client_name}</small> : null}
              </span>
              <span>{money(link.amount, link.currency)}</span>
            </li>
          </ul>
          <div className="pay-total">
            <span>Total due</span>
            <strong>{money(link.amount, link.currency)}</strong>
          </div>
          {link.recipient_handle ? (
            <p className="pay-to">Pays {link.recipient_handle}</p>
          ) : null}
        </div>
      </section>

      <section className="pay-side">
        <div className="pay-card">
          <p className="pay-kicker">{paid ? 'Paid' : pool ? 'Pay privately' : 'Pay with Phantom'}</p>
          <h2>
            {paid
              ? 'This invoice is settled.'
              : pool
                ? 'The amount stays in the pool.'
                : 'Confirm this invoice in Phantom.'}
          </h2>
          <p className="pay-copy">
            {paid
              ? 'You can close this page. The receipt is below.'
              : pool
                ? session
                  ? funded
                    ? 'This pays from your private USDC. The chain does not publish the amount or who you paid.'
                    : 'Phantom will add the shortfall first. That deposit is public. The payment after it is not.'
                  : 'Sign in with Phantom. Payment uses your Hypertron wallet on this browser.'
                : 'Phantom will ask you to sign. The invoice amount is public on this path.'}
          </p>

          {pool && session && !paid ? (
            <div className="pay-balance">
              <span>Private balance</span>
              <strong>{money(balance, 'USDC')}</strong>
            </div>
          ) : null}

          {link.memo ? <p className="pay-copy">Memo: {link.memo}</p> : null}

          {pool && session && !paid && !funded && preflight && !preflight.ok && !checking ? (
            <p className="pay-error" role="alert">{preflight.error}</p>
          ) : null}
          {error ? <p className="pay-error" role="alert">{error}</p> : null}

          {paid ? (
            <div className="pay-receipt">
              <p>Receipt recorded.</p>
              <ExplorerTxLink
                signature={link.payment_tx_hash ?? link.tx_signature}
                cluster={link.cluster}
              />
            </div>
          ) : (
            <button
              type="button"
              className="pay-submit"
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
              {payLabel}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
