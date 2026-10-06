import type { IntentStatus } from './api';

/// USDC carries 6 decimals, so minor units are millionths.
export const MINOR_PER_UNIT = 1_000_000;

export function toMajor(minor: string | number): number {
  return Number(minor) / MINOR_PER_UNIT;
}

export function money(minor: string | number, currency = 'USDC'): string {
  const value = toMajor(minor);
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function compactMoney(minor: string | number): string {
  const value = toMajor(minor);
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('en-US', {
      maximumFractionDigits: value % 1000 === 0 ? 0 : 1,
    })}k`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function truncateHash(value: string, head = 10, tail = 6): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/// One canonical description per lifecycle state, so the console never
/// invents a second vocabulary for the same thing.
export const STATUS_META: Record<
  IntentStatus,
  { label: string; tone: string; note: string }
> = {
  requires_authorization: {
    label: 'Checking policy',
    tone: 'neutral',
    note: 'Evaluating limits and payee policy',
  },
  requires_approval: {
    label: 'Waiting on you',
    tone: 'amber',
    note: 'Above the agent’s autonomous ceiling',
  },
  authorized: {
    label: 'Authorized',
    tone: 'blue',
    note: 'Cleared policy, queued for settlement',
  },
  settling: {
    label: 'Settling privately',
    tone: 'cyan',
    note: 'Executing in the shielded pool',
  },
  settled: {
    label: 'Settled',
    tone: 'mint',
    note: 'Paid, with a machine-readable receipt',
  },
  denied: {
    label: 'Denied',
    tone: 'deny',
    note: 'Policy refused this payment',
  },
  failed: {
    label: 'Failed',
    tone: 'deny',
    note: 'Settlement could not complete',
  },
  canceled: {
    label: 'Canceled',
    tone: 'neutral',
    note: 'Withdrawn before settlement',
  },
};

/// Turns a machine reason code into something an operator reads without
/// needing to know the policy engine's internals.
export function humanizeReason(reason: string): {
  code: string;
  detail: string;
} {
  const [rawCode, ...rest] = reason.split(':');
  const detail = rest.join(':').trim();
  const code = rawCode.trim();

  const phrasing: Record<string, string> = {
    payee_allowlisted: 'Payee is on the allowlist',
    payee_not_allowlisted: 'Payee is not on the allowlist',
    within_auto_approve_threshold: 'Inside the autonomous ceiling',
    above_auto_approve_threshold: 'Above the autonomous ceiling',
    within_per_transaction_limit: 'Inside the per-payment limit',
    per_transaction_limit_exceeded: 'Over the per-payment limit',
    daily_limit_exceeded: 'Over today’s remaining budget',
    currency_not_permitted: 'Currency not permitted for this agent',
    approved_by_human: 'Approved by a person',
    denied_by_human: 'Denied by a person',
  };

  return { code: phrasing[code] ?? code.replace(/_/g, ' '), detail };
}
