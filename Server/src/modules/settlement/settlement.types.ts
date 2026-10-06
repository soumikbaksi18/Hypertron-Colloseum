export const PRIVATE_SETTLEMENT_PROVIDER = Symbol('PRIVATE_SETTLEMENT_PROVIDER');

export interface SettleInput {
  intentPublicId: string;
  payeeRef: string;
  amountMinor: bigint;
  currency: string;
  /// Business viewing key (public half) so the payer can address a note the
  /// business can later scan for reconciliation.
  viewPub: string | null;
  /// SPL destination used when the pool unshields after the private hop.
  payoutAddress: string | null;
}

/// What the caller gets back. Deliberately opaque: no proofs, no notes, no
/// nullifier preimages, no Merkle paths. An agent integrates against this shape
/// and never learns the cryptography underneath.
export interface SettlementResult {
  settlementId: string;
  commitment: string;
  nullifier: string;
  txSignature: string;
  /// Lets the business locate this payment with its viewing key without
  /// revealing the counterparty or amount publicly.
  viewKeyHint: string;
}

/// The seam. `MockSettlementProvider` or `SolanaPoolSettlementProvider`
/// (`hypertron_pool`) satisfy it without the API or agent contract changing.
export interface PrivateSettlementProvider {
  readonly name: string;
  settle(input: SettleInput): Promise<SettlementResult>;
}
