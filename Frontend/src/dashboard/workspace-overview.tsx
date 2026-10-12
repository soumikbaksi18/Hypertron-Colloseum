import {
  useCallback,
  useEffect,
  useId,
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
  MoreHorizontal,
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
import { DashboardUtilities, type DashboardMode } from './chrome';

type PulseMode = 'volume' | 'payments';
type DateRange = '7d' | '30d' | '90d';
type DeckId = 'payout' | 'mix' | 'funnel';

const DATE_RANGE_LABEL: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const PULSE_VOLUME =
  'M8 98 C52 92 78 70 118 64 C168 56 188 88 232 76 C286 60 314 32 362 38 C412 44 438 76 486 64 C528 54 548 34 568 26';
const PULSE_PAYMENTS =
  'M8 88 C46 84 74 96 118 78 C162 60 196 46 236 58 C286 74 320 96 368 82 C418 68 452 40 500 48 C534 54 552 36 568 26';

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
};

function pulseLabels(range: DateRange) {
  const count = range === '7d' ? 7 : 6;
  const span = range === '7d' ? 6 : range === '30d' ? 29 : 89;
  const end = new Date();
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(end);
    day.setDate(end.getDate() - Math.round((span * (count - 1 - index)) / (count - 1)));
    return day
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      .toUpperCase();
  });
}

