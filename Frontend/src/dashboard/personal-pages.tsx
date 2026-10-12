import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Copy,
  Loader2,
  Shield,
} from 'lucide-react';

import { ExplorerTxLink } from '../components/ExplorerTxLink';
import { useWalletSession } from '../context/WalletContext';
import { DepositPreflightError } from '../lib/deposit-preflight';
import { money } from '../lib/format';
import { ApiError } from '../lib/http';
import { loadNotes, privateBalance } from '../lib/note-book';
import { payUrl, paymentLinksApi, type PaymentLink } from '../lib/payment-links';
import { shortenAddress } from '../lib/phantom';
import {
  addMoney,
  cashOut,
  requirePhantom,
  sendPrivate,
  syncIncomingNotes,
} from '../lib/private-pay';
import { loadShieldKeys } from '../lib/shield-keys';
import { formatUsdcMinor, parseUsdcInput } from '../lib/usdc-amount';
import { useDepositPreflight } from '../lib/use-deposit-preflight';
import { walletApi } from '../lib/wallet';
import { SettingsPage } from '../pages/app/SettingsPage';

const FIELD =
  'mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#4A63BE] focus:ring-4 focus:ring-[#4A63BE]/10';
const PRIMARY =
  'inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#121F46] to-[#4A63BE] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,31,70,0.22)] disabled:opacity-50';
