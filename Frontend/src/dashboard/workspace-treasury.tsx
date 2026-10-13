import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  ArrowUpFromLine,
  ChevronDown,
  CircleAlert,
  Copy,
  FileText,
  Info,
  LockKeyhole,
  Plus,
  Send,
} from 'lucide-react';

import { ExplorerTxLink } from '../components/ExplorerTxLink';
import { useWalletSession } from '../context/WalletContext';
import { solanaCluster } from '../lib/cluster';
import { DepositPreflightError } from '../lib/deposit-preflight';
import { money } from '../lib/format';
import { ApiError } from '../lib/http';
import { loadNotes } from '../lib/note-book';
import {
  addMoney,
  cashOut,
  privateBalance,
  requirePhantom,
  sendPrivate,
  syncIncomingNotes,
} from '../lib/private-pay';
import { loadShieldKeys } from '../lib/shield-keys';
import { formatUsdcMinor, parseUsdcInput } from '../lib/usdc-amount';
import { useDepositPreflight } from '../lib/use-deposit-preflight';
import { walletApi } from '../lib/wallet';
import { cn } from './cn';

type MoveTab = 'add' | 'send' | 'cashout';

const PRESET_AMOUNTS = ['0.1', '0.5', '1', '5', '10'] as const;

function networkLabel(): string {
  const cluster = solanaCluster();
  if (cluster === 'mainnet') return 'Solana Mainnet';
  if (cluster === 'localnet') return 'Solana Localnet';
  return 'Solana Devnet';
}

