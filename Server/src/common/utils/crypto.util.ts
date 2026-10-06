import * as crypto from 'node:crypto';

const API_KEY_PREFIX = 'ht_sk';

export interface GeneratedApiKey {
  /// Shown to the caller exactly once.
  raw: string;
  keyPrefix: string;
  lastFour: string;
}

export function generateApiKey(): GeneratedApiKey {
  const secret = crypto.randomBytes(24).toString('base64url');
  const raw = `${API_KEY_PREFIX}_${secret}`;
  return {
    raw,
    keyPrefix: API_KEY_PREFIX,
    lastFour: raw.slice(-4),
  };
}

export function getKeyPrefix(rawKey: string): string | null {
  const parts = rawKey.split('_');
  if (parts.length < 3) {
    return null;
  }
  return `${parts[0]}_${parts[1]}`;
}

export function generateSigningSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/// `Hypertron-Signature: t=<unix_seconds>,v1=<hmac_sha256(t.body)>`
export function signWebhookPayload(
  signingSecret: string,
  timestamp: number,
  body: string,
): string {
  const hmac = crypto
    .createHmac('sha256', Buffer.from(signingSecret, 'hex'))
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

export function hashRequestBody(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(stableStringify(payload), 'utf8')
    .digest('hex');
}

/// Key-sorted JSON so an identical request always fingerprints identically.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

export function publicId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}
