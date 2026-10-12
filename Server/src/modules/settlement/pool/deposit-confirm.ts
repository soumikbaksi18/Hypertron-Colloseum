export type DepositTxOutcome = 'confirmed' | 'failed' | 'pending' | 'expired';

export type SignatureStatusView = {
  found: boolean;
  confirmationStatus?: string | null;
  err: unknown;
  expired: boolean;
};

export type RecordNoteDecision =
  | { record: true; reason: 'confirmed' }
  | { record: false; keepRecovery: true; reason: 'pending' | 'leaf_not_visible' }
  | { record: false; keepRecovery: false; reason: 'failed' | 'expired' };

export function classifySignatureStatus(
  status: SignatureStatusView,
): DepositTxOutcome {
  if (status.err) return 'failed';
  if (
    status.found &&
    (status.confirmationStatus === 'confirmed' ||
      status.confirmationStatus === 'finalized')
  ) {
    return 'confirmed';
  }
  if (status.expired && !status.found) return 'expired';
  return 'pending';
}

export function decideRecordNote(input: {
  outcome: DepositTxOutcome;
  leafIndex: number;
}): RecordNoteDecision {
  if (input.outcome === 'failed' || input.outcome === 'expired') {
    return { record: false, keepRecovery: false, reason: input.outcome };
  }
  if (input.outcome === 'pending') {
    return { record: false, keepRecovery: true, reason: 'pending' };
  }
  if (input.leafIndex < 0) {
    return { record: false, keepRecovery: true, reason: 'leaf_not_visible' };
  }
  return { record: true, reason: 'confirmed' };
}

export function sameCommitment(a: string, b: string): boolean {
  const left = a.trim().replace(/^0x/i, '').toLowerCase().padStart(64, '0');
  const right = b.trim().replace(/^0x/i, '').toLowerCase().padStart(64, '0');
  return left.length === 64 && right.length === 64 && left === right;
}
