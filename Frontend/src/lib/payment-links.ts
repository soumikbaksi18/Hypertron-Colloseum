import { BASE_URL, parseApi, unreachable } from './http';

export function payUrl(id: string, fallback?: string | null): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/pay/${id}`;
  }
  return fallback || `/pay/${id}`;
}

export type PaymentLinkStatus = 'pending' | 'paid' | 'expired' | 'canceled';

export type PaymentLink = {
  id: string;
  amount: string;
  currency: string;
  purpose: string | null;
  client_name: string | null;
  memo: string | null;
  destination_address?: string | null;
  expires_at: string | null;
  status: PaymentLinkStatus;
  paid_at: string | null;
  tx_signature: string | null;
  payer_pubkey?: string | null;
  created_at?: string;
  url: string;
  business_name: string;
  recipient_handle?: string | null;
  payment_tx_hash?: string | null;
  rail?: 'pool' | 'mock';
  cluster?: string | null;
  in_pool?: boolean;
  payout_tx_signature?: string | null;
  withdrawable_at?: string | null;
  amount_buckets?: string[];
  owner_pk?: string | null;
  view_pub?: string | null;
  encrypted_blob?: string | null;
  leaf_index?: number | null;
  note_value?: string | null;
  commitment?: string | null;
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

export const paymentLinksApi = {
  list: () => cookieFetch<PaymentLink[]>('/v1/payment-links'),

  create: (body: {
    amount_minor: number;
    currency?: string;
    purpose?: string;
    client_name?: string;
    memo?: string;
    expires_at?: string;
  }) =>
    cookieFetch<PaymentLink>('/v1/payment-links', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getPublic: async (id: string) => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/payment-links/${id}`);
    } catch {
      unreachable();
    }
    return parseApi<PaymentLink>(response);
  },

  confirm: async (
    id: string,
    body: { tx_signature?: string; payer_pubkey?: string },
  ) => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/payment-links/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      unreachable();
    }
    return parseApi<PaymentLink>(response);
  },

  prepareShield: async (id: string, payerPubkey: string) => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/payment-links/${id}/prepare-shield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payer_pubkey: payerPubkey }),
      });
    } catch {
      unreachable();
    }
    return parseApi<{
      transaction: string;
      commitment: string;
      owner_pk: string;
      view_pub: string | null;
      amount: string;
      rail: 'pool';
    }>(response);
  },

  prepareShieldWithProof: async (
    id: string,
    body: {
      payer_pubkey: string;
      commitment: string;
      proof: string;
      blob?: string;
    },
  ) => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/payment-links/${id}/prepare-shield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      unreachable();
    }
    return parseApi<{
      transaction: string;
      commitment: string;
      owner_pk: string;
      view_pub: string | null;
      amount: string;
      rail: 'pool';
    }>(response);
  },

  broadcast: async (
    id: string,
    body: { signed_transaction: string; payer_pubkey?: string },
  ) => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/payment-links/${id}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      unreachable();
    }
    return parseApi<PaymentLink>(response);
  },

  withdraw: (
    id: string,
    body: {
      destination: string;
      amount?: string;
      root?: string;
      nullifier?: string;
      change_cm?: string;
      proof?: string;
    },
  ) =>
    cookieFetch<PaymentLink>(`/v1/payment-links/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
