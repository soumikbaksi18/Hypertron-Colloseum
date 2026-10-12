export type AccountKind = 'business' | 'individual';

const keyFor = (walletAddress: string) => `hypertron:account-kind:v1:${walletAddress}`;

export function getAccountKind(walletAddress: string): AccountKind | null {
  try {
    const stored = localStorage.getItem(keyFor(walletAddress));
    if (stored === 'business' || stored === 'individual') return stored;
  } catch {
    return null;
  }
  return null;
}

export function setAccountKind(walletAddress: string, kind: AccountKind) {
  localStorage.setItem(keyFor(walletAddress), kind);
}
