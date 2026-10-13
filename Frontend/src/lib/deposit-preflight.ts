import { Connection, PublicKey } from '@solana/web3.js';

import {
  CLUSTER_GENESIS,
  CLUSTER_USDC_MINT,
  clusterLabel,
  clusterSwitchInstruction,
  parseCluster,
  rpcUrl,
  solanaCluster,
  type SolanaCluster,
} from './cluster';
import { getPhantom, type PhantomProvider } from './phantom';
import {
  formatUsdcAmount,
  formatUsdcMinor,
  parseBucketList,
  parseUsdcInput,
  snapAmountUp,
  USDC_DECIMALS,
  USDC_MAX_MINOR,
} from './usdc-amount';
import { walletApi, type PoolConfig } from './wallet';

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export type DepositPreflightCode =
  | 'amount'
  | 'wallet'
  | 'cluster'
  | 'mint'
  | 'balance'
  | 'config'
  | 'rpc';

export type DepositDisclosure = {
  amount: string;
  sourceWallet: string;
  cluster: string;
  mint: string;
  timing: string;
  metadata: string[];
};

export type DepositPreflight =
  | {
      ok: true;
      code: null;
      error: null;
      cluster: SolanaCluster;
      mint: string;
      mintDecimals: number;
      tokenProgram: string;
      payer: string;
      amountMinor: bigint;
      amountSnapped: bigint;
      snapped: boolean;
      minMinor: bigint;
      maxMinor: bigint;
      availableMinor: bigint;
      programId: string;
      rpc: string;
      walletClusterHint: SolanaCluster | null;
      disclosure: DepositDisclosure;
    }
  | {
      ok: false;
      code: DepositPreflightCode;
      error: string;
      cluster: SolanaCluster;
      mint: string | null;
      payer: string | null;
      amountMinor: bigint | null;
      amountSnapped: bigint | null;
      snapped: boolean;
      minMinor: bigint | null;
      maxMinor: bigint | null;
      availableMinor: bigint | null;
      programId: string | null;
      disclosure: DepositDisclosure | null;
    };

export class DepositPreflightError extends Error {
  readonly preflight: Extract<DepositPreflight, { ok: false }>;

  constructor(preflight: Extract<DepositPreflight, { ok: false }>) {
    super(preflight.error);
    this.name = 'DepositPreflightError';
    this.preflight = preflight;
  }
}

export function detectPhantomCluster(
  phantom: PhantomProvider | null = getPhantom(),
): SolanaCluster | null {
  if (!phantom) return null;
  const ext = phantom as PhantomProvider & {
    network?: unknown;
    rpcEndpoint?: unknown;
  };
  if (typeof ext.network === 'string') {
    const fromName = parseCluster(ext.network);
    if (fromName) return fromName;
    const lower = ext.network.toLowerCase();
    if (lower.includes('devnet')) return 'devnet';
    if (lower.includes('mainnet')) return 'mainnet';
    if (lower.includes('localhost') || lower.includes('local')) return 'localnet';
  }
  if (typeof ext.rpcEndpoint === 'string') {
    const rpc = ext.rpcEndpoint.toLowerCase();
    if (rpc.includes('devnet')) return 'devnet';
    if (rpc.includes('mainnet')) return 'mainnet';
    if (
      rpc.includes('127.0.0.1') ||
      rpc.includes('localhost') ||
      rpc.includes('localnet')
    ) {
      return 'localnet';
    }
  }
  return null;
}

function fail(
  code: DepositPreflightCode,
  error: string,
  extra: Partial<Extract<DepositPreflight, { ok: false }>> = {},
): Extract<DepositPreflight, { ok: false }> {
  return {
    ok: false,
    code,
    error,
    cluster: extra.cluster ?? solanaCluster(),
    mint: extra.mint ?? null,
    payer: extra.payer ?? null,
    amountMinor: extra.amountMinor ?? null,
    amountSnapped: extra.amountSnapped ?? null,
    snapped: extra.snapped ?? false,
    minMinor: extra.minMinor ?? null,
    maxMinor: extra.maxMinor ?? null,
    availableMinor: extra.availableMinor ?? null,
    programId: extra.programId ?? null,
    disclosure: extra.disclosure ?? null,
  };
}

function assertPubkey(
  value: string,
  label: string,
  code: DepositPreflightCode = 'wallet',
): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new DepositPreflightError(
      fail(code, `${label} is not a valid Solana address.`),
    );
  }
}

function disclosureOf(input: {
  amountSnapped: bigint;
  amountMinor: bigint;
  decimals: number;
  payer: string;
  cluster: SolanaCluster;
  mint: string;
  programId: string;
}): DepositDisclosure {
  const amount = formatUsdcAmount(input.amountSnapped, input.decimals);
  const original =
    input.amountSnapped !== input.amountMinor
      ? ` (pool rounds ${formatUsdcMinor(input.amountMinor, input.decimals)} up to a public bucket)`
      : '';
  return {
    amount: `${amount}${original}`,
    sourceWallet: input.payer,
    cluster: clusterLabel(input.cluster),
    mint: input.mint,
    timing:
      'The Solana block time is public as soon as the deposit confirms. There is no delayed or hidden timestamp.',
    metadata: [
      `${amount} leaves your token account in a public SPL transfer into the pool vault.`,
      `Your wallet ${input.payer} is the on-chain signer and source.`,
      `Mint ${input.mint} and program ${input.programId} appear in the transaction accounts.`,
      'The note commitment, Merkle leaf index, and transaction signature are public. The spend key is not.',
    ],
  };
}

