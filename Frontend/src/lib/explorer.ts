import { truncateHash } from './format';

const LOCAL_RPC =
  (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ??
  'http://127.0.0.1:8899';

/// Solana signatures are 64-byte ed25519, base58, typically 86–88 chars.
export function isOnchainSignature(value: string): boolean {
  const sig = value.trim();
  if (sig.startsWith('demo_')) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{86,88}$/.test(sig);
}

export function explorerTxUrl(signature: string): string {
  const rpc = LOCAL_RPC.toLowerCase();
  if (rpc.includes('devnet')) {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }
  if (rpc.includes('mainnet')) {
    return `https://explorer.solana.com/tx/${signature}`;
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(LOCAL_RPC)}`;
}

export function explorerLabel(signature: string): string {
  return truncateHash(signature, 8, 6);
}
