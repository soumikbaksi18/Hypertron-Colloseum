/** USDC minor units. Never convert through Number / floating point. */
export const USDC_DECIMALS = 6;
export const USDC_MINOR_PER_UNIT = 10n ** BigInt(USDC_DECIMALS);
export const USDC_MAX_MINOR = (1n << 64n) - 1n;

export type ParsedUsdc =
  | { ok: true; minor: bigint }
  | { ok: false; error: string };

function stripThousands(raw: string): string {
  if (!raw.includes(',')) return raw;
  if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) return raw;
  return raw.replace(/,/g, '');
}

/**
 * Parse a user-typed USDC amount into mint minor units.
 * Rejects scientific notation, extra decimals, and non-decimal junk.
 */
export function parseUsdcInput(
  raw: string,
  decimals: number = USDC_DECIMALS,
): ParsedUsdc {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter an amount of USDC.' };
  }
  if (/[eE]/.test(trimmed)) {
    return { ok: false, error: 'Enter a plain USDC amount, not scientific notation.' };
  }
  const normalized = stripThousands(trimmed);
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: 'Amount must be a non-negative USDC decimal.' };
  }
  const [wholeRaw, fracRaw = ''] = normalized.split('.');
  if (fracRaw.length > decimals) {
    return {
      ok: false,
      error: `USDC allows at most ${decimals} decimal places.`,
    };
  }
  const whole = BigInt(wholeRaw);
  const fracPadded = fracRaw.padEnd(decimals, '0');
  const frac = fracPadded.length === 0 ? 0n : BigInt(fracPadded);
  const scale = 10n ** BigInt(decimals);
  const minor = whole * scale + frac;
  if (minor > USDC_MAX_MINOR) {
    return { ok: false, error: 'Amount exceeds the maximum supported USDC value.' };
  }
  if (minor === 0n) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }
  return { ok: true, minor };
}

export function formatUsdcMinor(
  minor: bigint,
  decimals: number = USDC_DECIMALS,
): string {
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const frac = abs % scale;
  if (frac === 0n) return `${sign}${whole.toString()}`;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${sign}${whole.toString()}.${fracStr}`;
}

export function formatUsdcAmount(
  minor: bigint,
  decimals: number = USDC_DECIMALS,
): string {
  return `${formatUsdcMinor(minor, decimals)} USDC`;
}

export function parseBucketList(raw: string[] | undefined): bigint[] {
  if (!raw?.length) return [];
  const buckets: bigint[] = [];
  for (const part of raw) {
    try {
      const value = BigInt(part.trim());
      if (value > 0n) buckets.push(value);
    } catch {
      // Ignore a malformed bucket from config.
    }
  }
  return buckets.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Same rule as Server `snapAmountUp`: next bucket, or the amount if larger than all. */
export function snapAmountUp(amount: bigint, buckets: bigint[]): bigint {
  if (amount <= 0n || buckets.length === 0) return amount;
  for (const bucket of buckets) {
    if (bucket >= amount) return bucket;
  }
  return amount;
}
