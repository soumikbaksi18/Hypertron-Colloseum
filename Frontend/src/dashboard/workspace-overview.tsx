import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Link2,
  Loader2,
  MoreHorizontal,
  Percent,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import {
  loadOverviewStats,
  type OverviewStats,
} from '../lib/overview-stats';
import type { WorkspaceView } from '../lib/workspaces';

type PulseMode = 'volume' | 'payments';
type DateRange = '7d' | '30d' | '90d';

const DATE_RANGE_LABEL: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const PULSE_PATH =
  'M0 78 C48 70 72 42 118 48 C164 54 188 88 236 72 C284 56 312 28 360 36 C408 44 436 78 480 58 C524 38 548 22 580 30';

const EMPTY_STATS: OverviewStats = {
  availableBalance: '0 USDC',
  pendingVolume: '0 USDC',
  pendingCount: 0,
  successfulPayments: '0',
  successRate: '99%',
  activeLinks: '0',
  collectingToday: 0,
  collected: '0 USDC',
  collectedDelta: 'No activity',
  nextPayout: '0 USDC',
  nextPayoutStatus: 'Empty',
  nextPayoutHint: 'No shielded notes ready yet.',
  lastPayout: '—',
  destination: '—',
  schedule: 'On demand',
  mix: [{ label: 'USDC', pct: 0, color: '#4A63BE' }],
  funnel: [
    { label: 'Links created', value: 0, pct: 0 },
    { label: 'Payment initiated', value: 0, pct: 0 },
    { label: 'Payment completed', value: 0, pct: 0 },
  ],
  completionPct: '—',
  attention: [],
  recentPayments: [],
  paymentLinks: [],
};

