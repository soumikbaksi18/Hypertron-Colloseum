import { decryptNote, isNoteBlob } from './prover';
import { paymentLinksApi, type PaymentLink } from './payment-links';
import { loadShieldKeys } from './shield-keys';
import { walletApi, type AuditorPayment } from './wallet';

export function parseAuditorKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Paste a viewing key first.');
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as {
      viewSecret?: string;
      view_secret?: string;
    };
    const secret = parsed.viewSecret ?? parsed.view_secret ?? '';
    if (!secret) throw new Error('That file has no viewing key.');
    return normalizeSecret(secret);
  }
  return normalizeSecret(trimmed);
}

function normalizeSecret(value: string): string {
  const body = value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(body)) {
    throw new Error('That is not a 32-byte viewing key.');
  }
  return `0x${body.toLowerCase()}`;
}

function shortId(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function fromLink(link: PaymentLink): Pick<AuditorPayment, 'from' | 'to' | 'purpose' | 'kind'> {
  return {
    from:
      link.client_name?.trim() ||
      (link.payer_pubkey ? shortId(link.payer_pubkey) : 'Invoice payer'),
    to: link.recipient_handle ?? link.business_name ?? 'Private recipient',
    purpose: link.purpose?.trim() || 'Invoice',
    kind: 'invoice',
  };
}

async function fallbackFromLocal(
  viewSecret: string,
  handle: string | null,
): Promise<AuditorPayment[]> {
  const local = loadShieldKeys();
  const sameLocal = local?.viewSecret.replace(/^0x/i, '').toLowerCase() ===
    viewSecret.replace(/^0x/i, '').toLowerCase();
  const payments: AuditorPayment[] = [];

  if (sameLocal) {
    try {
      const remote = await walletApi.notes();
      for (const row of remote.notes) {
        if (!isNoteBlob(row.encrypted_blob)) continue;
        const opened = await decryptNote(viewSecret, row.encrypted_blob);
        if (!opened) continue;
        payments.push({
          from: 'Private sender',
          to: handle ?? 'This Hypertron ID',
          amount: opened.v,
          purpose: 'Private payment',
          kind: 'received',
          status: 'held',
          at: new Date().toISOString(),
          leaf_index: row.leaf_index,
          commitment: row.commitment,
          tx_signature: null,
        });
      }
    } catch {
      // Session notes are optional when the API is down.
    }
  }

  try {
    const links = await paymentLinksApi.list();
    if (sameLocal) {
      for (const link of links.filter((row) => row.status === 'paid')) {
        const story = fromLink(link);
        payments.push({
          ...story,
          amount: link.amount,
          status: link.in_pool ? 'held' : 'spent',
          at: link.paid_at ?? link.created_at ?? new Date().toISOString(),
          leaf_index: link.leaf_index ?? -1,
          commitment: link.commitment ?? link.id,
          tx_signature: link.tx_signature ?? link.payment_tx_hash ?? null,
        });
      }
    }
  } catch {
    // Invoice list is optional.
  }

  const seen = new Set<string>();
  return payments.filter((row) => {
    const key = `${row.commitment}:${row.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function openAuditorBooks(
  rawKey: string,
  handle: string | null,
): Promise<{ handle: string | null; payments: AuditorPayment[] }> {
  const viewSecret = parseAuditorKey(rawKey);
  try {
    const disclosed = await walletApi.disclose(viewSecret);
    if (disclosed.payments.length) return disclosed;
  } catch {
    // Fall through to local reconstruction.
  }
  const payments = await fallbackFromLocal(viewSecret, handle);
  return { handle, payments };
}
