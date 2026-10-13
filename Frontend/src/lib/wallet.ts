import { BASE_URL, parseApi, unreachable } from './http';

export type HypertronId = {
  handle: string;
  name: string;
  owner_pk: string;
  view_pub: string;
};

export type AuditorPayment = {
  from: string;
  to: string;
  amount: string;
  purpose: string;
  kind: 'invoice' | 'add_money' | 'received';
  status: 'held' | 'spent';
  at: string;
  leaf_index: number;
  commitment: string;
  tx_signature?: string | null;
};

export type RemoteNote = {
  commitment: string;
  leaf_index: number;
  value: string;
  encrypted_blob: string | null;
  payment_link_id: string | null;
};

export type PoolConfig = {
  mint: string;
  program_id: string;
  network?: string;
  amount_buckets: string[];
  withdraw_delay_sec?: number;
  auto_unshield?: boolean;
};

async function cookieFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    unreachable();
  }
  return parseApi<T>(response);
}

export const walletApi = {
  lookupId: async (handle: string) => {
    let response: Response;
    try {
      response = await fetch(
        `${BASE_URL}/v1/ids/${encodeURIComponent(handle.trim())}`,
      );
    } catch {
      unreachable();
    }
    return parseApi<HypertronId>(response);
  },

  notes: () => cookieFetch<{ notes: RemoteNote[] }>('/v1/pool/notes'),

  disclose: (view_secret: string) =>
    cookieFetch<{
      handle: string | null;
      payments: AuditorPayment[];
    }>('/v1/pool/disclose', {
      method: 'POST',
      body: JSON.stringify({ view_secret }),
    }),

  leaves: async () => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/pool/leaves`);
    } catch {
      return { leaves: [] as string[] };
    }
    if (!response.ok) return { leaves: [] as string[] };
    return parseApi<{ leaves: string[] }>(response);
  },

  config: async () => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/pool/config`);
    } catch {
      unreachable();
    }
    return parseApi<PoolConfig>(response);
  },

  prepareDeposit: (body: {
    payer_pubkey: string;
    amount: string;
    commitment: string;
    proof: string;
    blob?: string;
  }) =>
    cookieFetch<{
      transaction: string;
      pending_id: string;
      commitment: string;
      amount: string;
    }>('/v1/pool/prepare-deposit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  broadcastDeposit: (body: {
    pending_id: string;
    signed_transaction: string;
  }) =>
    cookieFetch<{
      tx_signature: string;
      status: string;
      commitment: string;
      amount: string;
      leaf_index?: number;
    }>('/v1/pool/broadcast-deposit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  depositStatus: (pendingId: string) =>
    cookieFetch<{
      tx_signature?: string;
      status: string;
      commitment: string;
      amount: string;
      leaf_index?: number;
    }>(`/v1/pool/deposits/${encodeURIComponent(pendingId)}`),

  transfer: (body: Record<string, string>) =>
    cookieFetch<{ tx_signature: string }>('/v1/pool/transfer', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  withdraw: (body: {
    spent_commitment: string;
    root: string;
    nullifier: string;
    change_cm: string;
    proof: string;
    amount: string;
    note_value: string;
  }) =>
    cookieFetch<{ tx_signature: string }>('/v1/pool/withdraw', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
