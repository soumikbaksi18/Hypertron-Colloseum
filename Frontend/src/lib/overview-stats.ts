import { money, toMajor } from './format';
import { privateBalance } from './note-book';
import type { PaymentLink } from './payment-links';
import { paymentLinksApi } from './payment-links';
import { shortenAddress } from './phantom';

export type OverviewPaymentRow = {
  id: string;
  payer: string;
  handle: string;
  initials: string;
  purpose: string;
  status: 'Settled' | 'Processing' | 'Failed';
  amount: string;
};

export type OverviewLinkRow = {
  id: string;
  name: string;
  payments: string;
  volume: string;
};

export type OverviewAttention = {
  id: string;
  tone: 'danger' | 'warn';
  title: string;
  detail: string;
};

export type OverviewStats = {
  availableBalance: string;
  pendingVolume: string;
  pendingCount: number;
  successfulPayments: string;
  successRate: string;
  activeLinks: string;
  collectingToday: number;
  collected: string;
  collectedDelta: string;
  nextPayout: string;
  nextPayoutStatus: string;
  nextPayoutHint: string;
  lastPayout: string;
  destination: string;
  schedule: string;
  mix: Array<{ label: string; pct: number; color: string }>;
  funnel: Array<{ label: string; value: number; pct: number }>;
  completionPct: string;
  attention: OverviewAttention[];
  recentPayments: OverviewPaymentRow[];
  paymentLinks: OverviewLinkRow[];
};

function minorSum(links: PaymentLink[]) {
  return links.reduce((sum, link) => sum + Number(link.amount), 0);
}

function initialsFrom(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'HT';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export async function loadOverviewStats(payoutAddress: string | null): Promise<OverviewStats> {
  const links = await paymentLinksApi.list().catch(() => [] as PaymentLink[]);
  const pending = links.filter((link) => link.status === 'pending');
  const paid = links.filter((link) => link.status === 'paid');
  const expired = links.filter((link) => link.status === 'expired' || link.status === 'canceled');
  const collectedMinor = minorSum(paid);
  const pendingMinor = minorSum(pending);
  const balanceMinor = Number(privateBalance());
  const created = links.length;
  const started = pending.length + paid.length;
  const completed = paid.length;
  const startPct = created === 0 ? 0 : Math.round((started / created) * 100);
  const donePct = created === 0 ? 0 : Math.round((completed / created) * 100);

  const attention: OverviewAttention[] = [];
  if (expired.length > 0) {
    attention.push({
      id: 'expired',
      tone: 'warn',
      title: `${expired.length} invoice${expired.length === 1 ? '' : 's'} closed unpaid`,
      detail: 'Create a new link if the customer still needs to pay.',
    });
  }

  const recentPayments: OverviewPaymentRow[] = [...links]
    .sort((a, b) => Date.parse(b.paid_at ?? b.created_at ?? '') - Date.parse(a.paid_at ?? a.created_at ?? ''))
    .slice(0, 6)
    .map((link) => ({
      id: link.id,
      payer: link.client_name?.trim() || 'Customer',
      handle: link.recipient_handle ?? link.payer_pubkey?.slice(0, 8) ?? 'Invoice',
      initials: initialsFrom(link.client_name?.trim() || link.purpose || 'HT'),
      purpose: link.purpose?.trim() || 'Invoice',
      status:
        link.status === 'paid'
          ? 'Settled'
          : link.status === 'pending'
            ? 'Processing'
            : 'Failed',
      amount: money(link.amount, link.currency),
    }));

  const paymentLinks: OverviewLinkRow[] = links.slice(0, 4).map((link) => ({
    id: link.id,
    name: link.purpose?.trim() || 'Payment link',
    payments: link.status === 'paid' ? '1 payment' : 'Awaiting payment',
    volume: money(link.amount, link.currency),
  }));

  const usdcPct = created === 0 ? 0 : 100;

  return {
    availableBalance: `${toMajor(balanceMinor).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })} USDC`,
    pendingVolume: `${toMajor(pendingMinor).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })} USDC`,
    pendingCount: pending.length,
    successfulPayments: String(paid.length),
    successRate: created === 0 ? '99%' : `${Math.max(0, Math.round((paid.length / Math.max(started, 1)) * 100))}%`,
    activeLinks: String(pending.length),
    collectingToday: pending.length,
    collected: `${toMajor(collectedMinor).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })} USDC`,
    collectedDelta: collectedMinor > 0 ? 'Settled' : 'No activity',
    nextPayout: `${toMajor(balanceMinor).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })} USDC`,
    nextPayoutStatus: balanceMinor > 0 ? 'Ready' : 'Empty',
    nextPayoutHint: balanceMinor > 0 ? 'Cash out from Treasury when you want funds on-chain.' : 'No shielded notes ready yet.',
    lastPayout: '—',
    destination: payoutAddress ? shortenAddress(payoutAddress, 4) : 'Set in Settings',
    schedule: 'On demand',
    mix: [{ label: 'USDC', pct: usdcPct, color: '#4A63BE' }],
    funnel: [
      { label: 'Links created', value: created, pct: created === 0 ? 0 : 100 },
      { label: 'Payment initiated', value: started, pct: startPct },
      { label: 'Payment completed', value: completed, pct: donePct },
    ],
    completionPct: created === 0 ? '—' : `${donePct}% overall completion`,
    attention,
    recentPayments,
    paymentLinks,
  };
}