async function loadPoolConfig(): Promise<PoolConfig> {
  try {
    return await walletApi.config();
  } catch {
    throw new DepositPreflightError(
      fail('config', 'Could not load pool configuration. Try again in a moment.'),
    );
  }
}

function resolveCluster(config: PoolConfig): SolanaCluster {
  const fromConfig = parseCluster(config.network);
  const fromRpc = solanaCluster();
  if (fromConfig && fromConfig !== fromRpc) {
    throw new DepositPreflightError(
      fail(
        'cluster',
        `This app is pointed at ${clusterLabel(fromRpc)}, but the pool is configured for ${clusterLabel(fromConfig)}.`,
        { cluster: fromRpc },
      ),
    );
  }
  return fromConfig ?? fromRpc;
}

async function assertRpcCluster(
  connection: Connection,
  expected: SolanaCluster,
): Promise<void> {
  const want = CLUSTER_GENESIS[expected];
  if (!want) return;
  let genesis: string;
  try {
    genesis = await connection.getGenesisHash();
  } catch {
    throw new DepositPreflightError(
      fail(
        'rpc',
        `Could not reach ${clusterLabel(expected)} at ${rpcUrl()}.`,
        { cluster: expected },
      ),
    );
  }
  if (genesis !== want) {
    throw new DepositPreflightError(
      fail(
        'cluster',
        `The configured RPC is not ${clusterLabel(expected)}. Check VITE_SOLANA_RPC_URL.`,
        { cluster: expected },
      ),
    );
  }
}

function assertPhantomCluster(
  expected: SolanaCluster,
  hint: SolanaCluster | null,
): void {
  if (hint && hint !== expected) {
    throw new DepositPreflightError(
      fail(
        'cluster',
        `${clusterSwitchInstruction(expected)} Phantom is on ${clusterLabel(hint)}.`,
        { cluster: expected },
      ),
    );
  }
}

async function readMint(connection: Connection, mint: PublicKey) {
  let info: Awaited<ReturnType<Connection['getParsedAccountInfo']>>;
  try {
    info = await connection.getParsedAccountInfo(mint, 'confirmed');
  } catch {
    throw new DepositPreflightError(
      fail('rpc', 'Could not read the USDC mint from Solana.', {
        mint: mint.toBase58(),
      }),
    );
  }
  const value = info.value;
  if (!value) {
    throw new DepositPreflightError(
      fail(
        'mint',
        `USDC mint ${mint.toBase58()} does not exist on this cluster.`,
        { mint: mint.toBase58() },
      ),
    );
  }
  const owner = value.owner.toBase58();
  if (owner !== TOKEN_PROGRAM_ID && owner !== TOKEN_2022_PROGRAM_ID) {
    throw new DepositPreflightError(
      fail('mint', 'The configured mint is not an SPL or Token-2022 mint.', {
        mint: mint.toBase58(),
      }),
    );
  }
  const data = value.data;
  if (typeof data !== 'object' || !data || !('parsed' in data)) {
    throw new DepositPreflightError(
      fail('mint', 'Could not parse the configured mint account.', {
        mint: mint.toBase58(),
      }),
    );
  }
  const parsed = data.parsed as { type?: string; info?: { decimals?: number } };
  if (parsed.type !== 'mint') {
    throw new DepositPreflightError(
      fail('mint', 'The configured address is not a token mint.', {
        mint: mint.toBase58(),
      }),
    );
  }
  const decimals = parsed.info?.decimals;
  if (decimals !== USDC_DECIMALS) {
    throw new DepositPreflightError(
      fail(
        'mint',
        `This mint uses ${decimals ?? 'unknown'} decimals. Hypertron only accepts USDC (${USDC_DECIMALS} decimals).`,
        { mint: mint.toBase58() },
      ),
    );
  }
  return { decimals, tokenProgram: owner };
}

async function readAvailable(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
): Promise<bigint> {
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
      mint,
    });
    let total = 0n;
    for (const row of accounts.value) {
      const data = row.account.data;
      if (typeof data !== 'object' || !data || !('parsed' in data)) continue;
      const amount = (
        data.parsed as { info?: { tokenAmount?: { amount?: string } } }
      ).info?.tokenAmount?.amount;
      if (typeof amount === 'string' && /^\d+$/.test(amount)) {
        total += BigInt(amount);
      }
    }
    return total;
  } catch {
    throw new DepositPreflightError(
      fail('rpc', 'Could not read your USDC balance on this cluster.', {
        mint: mint.toBase58(),
        payer: owner.toBase58(),
      }),
    );
  }
}

