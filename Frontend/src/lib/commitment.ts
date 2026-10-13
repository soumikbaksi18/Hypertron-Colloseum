export function normalizeFieldHex(hex: string): string {
  return hex.trim().replace(/^0x/i, '').toLowerCase().padStart(64, '0');
}

export function sameFieldHex(a: string, b: string): boolean {
  const left = normalizeFieldHex(a);
  const right = normalizeFieldHex(b);
  return left.length === 64 && right.length === 64 && left === right;
}

export function assertDepositCommitments(input: {
  local: string;
  proved: string;
  prepared: string;
  onChain?: string | null;
  localAmount: string;
  preparedAmount: string;
}): void {
  if (input.localAmount !== input.preparedAmount) {
    throw new Error(
      'Prepared deposit amount does not match the amount you proved.',
    );
  }
  if (!sameFieldHex(input.local, input.proved)) {
    throw new Error(
      'Proved commitment does not match the locally recomputed commitment.',
    );
  }
  if (!sameFieldHex(input.local, input.prepared)) {
    throw new Error(
      'Server prepared a different commitment than the one you proved.',
    );
  }
  if (input.onChain && !sameFieldHex(input.local, input.onChain)) {
    throw new Error(
      'On-chain leaf does not match the locally recomputed commitment.',
    );
  }
}