export function WorkspaceOverview({
  workspace,
  searchPlaceholder,
  identityTitle,
  onCreatePaymentLink,
  onViewAllPayments,
  onModeChange,
}: {
  workspace: WorkspaceView;
  searchPlaceholder: string;
  identityTitle: string;
  onCreatePaymentLink?: () => void;
  onViewAllPayments?: () => void;
  onModeChange?: (mode: DashboardMode) => void;
}) {
  const { session } = useWalletSession();
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [pulseMode, setPulseMode] = useState<PulseMode>('volume');
  const [pulseTall, setPulseTall] = useState(false);
  const [openDeck, setOpenDeck] = useState<DeckId | null>(null);
  const [stats, setStats] = useState<OverviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const rangeRef = useRef<HTMLDivElement>(null);
  const pulseId = useId().replace(/[^a-zA-Z0-9]/g, '');

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
  const labels = useMemo(() => pulseLabels(dateRange), [dateRange]);
  const pulsePath = pulseMode === 'volume' ? PULSE_VOLUME : PULSE_PAYMENTS;

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
        dot: 'bg-[#E7B66D]',
        text: 'text-[#E7B66D]',
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
        caption: 'Healthy performance',
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
        <p className="pt-0.5 text-[9px] font-semibold tracking-[0.28em] text-[#8EA2C4] uppercase">
          Dashboard
        </p>
        <div className="lg:justify-self-end">
          <DashboardUtilities
            searchPlaceholder={searchPlaceholder}
            identityTitle={identityTitle}
            mode="workspaces"
            onModeChange={onModeChange}
            showAccount={false}
          />
        </div>

        <div className="min-w-0">
          <h1 className="dash-pixel text-[clamp(28px,3.4vw,40px)] leading-none text-white">
            Hello {firstName},
          </h1>
          <p className="mt-2 text-[11px] text-[#A8B3C9]">
            Your private payments on Solana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:self-center lg:justify-self-end">
          <div className="relative" ref={rangeRef}>
            <button
              type="button"
              onClick={() => setRangeOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-[#0c1629] px-3 text-[9px] font-medium text-white/80 transition hover:border-white/20"
            >
              <Calendar className="size-3 text-white/55" strokeWidth={1.8} />
              {DATE_RANGE_LABEL[dateRange]}
              <ChevronDown className="size-3 text-white/40" />
            </button>
            {rangeOpen ? (
              <div className="absolute top-[calc(100%+6px)] right-0 z-20 min-w-[168px] overflow-hidden rounded-xl border border-white/10 bg-[#10182e] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
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
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#F3D28F] bg-[#E7B66D] px-4 text-[9px] font-semibold text-[#1A1408] transition hover:bg-[#F0C77E]"
          >
            <Plus className="size-3.5" strokeWidth={2.1} />
            Create Payment Link
          </button>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-3.5 lg:h-[190px] lg:grid-cols-[minmax(0,1.7fr)_minmax(230px,0.72fr)] lg:items-stretch">
        <section className="ov-card overflow-hidden p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[7px] font-semibold tracking-[0.16em] text-white/40 uppercase">
              Payment Pulse
            </p>
            <button
              type="button"
              aria-label={pulseTall ? 'Collapse chart' : 'Expand chart'}
              aria-pressed={pulseTall}
              onClick={() => setPulseTall((tall) => !tall)}
              className="inline-flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/50 transition hover:text-white"
            >
              <Maximize2 className="size-3" strokeWidth={1.8} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[23px] leading-none font-medium tracking-tight text-white">
                {loading ? '…' : stats.collected}
              </p>
              <span className="inline-flex items-center rounded-md border border-emerald-300/10 bg-emerald-400/[0.06] px-2 py-1 text-[8px] font-medium text-emerald-200/70">
                {loading ? '…' : stats.collectedDelta}
              </span>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded-full bg-black/20 p-0.5 ring-1 ring-white/10">
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
                  className={`rounded-full px-3 py-1 text-[8px] font-medium transition ${
                    pulseMode === id
                      ? 'bg-[#2C4A93] text-white shadow-[inset_0_0_0_1px_rgba(150,176,255,0.35)]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ov-chart-grid relative mt-2">
            <svg
              viewBox="0 0 580 120"
              className={`w-full ${pulseTall ? 'h-[172px]' : 'h-[76px]'}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id={`${pulseId}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7BA0FF" stopOpacity="0.28" />
                  <stop offset="55%" stopColor="#E7B66D" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#E7B66D" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${pulseId}-stroke`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6E94F0" />
                  <stop offset="62%" stopColor="#8FB0FF" />
                  <stop offset="100%" stopColor="#E7B66D" />
                </linearGradient>
              </defs>
              {[34, 64, 94].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="580"
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                />
              ))}
              <path d={`${pulsePath} L568 120 L8 120 Z`} fill={`url(#${pulseId}-fill)`} />
              <path
                d={pulsePath}
                fill="none"
                stroke={`url(#${pulseId}-stroke)`}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="pointer-events-none absolute top-[18%] right-0 size-2 rounded-full bg-[#F6E2B8]" />
          </div>
          <div className="mt-1 flex justify-between gap-2 px-0.5 text-[7px] tracking-[0.08em] text-white/35">
            {labels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
        </section>

        <div className="grid gap-3.5 lg:grid-rows-[82px_94px]">
          <section className="ov-card overflow-hidden p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[7px] font-semibold tracking-[0.16em] text-white/40 uppercase">
                  Active Payment Links
                </p>
                <p className="mt-2 text-[21px] leading-none font-medium tracking-tight text-white">
                  {loading ? '…' : stats.activeLinks}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[8px] font-medium text-[#9BB6FF]">
                  <span className="size-1.5 rounded-full bg-[#7EB6FF]" />
                  {stats.collectingToday} collecting today
                </p>
              </div>
              <span className="inline-flex size-8 items-center justify-center rounded-md border border-[#6F91E4]/20 bg-[#1D315C]/50 text-[#9BB6FF]">
                <Link2 className="size-4" strokeWidth={1.7} />
              </span>
            </div>
          </section>

          <section className="ov-card overflow-hidden p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[7px] font-semibold tracking-[0.16em] text-white/40 uppercase">
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
                <p className="text-[8px] leading-[1.35] text-emerald-100/75">
                  Everything else is on track. Payment rails are operating normally.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-3.5 lg:h-[115px] lg:grid-cols-[minmax(0,1.7fr)_minmax(230px,0.72fr)]">
        <section className="ov-card overflow-hidden p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[7px] font-semibold tracking-[0.16em] text-white/40 uppercase">
                Recent Payments
              </p>
              <p className="mt-1 text-[8px] text-white/45">Latest settlement activity</p>
            </div>
            <button
              type="button"
              onClick={onViewAllPayments}
              className="inline-flex items-center gap-1 text-[8px] font-medium text-[#9BB6FF] hover:text-white"
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
            <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
              No payment links yet. Create one to see activity here.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {stats.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_auto_auto_16px]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#24345F] text-[8px] font-semibold text-[#B7D0FF]">
                      {payment.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[9px] font-medium text-white">{payment.payer}</p>
                      <p className="truncate text-[7px] text-white/40">{payment.handle}</p>
                    </div>
                  </div>
                  <span className="truncate text-[8px] text-white/55">{payment.purpose}</span>
                  <StatusPill status={payment.status} />
                  <span className="text-[9px] font-medium text-white">{payment.amount}</span>
                  <MoreHorizontal className="size-4 text-white/35" aria-hidden />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ov-card overflow-hidden p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[7px] font-semibold tracking-[0.16em] text-white/40 uppercase">
              Payment Links
            </p>
            <button
              type="button"
              onClick={onViewAllPayments}
              className="inline-flex items-center gap-1 text-[8px] font-medium text-[#9BB6FF] hover:text-white"
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
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-white/40">
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
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[#E7B66D]">
                      <CreditCard className="size-3.5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-medium text-white">{link.name}</p>
                      <p
                        className={`mt-0.5 inline-flex items-center gap-1.5 text-[7px] ${
                          waiting ? 'text-[#E7B66D]' : 'text-emerald-300'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${waiting ? 'bg-[#E7B66D]' : 'bg-emerald-400'}`}
                        />
                        {link.payments}
                      </p>
                    </div>
                    <p className="text-[9px] font-medium text-white">{link.volume}</p>
                    <MoreHorizontal className="size-4 shrink-0 text-white/35" aria-hidden />
                  </div>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={onCreatePaymentLink}
            className="mt-2 inline-flex h-7 w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#E7B66D]/50 bg-[#E7B66D]/[0.03] text-[8px] font-medium text-[#F3E6C8] transition hover:bg-[#E7B66D]/10"
          >
            <Plus className="size-4 text-[#E7B66D]" strokeWidth={2.4} />
            New payment link
          </button>
        </section>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-3">
        <DeckCard
          label="Settlement & Payouts"
          title="Next payout"
          open={openDeck === 'payout'}
          onToggle={() => setOpenDeck((current) => (current === 'payout' ? null : 'payout'))}
          icon={<ArrowUpRight className="size-4" strokeWidth={1.8} />}
        >
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-[26px] font-semibold tracking-tight text-white">
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
          label="Payment Mix"
          title="Asset distribution"
          open={openDeck === 'mix'}
          onToggle={() => setOpenDeck((current) => (current === 'mix' ? null : 'mix'))}
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
          label="Compliance & Security"
          title="Customer Journey"
          open={openDeck === 'funnel'}
          onToggle={() => setOpenDeck((current) => (current === 'funnel' ? null : 'funnel'))}
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
                    className="h-full rounded-full bg-gradient-to-r from-[#7EB6FF] to-[#E7B66D]"
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
  );
}

function MetricCard({
  label,
  value,
  caption,
  dot,
  text,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  dot: string;
  text: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="ov-card ov-metric relative min-h-[96px] overflow-hidden px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[7px] font-semibold tracking-[0.14em] text-white/45 uppercase">
          <span className="text-[#91A8D0]">↗</span>
          {label}
        </p>
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-[#9BB6FF]">
          <Icon className="size-3" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-2 text-[20px] leading-none font-medium tracking-tight text-white">{value}</p>
      <p className={`mt-2.5 inline-flex items-center gap-1.5 text-[8px] font-medium ${text}`}>
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
        ? 'border-[#E7B66D]/40 bg-[#E7B66D]/10 text-[#F3D7A2]'
        : 'border-rose-300/30 bg-rose-400/10 text-rose-200';
  const Icon = status === 'Settled' ? CheckCircle2 : status === 'Processing' ? Clock3 : AlertTriangle;
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-[7px] font-medium ${styles}`}>
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
  children,
}: {
  label: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ov-card px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-[7px] font-semibold tracking-[0.16em] text-white/45 uppercase">
            {label}
          </span>
          <span className="mt-1 block text-[9px] text-white/70">{title}</span>
        </span>
        <span className="inline-flex h-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-2 text-white/60">
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
