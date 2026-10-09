import { rpcUrl, solanaCluster, type SolanaCluster } from './cluster';
import { truncateHash } from './format';

/// Solana signatures are 64-byte ed25519, base58, typically 86–88 chars.
export function isOnchainSignature(value: string): boolean {
  const sig = value.trim();
  if (sig.startsWith('demo_')) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{86,88}$/.test(sig);
}

export function explorerTxUrl(
  signature: string,
  cluster: SolanaCluster | string = solanaCluster(),
): string {
  const name = cluster === 'devnet' || cluster === 'mainnet' || cluster === 'localnet'
    ? cluster
    : solanaCluster();
  if (name === 'devnet') {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }
  if (name === 'mainnet') {
    return `https://explorer.solana.com/tx/${signature}`;
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl())}`;
}

export function explorerLabel(signature: string): string {
  return truncateHash(signature, 8, 6);
}
