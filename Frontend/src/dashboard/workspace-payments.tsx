import QRCode from 'qrcode';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Link2,
  UserRound,
  Vault,
  Wallet,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import { ApiError } from '../lib/http';
import { money } from '../lib/format';
import { payUrl, paymentLinksApi, type PaymentLink } from '../lib/payment-links';
import type { WorkspaceView } from '../lib/workspaces';
import { DashboardUtilities, type DashboardMode } from './chrome';
import { HypertronLogoMark } from './logo-mark';
import { cn } from './cn';

const PRESET_AMOUNTS = ['0.1', '0.5', '1', '5', '10'] as const;

const PURPOSES = ['Invoice', 'Donation', 'Service', 'Other'] as const;

const EXPIRY_OPTIONS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'never', label: 'No expiry' },
] as const;

type SettlementMode = 'vault' | 'wallet';

function formatDisplayAmount(raw: string): string {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return '0.00';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function expiryIso(days: string): string | undefined {
  if (days === 'never') return undefined;
  const end = new Date();
  end.setDate(end.getDate() + Number(days));
  return end.toISOString();
}

function PaymentQr({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 132,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#E7B66D',
        light: '#0b1629',
      },
    })
      .then((next) => {
        if (!cancelled) setDataUrl(next);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="mx-auto flex size-[104px] items-center justify-center rounded-xl border border-[#E7B66D]/30 bg-[#0b1629] p-2 ring-1 ring-[#E7B66D]/15">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Payment link QR code"
          className="size-full rounded-md object-contain"
          draggable={false}
        />
      ) : (
        <span className="text-[10px] text-white/35">Generating…</span>
      )}
    </div>
  );
}

