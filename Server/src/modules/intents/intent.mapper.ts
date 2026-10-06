import { PaymentIntent } from '@prisma/client';

/// The machine-readable settlement result an agent integrates against.
/// Amounts are strings so large minor-unit values survive JSON intact.
export interface IntentResponse {
  id: string;
  object: 'payment_intent';
  status: string;
  agent_id: string;
  payee_ref: string;
  amount_minor: string;
  currency: string;
  reference: string | null;
  authorization: {
    decision: string | null;
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

export function toIntentResponse(intent: PaymentIntent): IntentResponse {
  return {
    id: intent.publicId,
    object: 'payment_intent',
    status: intent.status,
    agent_id: intent.agentId,
    payee_ref: intent.payeeRef,
    amount_minor: intent.amountMinor.toString(),
    currency: intent.currency,
    reference: intent.reference,
    authorization: {
      decision: intent.policyDecision,
      reasons: intent.policyReasons,
      evaluated_at: intent.policyEvaluatedAt?.toISOString() ?? null,
      approved_by: intent.approvedBy,
      approved_at: intent.approvedAt?.toISOString() ?? null,
    },
    settlement: {
      settlement_id: intent.settlementId,
      commitment: intent.commitment,
      nullifier: intent.nullifier,
      tx_signature: intent.txSignature,
      view_key_hint: intent.viewKeyHint,
      settled_at: intent.settledAt?.toISOString() ?? null,
    },
    failure: intent.failureCode
      ? { code: intent.failureCode, message: intent.failureMessage ?? '' }
      : null,
    created_at: intent.createdAt.toISOString(),
    updated_at: intent.updatedAt.toISOString(),
  };
}