export async function runDepositPreflight(input: {
  payer: string;
  amountMinor?: bigint;
  amountInput?: string;
  expectedPayer?: string;
}): Promise<DepositPreflight> {
  const cluster = solanaCluster();
  try {
    if (!input.payer.trim()) {
      return fail('wallet', 'Connect Phantom before adding money.');
    }
    const payer = assertPubkey(input.payer.trim(), 'Wallet');
    if (input.expectedPayer && input.expectedPayer !== payer.toBase58()) {
      return fail(
        'wallet',
        `Phantom is ${input.payer}. Sign in with that wallet, or switch Phantom back to ${input.expectedPayer}.`,
        { payer: payer.toBase58() },
      );
    }

    const config = await loadPoolConfig();
    const expected = resolveCluster(config);
    const mintRaw = (config.mint ?? '').trim();
    if (!mintRaw) {
      return fail(
        'config',
        'Pool USDC mint is not configured.',
        { cluster: expected, payer: payer.toBase58(), programId: config.program_id },
      );
    }
    const mint = assertPubkey(mintRaw, 'Pool mint', 'mint');
    const known = CLUSTER_USDC_MINT[expected];
    if (known && known !== mint.toBase58()) {
      return fail(
        'mint',
        `This pool is not the USDC mint for ${clusterLabel(expected)}.`,
        {
          cluster: expected,
          mint: mint.toBase58(),
          payer: payer.toBase58(),
          programId: config.program_id,
        },
      );
    }

    const buckets = parseBucketList(config.amount_buckets);
    const minMinor = buckets[0] ?? 1n;
    const maxMinor = USDC_MAX_MINOR;

    let amountMinor = input.amountMinor ?? null;
    if (amountMinor === null) {
      const parsed = parseUsdcInput(input.amountInput ?? '', USDC_DECIMALS);
      if (!parsed.ok) {
        return fail('amount', parsed.error, {
          cluster: expected,
          mint: mint.toBase58(),
          payer: payer.toBase58(),
          minMinor,
          maxMinor,
          programId: config.program_id,
        });
      }
      amountMinor = parsed.minor;
    }
    if (amountMinor <= 0n) {
      return fail('amount', 'Enter an amount greater than zero.', {
        cluster: expected,
        mint: mint.toBase58(),
        payer: payer.toBase58(),
        amountMinor,
        minMinor,
        maxMinor,
        programId: config.program_id,
      });
    }
    if (amountMinor > maxMinor) {
      return fail('amount', 'Amount exceeds the maximum supported USDC value.', {
        cluster: expected,
        mint: mint.toBase58(),
        payer: payer.toBase58(),
        amountMinor,
        minMinor,
        maxMinor,
        programId: config.program_id,
      });
    }

    const amountSnapped = snapAmountUp(amountMinor, buckets);
    const snapped = amountSnapped !== amountMinor;
    if (amountSnapped < minMinor) {
      return fail(
        'amount',
        `Minimum deposit is ${formatUsdcAmount(minMinor)}.`,
        {
          cluster: expected,
          mint: mint.toBase58(),
          payer: payer.toBase58(),
          amountMinor,
          amountSnapped,
          snapped,
          minMinor,
          maxMinor,
          programId: config.program_id,
        },
      );
    }

    const hint = detectPhantomCluster();
    assertPhantomCluster(expected, hint);

    const connection = new Connection(rpcUrl(), 'confirmed');
    await assertRpcCluster(connection, expected);
    const mintInfo = await readMint(connection, mint);
    const availableMinor = await readAvailable(connection, payer, mint);

    const disclosure = disclosureOf({
      amountSnapped,
      amountMinor,
      decimals: mintInfo.decimals,
      payer: payer.toBase58(),
      cluster: expected,
      mint: mint.toBase58(),
      programId: config.program_id,
    });

    if (availableMinor < amountSnapped) {
      return fail(
        'balance',
        `Wallet has ${formatUsdcAmount(availableMinor, mintInfo.decimals)} USDC on ${clusterLabel(expected)}. This deposit needs ${formatUsdcAmount(amountSnapped, mintInfo.decimals)}. ${clusterSwitchInstruction(expected)}`,
        {
          cluster: expected,
          mint: mint.toBase58(),
          payer: payer.toBase58(),
          amountMinor,
          amountSnapped,
          snapped,
          minMinor,
          maxMinor,
          availableMinor,
          programId: config.program_id,
          disclosure,
        },
      );
    }

    return {
      ok: true,
      code: null,
      error: null,
      cluster: expected,
      mint: mint.toBase58(),
      mintDecimals: mintInfo.decimals,
      tokenProgram: mintInfo.tokenProgram,
      payer: payer.toBase58(),
      amountMinor,
      amountSnapped,
      snapped,
      minMinor,
      maxMinor,
      availableMinor,
      programId: config.program_id,
      rpc: rpcUrl(),
      walletClusterHint: hint,
      disclosure,
    };
  } catch (error) {
    if (error instanceof DepositPreflightError) return error.preflight;
    const message = error instanceof Error ? error.message : 'Deposit check failed.';
    return fail('rpc', message, { cluster, payer: input.payer || null });
  }
}