export function WorkspacePayments({
  workspace,
  searchPlaceholder,
  identityTitle,
  onModeChange,
}: {
  workspace: WorkspaceView;
  searchPlaceholder: string;
  identityTitle: string;
  onModeChange?: (mode: DashboardMode) => void;
}) {
  const { session } = useWalletSession();
  const [amount, setAmount] = useState('5');
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>('Invoice');
  const [customer, setCustomer] = useState('');
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]['id']>('30');
  const [settlement, setSettlement] = useState<SettlementMode>('vault');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [purposeOpen, setPurposeOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const next = await paymentLinksApi.list();
    setLinks(next);
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const displayAmount = formatDisplayAmount(amount);
  const amountMinor = Math.round(Number(amount) * 1_000_000);

  const qrPayUrl = useMemo(() => {
    const linked =
      (createdId ? links.find((item) => item.id === createdId) : null) ?? links[0] ?? null;
    if (linked) return payUrl(linked.id, linked.url);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      amount: String(amountMinor),
      purpose,
      workspace: workspace.id,
    });
    return `${origin}/pay/preview?${params.toString()}`;
  }, [amountMinor, createdId, links, purpose, workspace.id]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const created = await paymentLinksApi.create({
        amount_minor: Math.round(dollars * 1_000_000),
        currency: 'USDC',
        purpose: purpose.trim(),
        client_name: customer.trim() || undefined,
        expires_at: expiryIso(expiry),
      });
      setLinks((current) => [created, ...current]);
      setCreatedId(created.id);
      await navigator.clipboard.writeText(payUrl(created.id, created.url)).catch(() => undefined);
      setCopied(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this payment link.');
    } finally {
      setBusy(false);
    }
  }

  if (!session) return null;

  const expiryLabel =
    EXPIRY_OPTIONS.find((option) => option.id === expiry)?.label ?? '30 days';

  return (
    <div className="dash-payments flex w-full flex-col gap-4 pb-4">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <nav className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-white/45">
          <span className="text-white/55">Payments</span>
          <ChevronRight className="size-3 text-white/30" strokeWidth={2} />
          <span className="font-medium text-white/80">Create Link</span>
        </nav>
        <div className="lg:justify-self-end">
          <DashboardUtilities
            searchPlaceholder={searchPlaceholder}
            identityTitle={identityTitle}
            mode="workspaces"
            onModeChange={onModeChange}
            density="regular"
          />
        </div>
      </div>

      <div className="min-w-0">
        <h1 className="text-[clamp(22px,2.6vw,30px)] font-semibold tracking-tight text-white">
          Create Payment Link
        </h1>
        <p className="mt-1.5 text-[13px] text-white/45">
          Get paid to your Hypertron ID. No wallet address needed.
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {createdId ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Payment link created.{copied ? ' Link copied to clipboard.' : ''}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] xl:items-start">
        <form className="space-y-4" onSubmit={(event) => void onCreate(event)}>
          <div className="ov-card p-4 sm:p-5">
            <label className="block">
              <span className="sr-only">Amount</span>
              <div className="flex items-stretch gap-2 rounded-xl border border-white/10 bg-[#0a1426] p-1.5">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[clamp(28px,4vw,36px)] font-medium tracking-tight text-white outline-none placeholder:text-white/25"
                  placeholder="0.00"
                />
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#101c33] px-3 text-sm font-medium text-white">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2775CA] text-[9px] font-bold text-white">
                    $
                  </span>
                  USDC
                  <ChevronDown className="size-3.5 text-white/40" />
                </div>
              </div>
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => {
                const active = amount === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={cn(
                      'inline-flex h-8 min-w-[42px] items-center justify-center rounded-lg border px-3 text-[12px] font-medium transition',
                      active
                        ? 'border-[#E7B66D]/70 bg-[#E7B66D]/12 text-[#F3D28F]'
                        : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/80',
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ov-card divide-y divide-white/10">
            <FieldRow label="Purpose">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPurposeOpen((open) => !open)}
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0a1426] px-3 text-left text-sm text-white transition hover:border-white/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText className="size-4 text-[#8DA4CD]" strokeWidth={1.75} />
                    {purpose}
                  </span>
                  <ChevronDown className="size-4 text-white/40" />
                </button>
                {purposeOpen ? (
                  <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-xl border border-white/10 bg-[#10182e] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    {PURPOSES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setPurpose(option);
                          setPurposeOpen(false);
                        }}
                        className={cn(
                          'block w-full px-3.5 py-2 text-left text-sm transition',
                          purpose === option
                            ? 'bg-white/[0.06] font-medium text-white'
                            : 'text-white/65 hover:bg-white/[0.04]',
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </FieldRow>

            <FieldRow label="Customer (Optional)">
              <div className="relative">
                <input
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                  placeholder="Name, email or Hypertron ID"
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0a1426] pr-10 pl-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                />
                <UserRound
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white/35"
                  strokeWidth={1.75}
                />
              </div>
            </FieldRow>

            <FieldRow label="Expiry">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExpiryOpen((open) => !open)}
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0a1426] px-3 text-left text-sm text-white transition hover:border-white/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="size-4 text-[#8DA4CD]" strokeWidth={1.75} />
                    {expiryLabel}
                  </span>
                  <ChevronDown className="size-4 text-white/40" />
                </button>
                {expiryOpen ? (
                  <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-xl border border-white/10 bg-[#10182e] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                    {EXPIRY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setExpiry(option.id);
                          setExpiryOpen(false);
                        }}
                        className={cn(
                          'block w-full px-3.5 py-2 text-left text-sm transition',
                          expiry === option.id
                            ? 'bg-white/[0.06] font-medium text-white'
                            : 'text-white/65 hover:bg-white/[0.04]',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </FieldRow>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E7B66D] to-[#D4A054] text-[15px] font-semibold text-[#1A1408] shadow-[0_12px_32px_rgba(231,182,109,0.28)] transition hover:from-[#F0C77E] hover:to-[#E7B66D] disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create Payment Link'}
            <ArrowRight className="size-4" strokeWidth={2.2} />
          </button>
        </form>

        <div className="space-y-4">
          <div className="ov-card overflow-hidden p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HypertronLogoMark size={22} tone="plain" />
                <span className="text-[13px] font-semibold text-white">Hypertron</span>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/55">
                Secure · Private
              </span>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#8DA4CD]">
                <FileText className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[11px] font-medium tracking-wide text-white/45 uppercase">
                  {purpose}
                </p>
                <p className="mt-1 text-[clamp(26px,3vw,32px)] font-semibold tracking-tight text-white">
                  {displayAmount}{' '}
                  <span className="text-[18px] font-medium text-white/55">USDC</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#AB9FF2] px-4 shadow-[0_8px_24px_rgba(171,159,242,0.35)]"
            >
              <img
                src="/media/phantom-ghost.png"
                alt=""
                aria-hidden
                className="size-7 shrink-0 object-contain"
                draggable={false}
              />
              <span className="text-[15px] font-semibold tracking-tight text-[#1B1340]">
                Pay with Phantom
              </span>
            </button>

            <p className="mt-4 text-center text-[11px] text-white/35">or scan</p>
            <div className="mt-2 flex justify-center">
              <PaymentQr url={qrPayUrl} />
            </div>
          </div>

          <div className="ov-card p-1.5">
            <SettlementOption
              active={settlement === 'vault'}
              onSelect={() => setSettlement('vault')}
              icon={Vault}
              title="Hypertron Vault (Private)"
              description="Keeps sender private in the pool."
            />
            <SettlementOption
              active={settlement === 'wallet'}
              onSelect={() => setSettlement('wallet')}
              icon={Wallet}
              title="Direct to Wallet (Public)"
              description="Visible on-chain."
            />
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="ov-card flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-white/70 transition hover:text-white"
          >
            Advanced Options
            <ChevronDown
              className={cn('size-4 text-white/40 transition', advancedOpen && 'rotate-180')}
            />
          </button>
          {advancedOpen ? (
            <div className="ov-card space-y-3 px-4 py-4 text-sm text-white/55">
              <p>
                Settlement preview:{' '}
                <span className="text-white/80">
                  {settlement === 'vault' ? 'Shielded pool credit' : 'Public wallet deposit'}
                </span>
              </p>
              <p>
                Expires: <span className="text-white/80">{expiryLabel}</span>
              </p>
              <p className="font-mono text-xs text-white/40">
                Preview amount: {Number.isFinite(amountMinor) ? money(String(amountMinor)) : '—'}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {links.length > 0 ? (
        <section className="ov-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
              Recent payment links
            </p>
            <Link2 className="size-4 text-white/35" strokeWidth={1.75} />
          </div>
          <ul className="divide-y divide-white/10">
            {links.slice(0, 6).map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {link.purpose ?? 'Payment link'}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {link.client_name ?? 'No customer'} · {link.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{money(link.amount, link.currency)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(payUrl(link.id, link.url));
                      setCopied(true);
                      setCreatedId(link.id);
                    }}
                    className="inline-flex h-8 items-center rounded-lg border border-white/10 px-3 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
                  >
                    Copy link
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 px-4 py-3.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center sm:gap-4">
      <span className="text-[10px] font-semibold tracking-[0.12em] text-white/40 uppercase">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SettlementOption({
  active,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onSelect: () => void;
  icon: typeof Vault;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition',
        active
          ? 'border border-[#E7B66D]/55 bg-[#E7B66D]/[0.07] shadow-[inset_0_0_0_1px_rgba(231,182,109,0.12)]'
          : 'border border-transparent hover:bg-white/[0.03]',
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border',
          active
            ? 'border-[#E7B66D]/40 bg-[#E7B66D]/15 text-[#F3D28F]'
            : 'border-white/10 bg-white/[0.03] text-[#8DA4CD]',
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-white/45">{description}</span>
      </span>
      <span
        className={cn(
          'mt-2 size-4 shrink-0 rounded-full border',
          active ? 'border-[#E7B66D] bg-[#E7B66D]' : 'border-white/25 bg-transparent',
        )}
        aria-hidden
      />
    </button>
  );
}