export function WorkspaceTreasury() {
  const { session, refresh } = useWalletSession();
  const [balance, setBalance] = useState('0');
  const [buckets, setBuckets] = useState<string[]>([]);
  const [amount, setAmount] = useState('1');
  const [sendTo, setSendTo] = useState('');
  const [tab, setTab] = useState<MoveTab>('add');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [confirmDeposit, setConfirmDeposit] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const keys = loadShieldKeys();

  const { preflight, checking } = useDepositPreflight({
    payer: session?.wallet_address,
    amountInput: amount,
    enabled: tab === 'add',
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

  const presetOptions = useMemo(() => {
    const fromConfig = buckets.map((minor) => formatUsdcMinor(BigInt(minor)));
    const merged = new Set<string>([...PRESET_AMOUNTS, ...fromConfig]);
    return [...merged].sort((a, b) => Number(a) - Number(b));
  }, [buckets]);

  const activityCount = loadNotes().length;
  const poolAttention =
    tab === 'add' && !checking && preflight && !preflight.ok;

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
          'Deposit submitted. It stays pending until the transaction confirms on-chain.',
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

  function onPrimaryAction() {
    if (tab === 'add') void onAddMoney();
    else if (tab === 'send') void onSend();
    else void onCashOut();
  }

  const primaryLabel =
    tab === 'add'
      ? busy
        ? busy
        : confirmDeposit
          ? 'Confirm public deposit'
          : 'Add money with Phantom'
      : tab === 'send'
        ? busy ?? 'Send privately'
        : busy ?? 'Cash out to wallet';

  const primaryDisabled =
    Boolean(busy) ||
    (tab === 'add' && (checking || Boolean(preflight && !preflight.ok)));

  return (
    <div className="dash-treasury flex w-full flex-col gap-4 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="dash-display text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
            Private USDC
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
            Add money and cash out are public. Send is private.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNetworkOpen((open) => !open)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C3D0E8]/35 bg-transparent px-3 text-[11px] font-medium text-white/75 transition hover:border-[#C3D0E8]/55"
          >
            <SolanaMark />
            Network: {networkLabel()}
            <ChevronDown className="size-3.5 text-white/40" />
          </button>
          {networkOpen ? (
            <div className="absolute top-[calc(100%+6px)] right-0 z-20 min-w-[200px] overflow-hidden rounded-xl border border-[#C3D0E8]/35 bg-[#03080b] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
              <p className="px-3.5 py-2 text-sm text-white/80">{networkLabel()}</p>
              <p className="border-t border-[#C3D0E8]/35 px-3.5 py-2 text-xs text-white/45">
                Switch network in your RPC / Phantom settings.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col">
      <div className="flex flex-col lg:flex-row">
        <MetricCard
          label="Private balance"
          value={money(balance, 'USDC')}
          hint={
            <>
              <LockKeyhole className="size-3" strokeWidth={1.8} />
              Stored in this browser
            </>
          }
        />
        <MetricCard
          join
          label="Your Hypertron ID"
          value={handle ?? 'Assigning…'}
          mono
          action={
            <button
              type="button"
              disabled={!handle}
              onClick={() => {
                if (!handle) return;
                void navigator.clipboard.writeText(handle);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#C3D0E8]/35 bg-white/[0.04] px-3 text-[11px] font-medium text-white/70 transition hover:border-white/25 hover:text-white"
            >
              <Copy className="size-3.5" strokeWidth={1.75} />
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          }
        />
      </div>

      <div className="z-10 -mt-px flex flex-col xl:flex-row">
        <section className="ov-card min-w-0 flex-[1.15]">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
            Move funds
          </p>

          <div className="mt-3 inline-flex w-full flex-wrap gap-1 rounded-xl border border-[#C3D0E8]/35 bg-transparent p-1">
            <MoveTabButton
              active={tab === 'add'}
              onClick={() => {
                setTab('add');
                setConfirmDeposit(false);
                setError(null);
              }}
              icon={Plus}
              label="Add money"
            />
            <MoveTabButton
              active={tab === 'send'}
              onClick={() => {
                setTab('send');
                setConfirmDeposit(false);
                setError(null);
              }}
              icon={Send}
              label="Send"
            />
            <MoveTabButton
              active={tab === 'cashout'}
              onClick={() => {
                setTab('cashout');
                setConfirmDeposit(false);
                setError(null);
              }}
              icon={ArrowUpFromLine}
              label="Cash out"
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-[#C3D0E8]/70">
            {tab === 'send'
              ? 'Private. A pool transfer does not publish the amount or who you paid.'
              : tab === 'add'
                ? 'Public. The amount and your Phantom address show on-chain.'
                : 'Public. The amount lands on your Phantom address.'}
          </p>

          <label className="mt-4 block">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[#c9b56a] uppercase">
              Amount (USDC)
            </span>
            <div className="mt-2 flex items-stretch gap-2 rounded-xl border border-[#C3D0E8]/35 bg-transparent p-1.5">
              <input
                value={amount}
                onChange={(event) => {
                  setConfirmDeposit(false);
                  setAmount(event.target.value);
                }}
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[clamp(24px,3.5vw,32px)] font-medium tracking-tight text-white outline-none"
              />
              <div className="flex items-center gap-2 rounded-lg border border-[#C3D0E8]/35 bg-transparent px-3 text-sm font-medium text-white">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2775CA] text-[9px] font-bold text-white">
                  $
                </span>
                USDC
              </div>
            </div>
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {presetOptions.map((preset) => {
              const active = amount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setConfirmDeposit(false);
                    setAmount(preset);
                  }}
                  className={cn(
                    'inline-flex h-8 min-w-[42px] items-center justify-center rounded-lg border px-3 text-[12px] font-medium transition',
                    active
                      ? 'border-[#c9b56a]/70 bg-[#c9b56a]/12 text-[#c9b56a]'
                      : 'border-[#C3D0E8]/35 bg-white/[0.03] text-white/55 hover:border-[#C3D0E8]/55 hover:text-white/80',
                  )}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {tab === 'send' ? (
            <label className="mt-4 block">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-[#c9b56a] uppercase">
                Send to Hypertron ID
              </span>
              <input
                value={sendTo}
                onChange={(event) => setSendTo(event.target.value)}
                placeholder="ht_…"
                spellCheck={false}
                className="mt-2 h-11 w-full rounded-lg border border-[#C3D0E8]/35 bg-transparent px-3 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
              />
            </label>
          ) : null}

          {tab === 'add' && confirmDeposit && preflight?.ok ? (
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              This deposit is public: {preflight.disclosure.amount} from your Phantom wallet,
              with the confirmation time. Sends after that stay private.
            </p>
          ) : null}

          {poolAttention ? (
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-left text-[11px] text-amber-100/90"
            >
              <span className="inline-flex items-center gap-2">
                <CircleAlert className="size-3.5 shrink-0" strokeWidth={1.8} />
                {networkLabel().toLowerCase()} · pool connection needs attention
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-amber-200/60" />
            </button>
          ) : null}

          {tab === 'add' ? (
            <button
              type="button"
              disabled={primaryDisabled}
              onClick={() => void onPrimaryAction()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[#ffe500] px-4 text-[15px] font-semibold text-[#14110e] transition hover:bg-[#fff36a] disabled:opacity-50"
            >
              {confirmDeposit ? (
                primaryLabel
              ) : (
                <>
                  <img
                    src="/media/phantom-ghost.png"
                    alt=""
                    aria-hidden
                    className="size-6 shrink-0 object-contain brightness-0"
                  />
                  {primaryLabel}
                </>
              )}
              <ArrowRight className="size-4" strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              disabled={primaryDisabled}
              onClick={() => void onPrimaryAction()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ffe500] px-4 text-[15px] font-semibold text-[#14110e] transition hover:bg-[#fff36a] disabled:opacity-50"
            >
              {primaryLabel}
              <ArrowRight className="size-4" strokeWidth={2.2} />
            </button>
          )}

          {tx ? (
            <div className="mt-3 text-sm">
              <ExplorerTxLink signature={tx} />
            </div>
          ) : null}

          {!keys && session.owner_pk ? (
            <p className="mt-3 text-xs text-amber-200/80">
              Shield keys for this ID live on another device. Import a backup in Settings to spend.
            </p>
          ) : null}
        </section>

        <div className="z-10 -mt-px flex min-w-0 flex-1 flex-col xl:mt-0 xl:-ml-px">
          <section className="ov-card">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
              How privacy works
            </p>
            <ul className="mt-3 space-y-3">
              <PrivacyRow icon={Plus} title="Add money" detail="Public on-chain" />
              <PrivacyRow icon={Send} title="Send" detail="Private between Hypertron IDs" />
              <PrivacyRow icon={ArrowUpFromLine} title="Cash out" detail="Public on-chain" />
            </ul>
          </section>

          <section className="ov-card z-10 -mt-px">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
              Recent activity
            </p>
            {activityCount === 0 ? (
              <div className="mt-4 rounded-xl border border-[#C3D0E8]/35 bg-transparent px-4 py-8 text-center">
                <FileText className="mx-auto size-8 text-white/25" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium text-white/55">No recent activity</p>
                <p className="mt-1 text-xs text-white/35">Your transfers will appear here.</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/55">
                {activityCount} shielded {activityCount === 1 ? 'note' : 'notes'} in this browser.
              </p>
            )}
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  mono,
  action,
  join = false,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  mono?: boolean;
  action?: ReactNode;
  join?: boolean;
}) {
  return (
    <div className={cn('ov-card relative min-w-0 flex-1', join && 'z-10 -mt-px lg:mt-0 lg:-ml-px')}>
      <Info
        className="absolute top-4 right-4 size-3.5 text-white/25"
        strokeWidth={1.75}
        aria-hidden
      />
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[#c9b56a] uppercase">
        {label}
      </p>
      <p
        className={cn(
          'dash-display mt-2 text-[clamp(1.6rem,2.8vw,2rem)] leading-none text-[#EEF4FF]',
          mono && 'font-mono text-[clamp(18px,2.2vw,22px)]',
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/40">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function MoveTabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Plus;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium transition',
        active
          ? 'bg-white/[0.08] text-[#EEF4FF]'
          : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80',
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
    </button>
  );
}

function PrivacyRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Plus;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-[#C3D0E8]/35 bg-transparent px-3 py-2.5">
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[#C3D0E8]/35 bg-white/[0.04] text-[#8DA4CD]">
        <Icon className="size-3.5" strokeWidth={1.85} />
      </span>
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-white/45">{detail}</span>
      </span>
    </li>
  );
}

function SolanaMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16.5 7.5 13h9L20 16.5M4 12 7.5 8.5h9L20 12M4 7.5 7.5 4h9L20 7.5"
        stroke="url(#solana)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="solana" x1="4" y1="4" x2="20" y2="16.5">
          <stop stopColor="#14F195" />
          <stop offset="1" stopColor="#9945FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
