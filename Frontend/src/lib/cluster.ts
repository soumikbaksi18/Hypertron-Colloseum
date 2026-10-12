const RPC =
  (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ??
  'https://api.devnet.solana.com';

export type SolanaCluster = 'localnet' | 'devnet' | 'mainnet';

export function rpcUrl(): string {
  return RPC;
}

export function solanaCluster(): SolanaCluster {
  const rpc = RPC.toLowerCase();
  if (rpc.includes('devnet')) return 'devnet';
  if (rpc.includes('mainnet')) return 'mainnet';
  if (
    rpc.includes('127.0.0.1') ||
    rpc.includes('localhost') ||
    rpc.includes('localnet')
  ) {
    return 'localnet';
  }
  return 'devnet';
}

export function indexerNetwork(): string {
  return (
    (import.meta.env.VITE_INDEXER_NETWORK as string | undefined)?.trim() ||
    solanaCluster()
  );
}

/** Published Solana genesis hashes. localnet is validator-specific. */
export const CLUSTER_GENESIS: Record<SolanaCluster, string | null> = {
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  mainnet: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
  localnet: null,
};

/** Cluster USDC mints this app is willing to vault. localnet comes from pool config only. */
export const CLUSTER_USDC_MINT: Partial<Record<SolanaCluster, string>> = {
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};

export function parseCluster(value: string | undefined | null): SolanaCluster | null {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw === 'devnet' || raw === 'devnet-beta') return 'devnet';
  if (raw === 'mainnet' || raw === 'mainnet-beta') return 'mainnet';
  if (raw === 'localnet' || raw === 'localhost' || raw === 'local') return 'localnet';
  return null;
}

export function clusterLabel(cluster: SolanaCluster): string {
  if (cluster === 'mainnet') return 'Solana mainnet';
  if (cluster === 'localnet') return 'Solana localnet';
  return 'Solana devnet';
}

export function clusterSwitchInstruction(cluster: SolanaCluster): string {
  if (cluster === 'devnet') return 'Switch Phantom to Devnet.';
  if (cluster === 'mainnet') return 'Switch Phantom to Mainnet.';
  return 'Switch Phantom to Localhost (http://127.0.0.1:8899).';
}

export function phantomPayHint(): string {
  const cluster = solanaCluster();
  if (cluster === 'devnet') {
    return 'Switch Phantom to Devnet. Confirm the deposit; we land it on Solana devnet. The merchant withdraws from the pool later.';
  }
  if (cluster === 'mainnet') {
    return 'Switch Phantom to Mainnet. Confirm the shielded deposit. The merchant withdraws from the pool later.';
  }
  return 'Switch Phantom to Localhost (http://127.0.0.1:8899). A red mainnet simulation warning is expected — confirm anyway; we land the signed deposit on localnet. The merchant withdraws from the pool to any address.';
}

export function phantomClusterError(): string {
  const cluster = solanaCluster();
  if (cluster === 'devnet') {
    return 'Phantom simulated this on the wrong cluster. Switch it to Devnet, then Shield and pay again.';
  }
  if (cluster === 'mainnet') {
    return 'Phantom simulated this on the wrong cluster. Switch it to Mainnet, then Shield and pay again.';
  }
  return 'Phantom simulated this on the wrong cluster. Switch it to Localhost (http://127.0.0.1:8899), then Shield and pay again. If it still warns, confirm anyway — we submit the signed deposit to localnet.';
}
