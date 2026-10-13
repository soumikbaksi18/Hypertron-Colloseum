import { useCallback, useEffect, useState } from 'react';
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
import { paymentLinksApi, type PaymentLink } from '../lib/payment-links';
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
import { cn } from './cn';

type MoveMode = 'add' | 'send' | 'cashout';

const MOVE_MODES: { id: MoveMode; label: string; detail: string }[] = [
  {
    id: 'add',
    label: 'Add money',
    detail: 'Public. The amount and your Phantom address show on-chain.',
  },
  {
    id: 'send',
    label: 'Send',
    detail: 'Private. A pool transfer does not publish the amount or who you paid.',
  },
  {
    id: 'cashout',
    label: 'Cash out',
    detail: 'Public. The amount lands on your Phantom address.',
  },
];

const FIELD =
  'mt-2 h-12 w-full rounded-xl border border-[#C3D0E8]/35 bg-transparent px-4 text-sm text-[#EEF4FF] outline-none transition placeholder:text-[#C3D0E8]/40 focus:border-[#C3D0E8]/70';
const PRIMARY =
  'inline-flex h-11 items-center justify-center rounded-full bg-[#ffe500] px-5 text-sm font-medium text-[#14110e] disabled:opacity-50';

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
  const [move, setMove] = useState<MoveMode>('add');
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

  const moveMeta = MOVE_MODES.find((item) => item.id === move) ?? MOVE_MODES[0];
  const primaryLabel = busy
    ? busy
    : move === 'add'
      ? confirmDeposit
        ? 'Confirm public deposit'
        : 'Add money'
      : move === 'send'
        ? 'Send privately'
        : 'Cash out';
  const primaryDisabled =
    Boolean(busy) || (move === 'add' && (checking || Boolean(preflight && !preflight.ok)));

  function selectMove(next: MoveMode) {
    setMove(next);
    setConfirmDeposit(false);
    setError(null);
  }

  function onPrimary() {
    if (move === 'add') void onAddMoney();
    else if (move === 'send') void onSend();
    else void onCashOut();
  }

  return (
    <div className="flex w-full flex-col pb-6">
      <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">Private USDC</p>
      <h1 className="dash-display mt-3 text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
        Wallet
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
        Pick one move. Send stays private. Adding money and cashing out are public.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col">
        <div className="flex flex-col lg:flex-row">
          <section className="ov-card min-w-0 flex-[1.2]">
            <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">Shielded balance</p>
            <p className="dash-display mt-4 text-[clamp(2.4rem,4vw,3.2rem)] leading-none text-[#EEF4FF]">
              {money(balance, 'USDC')}
            </p>
            <p className="mt-3 text-sm text-[#C3D0E8]/55">
              Notes live in this browser. Incoming sends show up after a scan.
            </p>
          </section>

          <section className="ov-card z-10 -mt-px min-w-0 flex-1 lg:mt-0 lg:-ml-px">
            <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">Your Hypertron ID</p>
            <div className="mt-4 flex items-center gap-3">
              <p className="dash-display min-w-0 truncate font-mono text-[1.6rem] leading-none text-[#EEF4FF]">
                {handle ?? 'Assigning…'}
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
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#C3D0E8]/45 px-3 text-xs text-[#C3D0E8] transition hover:border-[#C3D0E8]/70 hover:text-[#EEF4FF] disabled:opacity-40"
              >
                <Copy className="size-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#C3D0E8]/55">
              Share this ID, not your Phantom address, so someone can pay you privately.
            </p>
          </section>
        </div>

        <section className="ov-card z-10 -mt-px">
          <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">Move funds</p>
          <div className="mt-4 inline-flex w-full flex-wrap gap-1 rounded-xl border border-[#C3D0E8]/35 p-1 sm:w-auto">
            {MOVE_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={move === item.id}
                onClick={() => selectMove(item.id)}
                className={cn(
                  'h-9 flex-1 rounded-lg px-4 text-sm transition sm:flex-none',
                  move === item.id
                    ? 'bg-white/[0.08] text-[#EEF4FF]'
                    : 'text-[#C3D0E8]/60 hover:text-[#EEF4FF]',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[#C3D0E8]/70">{moveMeta.detail}</p>

          <label className="mt-5 block max-w-md">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[#c9b56a] uppercase">
              Amount (USDC)
            </span>
            <input
              className={`${FIELD} text-[clamp(1.25rem,2vw,1.6rem)] font-medium tracking-tight`}
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
                const active = amount === label;
                return (
                  <button
                    key={minor}
                    type="button"
                    onClick={() => {
                      setConfirmDeposit(false);
                      setAmount(label);
                    }}
                    className={cn(
                      'h-8 rounded-lg border px-2.5 text-xs transition',
                      active
                        ? 'border-[#c9b56a]/70 bg-[#c9b56a]/12 text-[#c9b56a]'
                        : 'border-[#C3D0E8]/35 text-[#C3D0E8] hover:border-[#C3D0E8]/70',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </label>

          {move === 'send' ? (
            <label className="mt-4 block max-w-md">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-[#c9b56a] uppercase">
                Send to Hypertron ID
              </span>
              <input
                className={`${FIELD} font-mono`}
                value={sendTo}
                onChange={(event) => setSendTo(event.target.value)}
                placeholder="ht_…"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
          ) : null}

          {move === 'cashout' ? (
            <p className="mt-4 text-sm text-[#C3D0E8]/70">
              Lands on {shortenAddress(walletAddress)}.
            </p>
          ) : null}

          {move === 'add' && preflight && !preflight.ok && !checking ? (
            <p role="alert" className="mt-4 text-sm text-rose-200">
              {preflight.error}
            </p>
          ) : null}
          {move === 'add' && confirmDeposit && preflight?.ok ? (
            <div className="mt-4 max-w-lg rounded-xl border border-[#c9b56a]/35 bg-[#c9b56a]/10 px-4 py-3 text-sm text-[#C3D0E8]">
              <p className="text-[#EEF4FF]">This deposit is public</p>
              <p className="mt-1 leading-6">
                {preflight.disclosure.amount} from your Phantom wallet will be visible on Solana,
                with the time it confirms. Sends after that stay private.
              </p>
            </div>
          ) : null}

          {!keys ? (
            <p className="mt-4 text-sm text-[#c9b56a]">
              Shield keys for this ID live on another device. Import a backup in Settings to spend.
            </p>
          ) : null}

          <button
            type="button"
            className={`${PRIMARY} mt-5`}
            disabled={primaryDisabled}
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
          {tx ? (
            <div className="mt-3">
              <ExplorerTxLink signature={tx} />
            </div>
          ) : null}
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
        <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
          History
        </p>
        <h1 className="dash-display mt-3 text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">Activity</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
          Notes you hold privately, and payment requests you created.
        </p>
      </div>

      <section className="rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] p-8">
        <p className="text-sm text-[#EEF4FF]">Held privately</p>
        {held.length === 0 ? (
          <p className="mt-4 rounded-[1.35rem] border border-dashed border-[#C3D0E8]/35 px-4 py-8 text-center text-sm text-[#C3D0E8]/55">
            No shielded notes in this browser yet. Add money or receive a send.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#C3D0E8]/25">
            {held.map((note) => (
              <li key={note.commitment} className="flex items-center justify-between gap-3 py-3">
                <span className="inline-flex items-center gap-2 text-sm text-[#C3D0E8]">
                  <Shield className="size-4 text-[#c9b56a]" />
                  Note {note.commitment.slice(0, 10)}…
                </span>
                <span className="dash-display text-[1.35rem] text-[#EEF4FF]">{money(note.v, 'USDC')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[1.35rem] border border-[#C3D0E8]/45 bg-[#03080b] p-8">
        <p className="text-sm text-[#EEF4FF]">Requests</p>
        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[#C3D0E8]/55">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </p>
        ) : links.length === 0 ? (
          <p className="mt-4 rounded-[1.35rem] border border-dashed border-[#C3D0E8]/35 px-4 py-8 text-center text-sm text-[#C3D0E8]/55">
            No requests yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#C3D0E8]/25">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-[#EEF4FF]">
                    {link.purpose ?? 'Payment request'}
                  </span>
                  <span className="text-xs text-[#C3D0E8]/55">{link.status}</span>
                </span>
                <span className="inline-flex items-center gap-1 dash-display text-[1.35rem] text-[#EEF4FF]">
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

