import QRCode from 'qrcode';
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  FileText,
  UserRound,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import { ApiError } from '../lib/http';
import { money } from '../lib/format';
import { payUrl, paymentLinksApi, type PaymentLink } from '../lib/payment-links';
import type { WorkspaceView } from '../lib/workspaces';
import { cn } from './cn';

const PRESET_AMOUNTS = ['0.1', '0.5', '1', '5', '10'] as const;

const PURPOSES = ['Invoice', 'Donation', 'Service', 'Other'] as const;

const EXPIRY_OPTIONS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'never', label: 'No expiry' },
] as const;

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
        dark: '#ffe500',
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
    <div className="mx-auto flex size-[104px] items-center justify-center rounded-xl border border-[#c9b56a]/30 bg-[#03080b] p-2 ring-1 ring-[#c9b56a]/15">
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
}: {
  workspace: WorkspaceView;
}) {
  const { session } = useWalletSession();
  const [amount, setAmount] = useState('5');
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>('Invoice');
  const [customer, setCustomer] = useState('');
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]['id']>('30');
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
  const readyLink = createdId ? links.find((item) => item.id === createdId) ?? null : null;
  const readyUrl = readyLink ? payUrl(readyLink.id, readyLink.url) : null;

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
      window.setTimeout(() => setCopied(false), 1500);
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
      <div className="min-w-0">
        <h1 className="dash-display text-[clamp(2.2rem,4vw,3.2rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
          Create Payment Link
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
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

      <div className="flex flex-col">
      <div className="flex flex-col xl:flex-row">
        <form className="flex min-w-0 flex-[1.15] flex-col" onSubmit={(event) => void onCreate(event)}>
          <div className="ov-card">
            <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">Amount</p>
            <label className="block">
              <span className="sr-only">Amount</span>
              <div className="flex items-stretch gap-2 rounded-xl border border-[#C3D0E8]/35 bg-transparent p-1.5">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[clamp(28px,4vw,36px)] font-medium tracking-tight text-white outline-none placeholder:text-white/25"
                  placeholder="0.00"
                />
                <div className="flex items-center rounded-lg border border-[#C3D0E8]/35 px-3 text-sm text-[#C3D0E8]">
                  USDC
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
                        ? 'border-[#c9b56a]/70 bg-[#c9b56a]/12 text-[#c9b56a]'
                        : 'border-[#C3D0E8]/35 bg-white/[0.03] text-white/55 hover:border-[#C3D0E8]/55 hover:text-white/80',
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={cn('ov-card z-10 -mt-px space-y-4', (purposeOpen || expiryOpen) && 'z-30')}>
            <FieldRow label="Purpose">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPurposeOpen((open) => !open)}
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#C3D0E8]/35 bg-transparent px-3 text-left text-sm text-white transition hover:border-[#C3D0E8]/55"
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText className="size-4 text-[#8DA4CD]" strokeWidth={1.75} />
                    {purpose}
                  </span>
                  <ChevronDown className="size-4 text-white/40" />
                </button>
                {purposeOpen ? (
                  <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-xl border border-[#C3D0E8]/35 bg-[#03080b] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
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
                  className="h-11 w-full rounded-lg border border-[#C3D0E8]/35 bg-transparent pr-10 pl-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
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
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#C3D0E8]/35 bg-transparent px-3 text-left text-sm text-white transition hover:border-[#C3D0E8]/55"
                >
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="size-4 text-[#8DA4CD]" strokeWidth={1.75} />
                    {expiryLabel}
                  </span>
                  <ChevronDown className="size-4 text-white/40" />
                </button>
                {expiryOpen ? (
                  <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 overflow-hidden rounded-xl border border-[#C3D0E8]/35 bg-[#03080b] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
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
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ffe500] text-[15px] font-semibold text-[#14110e] transition hover:bg-[#fff36a] disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create Payment Link'}
                <ArrowRight className="size-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </form>

        <aside className="ov-card z-10 -mt-px flex min-w-0 flex-1 flex-col xl:mt-0 xl:-ml-px">
          <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
            {readyUrl ? 'Link ready' : 'Payer sees'}
          </p>
          <p className="mt-3 text-[11px] tracking-[0.14em] text-[#C3D0E8]/55 uppercase">{purpose}</p>
          <p className="dash-display mt-2 text-[clamp(2rem,3vw,2.6rem)] leading-none text-[#EEF4FF]">
            {displayAmount}{' '}
            <span className="text-[1.1rem] text-[#C3D0E8]/55">USDC</span>
          </p>
          <p className="mt-3 text-sm text-[#C3D0E8]/70">
            Paid to {workspace.name}.
            {customer.trim() ? ` For ${customer.trim()}.` : ''}{' '}
            {expiryLabel === 'No expiry' ? 'Does not expire.' : `Expires in ${expiryLabel.toLowerCase()}.`}
          </p>

          {readyUrl ? (
            <div className="mt-5">
              <code className="block break-all rounded-xl border border-[#C3D0E8]/35 px-3 py-3 font-mono text-xs text-[#EEF4FF]">
                {readyUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(readyUrl);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
                className="mt-3 inline-flex h-10 items-center rounded-full border border-[#C3D0E8]/45 px-4 text-sm text-[#EEF4FF] transition hover:border-[#C3D0E8]/70"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <div className="mt-5">
                <PaymentQr url={readyUrl} />
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-[#C3D0E8]/55">
              Create the link to copy a URL. The QR appears after that, and it opens this payment.
            </p>
          )}
        </aside>
      </div>

      {links.length > 0 ? (
        <section className="ov-card z-10 -mt-px overflow-hidden">
          <div className="border-b border-[#C3D0E8]/35 pb-3">
            <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">Recent payment links</p>
          </div>
          <ul className="divide-y divide-[#C3D0E8]/25">
            {links.slice(0, 6).map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
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
                      window.setTimeout(() => setCopied(false), 1500);
                      setCreatedId(link.id);
                    }}
                    className="inline-flex h-8 items-center rounded-lg border border-[#C3D0E8]/35 px-3 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
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
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-semibold tracking-[0.12em] text-[#c9b56a] uppercase">
        {label}
      </span>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}