const SECONDARY =
  'inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export function PersonalWallet() {
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
  const handle = session.handle;
  const walletAddress = session.wallet_address;

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
        signTransaction: (unsigned) => phantom.signTransaction(unsigned),
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
    const destHandle = sendTo.trim();
    if (!destHandle) {
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
      const dest = await walletApi.lookupId(destHandle);
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
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
          Private USDC
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-950">Wallet</h1>
        <p className="mt-1 text-sm text-slate-500">
          Send to a Hypertron ID stays in the pool. Add money and cash out are visible on-chain.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#1a2a55] bg-gradient-to-br from-[#0F1939] via-[#121F46] to-[#1a2f6b] p-6 text-white">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/55 uppercase">
            Shielded balance
          </p>
          <p className="mt-4 text-[40px] leading-none font-semibold tracking-tight">
            {money(balance, 'USDC')}
          </p>
          <p className="mt-3 text-sm text-white/60">
            Notes live in this browser. Incoming sends show up after a scan.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Your Hypertron ID
          </p>
          <p className="mt-3 font-mono text-lg font-semibold tracking-tight text-slate-950">
            {handle ?? 'Assigning…'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Share this — not your Phantom address — so someone can pay you privately.
          </p>
          <button
            type="button"
            disabled={!handle}
            onClick={() => {
              if (!handle) return;
              void navigator.clipboard.writeText(handle);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className={`${SECONDARY} mt-4 w-full gap-2`}
          >
            <Copy className="size-4" />
            {copied ? 'Copied' : 'Copy ID'}
          </button>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Move funds
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-900">Amount (USDC)</span>
            <input
              className={FIELD}
              value={amount}
              onChange={(event) => {
                setConfirmDeposit(false);
                setAmount(event.target.value);
              }}
              inputMode="decimal"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {buckets.map((minor) => {
                const label = formatUsdcMinor(BigInt(minor));
                return (
                  <button
                    key={minor}
                    type="button"
                    onClick={() => setAmount(label)}
                    className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:border-[#E7B66D]/50"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-900">Send to Hypertron ID</span>
            <input
              className={`${FIELD} font-mono`}
              value={sendTo}
              onChange={(event) => setSendTo(event.target.value)}
              placeholder="ht_…"
              spellCheck={false}
            />
          </label>
        </div>
        {preflight && !preflight.ok && !checking ? (
          <p role="alert" className="mt-4 text-sm text-rose-700">
            {preflight.error}
          </p>
        ) : null}
        {confirmDeposit && preflight?.ok ? (
          <div className="mt-4 rounded-xl border border-[#E7B66D]/40 bg-[#F8F0E2]/60 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">This deposit is public</p>
            <p className="mt-1 leading-6">
              {preflight.disclosure.amount} from your Phantom wallet will be visible
              on Solana, with the time it confirms. Sends after that stay private.
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className={PRIMARY}
            disabled={Boolean(busy) || checking || Boolean(preflight && !preflight.ok)}
            onClick={() => void onAddMoney()}
          >
            {busy ? busy : confirmDeposit ? 'Confirm public deposit' : 'Add money'}
          </button>
          <button type="button" className={SECONDARY} disabled={Boolean(busy)} onClick={() => void onSend()}>
            Send privately
          </button>
          <button type="button" className={SECONDARY} disabled={Boolean(busy)} onClick={() => void onCashOut()}>
            Cash out
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Cash out lands on {shortenAddress(walletAddress)} with a public amount.
        </p>
        {tx ? <div className="mt-3"><ExplorerTxLink signature={tx} /></div> : null}
      </section>
    </div>
  );
}

export function PersonalRequest() {
  const { session } = useWalletSession();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [amount, setAmount] = useState('1');
  const [purpose, setPurpose] = useState('');
  const buckets = links[0]?.amount_buckets ?? [
    '100000',
    '500000',
    '1000000',
    '5000000',
    '10000000',
  ];

  async function refreshLinks() {
    setLinks(await paymentLinksApi.list());
  }

  useEffect(() => {
    void refreshLinks().catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Could not load requests.'),
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
        purpose: purpose.trim() || 'Payment request',
      });
      setLinks((current) => [created, ...current]);
      await navigator.clipboard.writeText(payUrl(created.id, created.url)).catch(() => undefined);
      setCopied(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this request.');
    } finally {
      setBusy(false);
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
          Peer to peer
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-950">Request</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask someone to pay {session.handle ?? 'your Hypertron ID'}. They pay from their private
          balance — your Phantom address stays off the link.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <form className="rounded-2xl border border-slate-200 bg-white p-5" onSubmit={(event) => void onCreate(event)}>
          <p className="text-sm font-semibold text-slate-900">New request</p>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-slate-500">Amount (USDC)</span>
            <input
              className={FIELD}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {buckets.map((minor) => {
              const dollars = (Number(minor) / 1_000_000).toString();
              return (
                <button
                  key={minor}
                  type="button"
                  onClick={() => setAmount(dollars)}
                  className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600"
                >
                  {dollars}
                </button>
              );
            })}
          </div>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-slate-500">What for</span>
            <input
              className={FIELD}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Dinner, rent share…"
            />
          </label>
          <button className={`${PRIMARY} mt-5 w-full`} disabled={busy} type="submit">
            {busy ? 'Creating…' : 'Create request'}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Open requests</p>
          <div className="mt-4 space-y-2.5">
            {links.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                No requests yet.
              </p>
            ) : (
              links.map((link) => (
                <div key={link.id} className="rounded-xl border border-slate-100 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {link.purpose ?? 'Payment request'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{link.status}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {money(link.amount, link.currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                      onClick={() => {
                        void navigator.clipboard.writeText(payUrl(link.id, link.url));
                        setCopied(link.id);
                      }}
                    >
                      {copied === link.id ? 'Copied' : 'Copy link'}
                    </button>
                    {link.status === 'paid' && (link.tx_signature || link.payment_tx_hash) ? (
                      <ExplorerTxLink
                        signature={link.tx_signature ?? link.payment_tx_hash}
                        cluster={link.cluster}
                      />
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function PersonalActivity() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const notes = loadNotes();
  const held = notes.filter((note) => note.k && BigInt(note.v) > 0n);

  useEffect(() => {
    void paymentLinksApi
      .list()
      .then(setLinks)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
          History
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-950">Activity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Notes you hold privately, and payment requests you created.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Held privately</p>
        {held.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            No shielded notes in this browser yet. Add money or receive a send.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {held.map((note) => (
              <li key={note.commitment} className="flex items-center justify-between gap-3 py-3">
                <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <Shield className="size-4 text-[#E7B66D]" />
                  Note {note.commitment.slice(0, 10)}…
                </span>
                <span className="text-sm font-semibold text-slate-950">{money(note.v, 'USDC')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Requests</p>
        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </p>
        ) : links.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            No requests yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {link.purpose ?? 'Payment request'}
                  </span>
                  <span className="text-xs text-slate-500">{link.status}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-950">
                  {link.status === 'paid' ? <ArrowUpRight className="size-3.5 text-emerald-600" /> : null}
                  {money(link.amount, link.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function PersonalSettings() {
  return (
    <div className="dash-embed">
      <SettingsPage />
    </div>
  );
}

