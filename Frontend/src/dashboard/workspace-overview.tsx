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
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Link2,
  LockKeyhole,
  Loader2,
  Maximize2,
  Percent,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { useWalletSession } from '../context/WalletContext';
import {
  loadOverviewStats,
  type OverviewStats,
} from '../lib/overview-stats';
import type { WorkspaceView } from '../lib/workspaces';
import { buildPulse, PulseChart } from './pulse-chart';

type PulseMode = 'volume' | 'payments';
type DateRange = '7d' | '30d' | '90d';
type DeckId = 'payout' | 'mix' | 'funnel';

const DATE_RANGE_LABEL: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const EMPTY_STATS: OverviewStats = {
  availableBalance: '0 USDC',
  pendingVolume: '0 USDC',
  pendingCount: 0,
  successfulPayments: '0',
  successRate: '0%',
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
  mix: [{ label: 'USDC', pct: 0, color: '#7EB6FF' }],
  funnel: [
    { label: 'Links created', value: 0, pct: 0 },
    { label: 'Payment initiated', value: 0, pct: 0 },
    { label: 'Payment completed', value: 0, pct: 0 },
  ],
  completionPct: '—',
  attention: [],
  recentPayments: [],
  paymentLinks: [],
  activity: [],
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
  const [pulseTall, setPulseTall] = useState(false);
  const [openDeck, setOpenDeck] = useState<Record<DeckId, boolean>>({
    payout: true,
    mix: true,
    funnel: true,
  });
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

  const firstName =
    (session?.name || workspace.name || '').trim().split(/\s+/)[0] || 'there';
  const pulsePoints = useMemo(
    () => buildPulse(stats.activity, dateRange, pulseMode),
    [stats.activity, dateRange, pulseMode],
  );
  const pulseTotal = pulsePoints.reduce((sum, point) => sum + point.value, 0);
  const pulseHeadline =
    pulseMode === 'volume'
      ? `${pulseTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
      : String(pulseTotal);
  const pulseDelta = pulseTotal === 0 ? 'No activity' : pulseMode === 'volume' ? 'Settled in range' : 'Links in range';

  const metrics = useMemo(
    () => [
      {
        label: 'Available Balance',
        value: loading ? '…' : stats.availableBalance,
        caption: 'Ready to withdraw',
        dot: 'bg-emerald-400',
        text: 'text-emerald-400',
        icon: Wallet,
      },
      {
        label: 'Pending Volume',
        value: loading ? '…' : stats.pendingVolume,
        caption: `${stats.pendingCount} payment${stats.pendingCount === 1 ? '' : 's'} processing`,
        dot: 'bg-[#c9b56a]',
        text: 'text-[#c9b56a]',
        icon: Clock3,
      },
      {
        label: 'Successful Payments',
        value: loading ? '…' : stats.successfulPayments,
        caption: 'Settled links',
        dot: 'bg-emerald-400',
        text: 'text-emerald-400',
        icon: TrendingUp,
      },
      {
        label: 'Success Rate',
        value: loading ? '…' : stats.successRate,
        caption:
          stats.successRate === '0%' || stats.successRate === '—'
            ? 'No settled payments yet'
            : 'Share of links that settled',
        dot: 'bg-emerald-400',
        text: 'text-emerald-400',
        icon: Percent,
      },
    ],
    [stats, loading],
  );

  return (
    <div className="dash-overview flex w-full flex-col gap-3.5 sm:gap-4">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <h1 className="dash-display text-[clamp(2.4rem,4vw,3.4rem)] leading-[0.96] tracking-[-0.035em] text-[#EEF4FF]">
            Hello {firstName},
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#EEF4FF]/70">
            Your private payments on Solana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:self-center lg:justify-self-end">
          <div className="relative" ref={rangeRef}>
            <button
              type="button"
              onClick={() => setRangeOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#C3D0E8]/35 bg-transparent px-3 text-sm text-[#EEF4FF] transition hover:border-[#C3D0E8]/55"
            >
              <Calendar className="size-3 text-white/55" strokeWidth={1.8} />
              {DATE_RANGE_LABEL[dateRange]}
              <ChevronDown className="size-3 text-white/40" />
            </button>
            {rangeOpen ? (
              <div className="absolute top-[calc(100%+6px)] right-0 z-20 min-w-[168px] overflow-hidden rounded-xl border border-[#C3D0E8]/35 bg-[#03080b] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
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
                        ? 'bg-white/[0.06] font-medium text-white'
                        : 'text-white/65 hover:bg-white/[0.04]'
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
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ffe500] px-4 text-sm font-medium text-[#14110e] transition hover:bg-[#fff36a]"
          >
            <Plus className="size-3.5" strokeWidth={2.1} />
            Create Payment Link
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col">
      <div className="flex flex-col lg:flex-row">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} join={index > 0} {...metric} />
        ))}
      </div>

      <div className="z-10 -mt-px flex flex-col lg:flex-row">
        <section className="ov-card min-h-[280px] min-w-0 flex-[1.65] overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
              Payment Pulse
            </p>
            <button
              type="button"
              aria-label={pulseTall ? 'Collapse chart' : 'Expand chart'}
              aria-pressed={pulseTall}
              onClick={() => setPulseTall((tall) => !tall)}
              className="inline-flex size-6 items-center justify-center rounded-md border border-[#C3D0E8]/35 bg-white/[0.03] text-white/50 transition hover:text-white"
            >
              <Maximize2 className="size-3" strokeWidth={1.8} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[23px] leading-none font-medium tracking-tight text-white">
                {loading ? '…' : pulseHeadline}
              </p>
              <span className="inline-flex items-center rounded-md border border-emerald-300/10 bg-emerald-400/[0.06] px-2 py-1 text-xs font-medium text-emerald-200/70">
                {loading ? '…' : pulseDelta}
              </span>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded-xl border border-[#C3D0E8]/35 p-1">
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
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    pulseMode === id
                      ? 'bg-white/[0.08] text-[#EEF4FF]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ov-chart-grid relative mt-2">
            <PulseChart points={pulsePoints} tall={pulseTall} />
          </div>
        </section>

        <div className="z-10 flex min-w-0 flex-1 flex-col lg:-ml-px">
          <section className="ov-card min-h-[148px] flex-1 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
                  Active Payment Links
                </p>
                <p className="mt-2 text-[21px] leading-none font-medium tracking-tight text-white">
                  {loading ? '…' : stats.activeLinks}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#9BB6FF]">
                  <span className="size-1.5 rounded-full bg-[#7EB6FF]" />
                  {stats.collectingToday} collecting today
                </p>
              </div>
              <span className="inline-flex size-8 items-center justify-center rounded-md border border-[#6F91E4]/20 bg-[#1D315C]/50 text-[#9BB6FF]">
                <Link2 className="size-4" strokeWidth={1.7} />
              </span>
            </div>
          </section>

          <section className="ov-card z-10 -mt-px min-h-[168px] flex-1 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
                  Needs Attention
                </p>
                <p className="mt-1.5 text-[10px] text-white/80">
                  {loading ? '…' : `${stats.attention.length} item${stats.attention.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <span className="inline-flex size-7 items-center justify-center rounded-md border border-rose-400/20 bg-rose-500/[0.07] text-rose-300">
                <AlertTriangle className="size-3.5" strokeWidth={1.8} />
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-white/50">
                  <Loader2 className="size-4 animate-spin" />
                  Loading workspace pulse…
                </p>
              ) : (
                stats.attention.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-amber-300/15 bg-amber-400/10 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-white/55">{item.detail}</p>
                  </div>
                ))
              )}
              <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/15 px-2.5 py-2">
                <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-300" />
                <p className="text-xs leading-[1.35] text-emerald-100/75">
                  Everything else is on track. Payment rails are operating normally.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="z-10 -mt-px flex flex-col lg:flex-row">
        <section className="ov-card min-h-[200px] min-w-0 flex-[1.65] overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
                Recent Payments
              </p>
              <p className="mt-1 text-xs text-white/45">Latest settlement activity</p>
            </div>
            <button
              type="button"
              onClick={onViewAllPayments}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9BB6FF] hover:text-white"
            >
              View all
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
          {loading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="size-4 animate-spin" />
              Loading payments…
            </p>
          ) : stats.recentPayments.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[#C3D0E8]/35 px-4 py-8 text-center text-sm text-white/40">
              No payment links yet. Create one to see activity here.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {stats.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_auto_auto]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#24345F] text-xs font-semibold text-[#B7D0FF]">
                      {payment.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{payment.payer}</p>
                      <p className="truncate text-xs text-white/40">{payment.handle}</p>
                    </div>
                  </div>
                  <span className="truncate text-xs text-white/55">{payment.purpose}</span>
                  <StatusPill status={payment.status} />
                  <span className="text-sm font-medium text-white">{payment.amount}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ov-card z-10 min-h-[200px] min-w-0 flex-1 overflow-hidden lg:-ml-px">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
              Payment Links
            </p>
            <button
              type="button"
              onClick={onViewAllPayments}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9BB6FF] hover:text-white"
            >
              Manage
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="size-4 animate-spin" />
                Loading links…
              </p>
            ) : stats.paymentLinks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#C3D0E8]/35 px-3 py-6 text-center text-sm text-white/40">
                No payment links yet.
              </p>
            ) : (
              stats.paymentLinks.map((link) => {
                const waiting = link.payments.toLowerCase().includes('await');
                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2 py-1.5"
                  >
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[#C3D0E8]/35 bg-white/[0.04] text-[#c9b56a]">
                      <CreditCard className="size-3.5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{link.name}</p>
                      <p
                        className={`mt-0.5 inline-flex items-center gap-1.5 text-xs ${
                          waiting ? 'text-[#c9b56a]' : 'text-emerald-300'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${waiting ? 'bg-[#c9b56a]' : 'bg-emerald-400'}`}
                        />
                        {link.payments}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-white">{link.volume}</p>
                  </div>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={onCreatePaymentLink}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#C3D0E8]/35 text-sm text-[#C3D0E8] transition hover:border-[#C3D0E8]/70 hover:text-[#EEF4FF]"
          >
            <Plus className="size-4 text-[#c9b56a]" strokeWidth={2.4} />
            New payment link
          </button>
        </section>
      </div>

      <div className="z-10 -mt-px flex flex-col lg:flex-row">
        <DeckCard
          label="Settlement & Payouts"
          title="Next payout"
          open={openDeck.payout}
          onToggle={() => setOpenDeck((current) => ({ ...current, payout: !current.payout }))}
          icon={<ArrowUpRight className="size-4" strokeWidth={1.8} />}
        >
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="dash-display text-[1.8rem] leading-none text-[#EEF4FF]">
              {loading ? '…' : stats.nextPayout}
            </p>
            <span className="mb-1 rounded-full bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
              {stats.nextPayoutStatus}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/45">{stats.nextPayoutHint}</p>
          <div className="mt-4 space-y-2.5 border-t border-white/8 pt-4 text-sm">
            <Row label="Destination" value={stats.destination} />
            <Row label="Last payout" value={stats.lastPayout} />
            <Row label="Schedule" value={stats.schedule} />
          </div>
        </DeckCard>

        <DeckCard
          join
          label="Payment Mix"
          title="Asset distribution"
          open={openDeck.mix}
          onToggle={() => setOpenDeck((current) => ({ ...current, mix: !current.mix }))}
          icon={<RefreshCw className="size-4" strokeWidth={1.8} />}
        >
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/10">
            {stats.mix.map((slice) => (
              <div
                key={slice.label}
                style={{ width: `${Math.max(slice.pct, slice.pct === 0 ? 0 : 4)}%`, backgroundColor: slice.color }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {stats.mix.map((slice) => (
              <div key={slice.label} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-white/65">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  {slice.label}
                </span>
                <span className="font-semibold text-white">{slice.pct}%</span>
              </div>
            ))}
          </div>
        </DeckCard>

        <DeckCard
          join
          label="Compliance & Security"
          title="Customer Journey"
          open={openDeck.funnel}
          onToggle={() => setOpenDeck((current) => ({ ...current, funnel: !current.funnel }))}
          icon={
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="size-3.5" strokeWidth={1.7} />
              <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
            </span>
          }
        >
          <div className="mt-4 space-y-3.5">
            {stats.funnel.map((step) => (
              <div key={step.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-white/60">{step.label}</span>
                  <span className="font-semibold text-white">{step.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7EB6FF] to-[#c9b56a]"
                    style={{ width: `${Math.max(step.pct, 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-emerald-300">{stats.completionPct}</p>
        </DeckCard>
      </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  dot,
  text,
  icon: Icon,
  join = false,
}: {
  label: string;
  value: string;
  caption: string;
  dot: string;
  text: string;
  icon: typeof Wallet;
  join?: boolean;
}) {
  return (
    <div className={`ov-card ov-metric relative min-h-[148px] min-w-0 flex-1 overflow-hidden${join ? " z-10 -mt-px lg:mt-0 lg:-ml-px" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] tracking-[0.14em] text-[#c9b56a] uppercase">{label}</p>
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-[#C3D0E8]/35 bg-white/[0.035] text-[#9BB6FF]">
          <Icon className="size-3" strokeWidth={1.8} />
        </span>
      </div>
      <p className="dash-display mt-2 text-[1.7rem] leading-none text-[#EEF4FF]">{value}</p>
      <p className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
        <span className={`size-1.5 rounded-full ${dot}`} />
        {caption}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: 'Settled' | 'Processing' | 'Failed' }) {
  const styles =
    status === 'Settled'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : status === 'Processing'
        ? 'border-[#c9b56a]/40 bg-[#c9b56a]/10 text-[#c9b56a]'
        : 'border-rose-300/30 bg-rose-400/10 text-rose-200';
  const Icon = status === 'Settled' ? CheckCircle2 : status === 'Processing' ? Clock3 : AlertTriangle;
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${styles}`}>
      <Icon className="size-2.5" strokeWidth={2.2} />
      {status}
    </span>
  );
}

function DeckCard({
  label,
  title,
  open,
  onToggle,
  icon,
  join = false,
  children,
}: {
  label: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  icon: ReactNode;
  join?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`ov-card min-h-[156px] min-w-0 flex-1${join ? " z-10 -mt-px lg:mt-0 lg:-ml-px" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-[11px] tracking-[0.16em] text-[#c9b56a] uppercase">
            {label}
          </span>
          <span className="mt-1 block text-sm text-white/70">{title}</span>
        </span>
        <span className="inline-flex h-7 items-center justify-center rounded-full border border-[#C3D0E8]/35 bg-white/[0.035] px-2 text-white/60">
          {icon}
        </span>
      </button>
      {open ? children : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-white/45">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}
