import { BASE_URL, parseApi, unreachable, ApiError } from './http';

export type IntentStatus =
  | 'requires_authorization'
  | 'requires_approval'
  | 'authorized'
  | 'settling'
  | 'settled'
  | 'denied'
  | 'failed'
  | 'canceled';

export interface PaymentIntent {
  id: string;
  status: IntentStatus;
  agent_id: string;
  payee_ref: string;
  amount_minor: string;
  currency: string;
  reference: string | null;
  authorization: {
    decision: 'authorized' | 'denied' | 'needs_human_approval' | null;
    reasons: string[];
    evaluated_at: string | null;
    approved_by: string | null;
    approved_at: string | null;
  };
  settlement: {
    settlement_id: string | null;
    commitment: string | null;
    nullifier: string | null;
    tx_signature: string | null;
    view_key_hint: string | null;
    settled_at: string | null;
  };
  failure: { code: string; message: string } | null;
  created_at: string;
  updated_at: string;
}

export interface AgentProfile {
  agent_id: string;
  label: string;
  business_name: string;
  currency: string;
  limits: {
    per_transaction_minor: string;
    daily_minor: string;
    auto_approve_minor: string;
  };
  today: { spent_minor: string; remaining_minor: string };
  allowed_payees: { payee_ref: string; label: string }[];
}

export interface ReceivedWebhook {
  received_at: string;
  type: string;
  event_id: string;
  signature_valid: boolean;
  intent: { id?: string; status?: string; reference?: string | null } | null;
}

export { BASE_URL, ApiError };

async function request<T>(
  path: string,
  apiKey: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (init?.idempotencyKey) {
    headers['Idempotency-Key'] = init.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    unreachable();
  }

  return parseApi<T>(response);
}

export const api = {
  agent: (apiKey: string) => request<AgentProfile>('/v1/agent', apiKey),

  listIntents: (apiKey: string) =>
    request<PaymentIntent[]>('/v1/payment_intents?limit=40', apiKey),

  createIntent: (
    apiKey: string,
    body: {
      payee_ref: string;
      amount_minor: number;
      reference?: string;
    },
  ) =>
    request<PaymentIntent>('/v1/payment_intents', apiKey, {
      method: 'POST',
      body: JSON.stringify(body),
      idempotencyKey: crypto.randomUUID(),
    }),

  getIntent: (apiKey: string, id: string) =>
    request<PaymentIntent>(`/v1/payment_intents/${id}`, apiKey),

  decideIntent: (
    apiKey: string,
    id: string,
    body: { approved_by: string; action?: 'approve' | 'deny' },
  ) =>
    request<PaymentIntent>(`/v1/payment_intents/${id}/approve`, apiKey, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /// Local stand-in for the business's accounting system.
  webhookSink: async (): Promise<ReceivedWebhook[]> => {
    const response = await fetch(`${BASE_URL}/dev/webhook-sink`);
    if (!response.ok) return [];
    const payload = (await response.json()) as { events?: ReceivedWebhook[] };
    return payload.events ?? [];
  },
};