export function WorkspaceOverview({
  workspace,
  onCreatePaymentLink,
  onViewAllPayments,
}: {
  workspace: WorkspaceView;
  onCreatePaymentLink?: () => void;
  onViewAllPayments?: () => void;
}) {
  const { session } = useWalletSession();
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [pulseMode, setPulseMode] = useState<PulseMode>('volume');
  const [stats, setStats] = useState<OverviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const rangeRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await loadOverviewStats(session?.payout_address ?? null));
    } catch {
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [session?.payout_address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!rangeOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rangeRef.current?.contains(event.target as Node)) setRangeOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [rangeOpen]);

  const metrics = useMemo(
    () => [
      {
        label: 'Available Balance',
        value: loading ? '…' : stats.availableBalance,
        caption: 'Ready to withdraw',
        captionClass: 'text-emerald-600',
        icon: Wallet,
        iconClass: 'bg-[#EEF2FF] text-[#4A63BE]',
      },
      {
        label: 'Pending Volume',
        value: loading ? '…' : stats.pendingVolume,
        caption: `${stats.pendingCount} payment${stats.pendingCount === 1 ? '' : 's'} processing`,
        captionClass: 'text-amber-600',
        icon: Clock3,
        iconClass: 'bg-amber-50 text-amber-600',
      },
      {
        label: 'Successful payments',
        value: loading ? '…' : stats.successfulPayments,
        caption: (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
            Settled links
          </span>
        ),
        captionClass: '',
        icon: TrendingUp,
        iconClass: 'bg-emerald-50 text-emerald-600',
      },
      {
        label: 'Success Rate',
        value: stats.successRate,
        caption: 'Healthy performance',
        captionClass: 'text-emerald-600',
        icon: Percent,
        iconClass: 'bg-emerald-50 text-emerald-600',
      },
      {
        label: 'Active payment links',
        value: loading ? '…' : stats.activeLinks,
        caption: `${stats.collectingToday} collecting today`,
        captionClass: 'text-[#4A63BE]',
        icon: Link2,
        iconClass: 'bg-violet-50 text-violet-600',
      },
    ],
    [stats, loading],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A46A] uppercase">
            Payment Overview
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-950">
            {workspace.name} Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything that matters across {workspace.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative" ref={rangeRef}>
            <button
              type="button"
              onClick={() => setRangeOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700"
            >
              {DATE_RANGE_LABEL[dateRange]}
              <ChevronDown className="size-4 text-slate-400" />
            </button>
            {rangeOpen ? (
              <div className="absolute top-[calc(100%+6px)] right-0 z-20 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {(Object.keys(DATE_RANGE_LABEL) as DateRange[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDateRange(key);
                      setRangeOpen(false);
                    }}
                    className={`block w-full px-3.5 py-2 text-left text-sm ${
                      dateRange === key
                        ? 'bg-slate-50 font-medium text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {DATE_RANGE_LABEL[key]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onCreatePaymentLink}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#121F46] to-[#4A63BE] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,31,70,0.22)] transition hover:brightness-110"
          >
            Create Payment Link
            <Plus className="size-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#1a2a55] bg-gradient-to-br from-[#0F1939] via-[#121F46] to-[#1a2f6b] p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/55 uppercase">
                Payment Pulse
              </p>
              <p className="mt-3 text-[13px] text-white/65">Collected this period</p>
              <div className="mt-1 flex items-end gap-3">
                <p className="text-[34px] leading-none font-semibold tracking-tight">
                  {loading ? '…' : stats.collected}
                </p>
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  {loading ? '…' : stats.collectedDelta}
                </span>
              </div>
            </div>
            <div className="inline-flex rounded-full bg-white/10 p-1">
              {(
                [
                  ['volume', 'Volume'],
                  ['payments', 'Payments'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPulseMode(id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    pulseMode === id ? 'bg-white text-[#0F1939]' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative mt-6 h-[140px]">
            <svg viewBox="0 0 580 110" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7BA0FF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#7BA0FF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pulseStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9BB6FF" />
                  <stop offset="100%" stopColor="#E7B66D" />
                </linearGradient>
              </defs>
              <path d={`${PULSE_PATH} L580 110 L0 110 Z`} fill="url(#pulseFill)" />
              <path
                d={PULSE_PATH}
                fill="none"
                stroke="url(#pulseStroke)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="580" cy="30" r="5.5" fill="#E7B66D" />
            </svg>
            <p className="pointer-events-none absolute right-0 bottom-0 text-[10px] tracking-wide text-white/40 uppercase">
              {pulseMode === 'volume' ? 'Volume trend' : 'Payment count trend'}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                Needs Attention
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? '…' : `${stats.attention.length} items`}
              </p>
            </div>
            <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <AlertTriangle className="size-4" strokeWidth={2.2} />
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading workspace pulse…
              </p>
            ) : stats.attention.length === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-3 text-sm text-emerald-800">
                No open alerts for this workspace.
              </div>
            ) : (
              stats.attention.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-3"
                >
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">
              Everything else is on track. Payment rails are operating normally.
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                Recent Payments
              </p>
              <p className="mt-1 text-sm text-slate-500">Latest settlement activity</p>
            </div>
            <button
              type="button"
              onClick={onViewAllPayments}
              className="text-sm font-medium text-[#4A63BE] hover:underline"
            >
              view all →
            </button>
          </div>
          {loading ? (
            <p className="mt-4 flex items-center gap-2 px-1 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading payments…
            </p>
          ) : stats.recentPayments.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-400">
              No payment links yet. Create one to see activity here.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              {stats.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_110px_96px_28px] items-center gap-2 border-b border-slate-100 px-3.5 py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4A63BE] text-[11px] font-semibold text-white">
                      {payment.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{payment.payer}</p>
                      <p className="truncate text-xs text-slate-400">{payment.handle}</p>
                    </div>
                  </div>
                  <span className="truncate text-sm text-slate-500">{payment.purpose}</span>
                  <StatusPill status={payment.status} />
                  <span className="text-right text-sm font-semibold text-slate-900">
                    {payment.amount}
                  </span>
                  <span className="inline-flex size-7 items-center justify-center text-slate-400">
                    <MoreHorizontal className="size-4" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                No-code collection
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">Payment Links</p>
            </div>
            <button
              type="button"
              onClick={onViewAllPayments}
              className="text-sm font-medium text-[#4A63BE] hover:underline"
            >
              Manage →
            </button>
          </div>
          <div className="mt-4 space-y-2.5">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading links…
              </p>
            ) : stats.paymentLinks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-6 text-center text-sm text-slate-400">
                No payment links yet.
              </p>
            ) : (
              stats.paymentLinks.map((link) => (
                <div key={link.id} className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FBF7F0] text-[#C9A46A]">
                        <CreditCard className="size-4" strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{link.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{link.payments}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{link.volume}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onCreatePaymentLink}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#C9B48A] bg-[#FBF7F0] text-sm font-semibold text-[#0F1939] transition hover:bg-[#F6EFE3]"
          >
            <Plus className="size-4 text-[#E7B66D]" strokeWidth={2.4} />
            New payment link
          </button>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Settlement & Payouts
          </p>
          <p className="mt-3 text-sm text-slate-500">Next payout</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="text-[28px] font-semibold tracking-tight text-slate-950">
              {loading ? '…' : stats.nextPayout}
            </p>
            <span className="mb-1 inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              {stats.nextPayoutStatus}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{stats.nextPayoutHint}</p>
          <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
            <Row label="Destination" value={stats.destination} />
            <Row label="Last payout" value={stats.lastPayout} />
            <Row label="Schedule" value={stats.schedule} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Payment Mix
          </p>
          <p className="mt-1 text-sm text-slate-500">Asset distribution</p>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {stats.mix.map((slice) => (
              <div
                key={slice.label}
                style={{ width: `${Math.max(slice.pct, 4)}%`, backgroundColor: slice.color }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {stats.mix.map((slice) => (
              <div key={slice.label} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  {slice.label}
                </span>
                <span className="font-semibold text-slate-900">{slice.pct}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Checkout Completion
          </p>
          <p className="mt-1 text-sm text-slate-500">Customer Journey</p>
          <div className="mt-4 space-y-3.5">
            {stats.funnel.map((step) => (
              <div key={step.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{step.label}</span>
                  <span className="font-semibold text-slate-900">{step.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#121F46] to-[#4A63BE]"
                    style={{ width: `${Math.max(step.pct, 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-emerald-600">{stats.completionPct}</p>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  captionClass,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  caption: ReactNode;
  captionClass?: string;
  icon: typeof Wallet;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 uppercase">{label}</p>
        <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2 text-[26px] leading-none font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <div className={`mt-2 text-xs font-medium ${captionClass}`}>{caption}</div>
    </div>
  );
}

function StatusPill({ status }: { status: 'Settled' | 'Processing' | 'Failed' }) {
  const styles =
    status === 'Settled'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Processing'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-rose-50 text-rose-700';
  const Icon = status === 'Settled' ? CheckCircle2 : status === 'Processing' ? Clock3 : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles}`}>
      <Icon className="size-3" strokeWidth={2.4} />
      {status}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
