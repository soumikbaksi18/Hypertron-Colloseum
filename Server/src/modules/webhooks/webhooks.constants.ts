export const SIGNATURE_HEADER = 'Hypertron-Signature';
export const EVENT_ID_HEADER = 'Hypertron-Event-Id';
export const DELIVERY_ID_HEADER = 'Hypertron-Delivery-Id';

export const MAX_ATTEMPTS = 6;
export const DELIVERY_TIMEOUT_MS = 10_000;

/// Backoff after attempt N (index 0 = wait before attempt 2).
export const RETRY_DELAYS_MS = [
  5_000,
  30_000,
  2 * 60_000,
  10 * 60_000,
  60 * 60_000,
];

export function isRetryableStatus(status: number | null): boolean {
  // A transport failure has no status and is always worth retrying.
  if (status === null) {
    return true;
  }
  if (status >= 500) {
    return true;
  }
  return [408, 409, 425, 429].includes(status);
}
