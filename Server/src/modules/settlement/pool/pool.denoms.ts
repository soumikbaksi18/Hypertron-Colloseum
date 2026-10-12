import { loadConfig } from '../../../common/config/configuration';

export function amountBuckets(): bigint[] {
  return loadConfig().pool.amountBuckets;
}

/** Snap `amount` up to the next configured bucket (or the amount itself if larger than all). */
export function snapAmountUp(amount: bigint): bigint {
  if (amount <= 0n) return amount;
  for (const bucket of amountBuckets()) {
    if (bucket >= amount) return bucket;
  }
  return amount;
}

export function isBucketAmount(amount: bigint): boolean {
  if (amount === 0n) return true;
  return amountBuckets().some((bucket) => bucket === amount);
}

export function assertUnshieldAmount(noteValue: bigint, amount: bigint): void {
  if (amount <= 0n || amount > noteValue) {
    throw new Error('withdraw amount must be between 1 and the shielded note value');
  }
  const change = noteValue - amount;
  if (change !== 0n && !isBucketAmount(change)) {
    throw new Error(
      'Change must stay in-pool as a bucket denomination (or withdraw the full note).',
    );
  }
  if (!isBucketAmount(amount) && change !== 0n) {
    throw new Error('Public unshield amount must be a pool bucket unless it clears the note.');
  }
}
