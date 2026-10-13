import * as fs from 'node:fs';
import * as path from 'node:path';

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function applyEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = stripQuotes(line.slice(eq + 1).trim());
  }
}

let envHydrated = false;

function hydrateEnv(): void {
  if (envHydrated) return;
  envHydrated = true;
  applyEnvFile(path.resolve(process.cwd(), '.env'));
  applyEnvFile(path.resolve(__dirname, '../../../.env'));
}

export interface PoolRuntimeConfig {
  rpcUrl: string;
  relayerKeypair: string;
  mint: string;
  programId: string;
  network: string;
  proveBin: string;
  keysDir: string;
  spendSk: string;
  autoUnshield: boolean;
  withdrawDelaySec: number;
  amountBuckets: bigint[];
  indexerUrl: string;
  relayIntervalMs: number;
  relayBatchSize: number;
}

export interface CookieConfig {
  secure: boolean;
  sameSite: 'lax' | 'none' | 'strict';
  domain?: string;
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  apiKeySaltRounds: number;
  settlementProvider: string;
  settlementLatencyMs: number;
  sessionSecret: string;
  publicAppUrl: string;
  cookie: CookieConfig;
  pool: PoolRuntimeConfig;
}

export function clusterFromRpc(rpcUrl: string): string {
  const rpc = rpcUrl.toLowerCase();
  if (rpc.includes('devnet')) return 'devnet';
  if (rpc.includes('mainnet')) return 'mainnet';
  if (rpc.includes('127.0.0.1') || rpc.includes('localhost') || rpc.includes('localnet')) {
    return 'localnet';
  }
  return 'devnet';
}

function cookieConfig(publicAppUrl: string): CookieConfig {
  const https = publicAppUrl.startsWith('https://');
  const production = (process.env.NODE_ENV ?? '') === 'production';
  const secureEnv = process.env.COOKIE_SECURE;
  const secure =
    secureEnv === 'true'
      ? true
      : secureEnv === 'false'
        ? false
        : https || production;
  const sameSiteEnv = (process.env.COOKIE_SAMESITE ?? '').toLowerCase();
  const sameSite: CookieConfig['sameSite'] =
    sameSiteEnv === 'none' || sameSiteEnv === 'lax' || sameSiteEnv === 'strict'
      ? sameSiteEnv
      : secure
        ? 'none'
        : 'lax';
  const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;
  return { secure: sameSite === 'none' ? true : secure, sameSite, domain };
}

export function loadConfig(): AppConfig {
  hydrateEnv();
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const publicAppUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
  const rpcUrl = process.env.SOLANA_RPC_URL ?? 'http://127.0.0.1:8899';
  return {
    port: Number(process.env.PORT ?? 4000),
    corsOrigins: origins,
    apiKeySaltRounds: Number(process.env.API_KEY_SALT_ROUNDS ?? 12),
    settlementProvider: process.env.SETTLEMENT_PROVIDER ?? 'mock',
    settlementLatencyMs: Number(process.env.SETTLEMENT_LATENCY_MS ?? 1500),
    sessionSecret: process.env.SESSION_SECRET ?? 'hypertron-dev-session-secret',
    publicAppUrl,
    cookie: cookieConfig(publicAppUrl),
    pool: {
      rpcUrl,
      relayerKeypair:
        process.env.SOLANA_RELAYER_KEYPAIR ??
        process.env.SOLANA_RELAYER_SECRET ??
        `${process.env.HOME ?? ''}/.config/solana/id.json`,
      mint: process.env.POOL_MINT ?? '',
      programId:
        process.env.POOL_PROGRAM_ID ??
        '9HQsgGDHgYw3N8PGnh9EWrUGRHgmp7tmdGaxuBHHA335',
      network: process.env.POOL_NETWORK ?? clusterFromRpc(rpcUrl),
      proveBin: process.env.POOL_PROVE_BIN ?? 'hypertron-prove',
      keysDir: process.env.POOL_KEYS_DIR ?? `${process.cwd()}/../keys`,
      spendSk: process.env.POOL_SPEND_SK ?? '',
      autoUnshield: (process.env.POOL_AUTO_UNSHIELD ?? 'false') === 'true',
      withdrawDelaySec: Number(process.env.POOL_WITHDRAW_DELAY_SEC ?? 60),
      amountBuckets: parseBuckets(
        process.env.POOL_AMOUNT_BUCKETS ??
          '100000,500000,1000000,5000000,10000000',
      ),
      indexerUrl: (process.env.POOL_INDEXER_URL ?? 'http://127.0.0.1:4002').replace(
        /\/$/,
        '',
      ),
      relayIntervalMs: Number(process.env.POOL_RELAY_INTERVAL_MS ?? 15_000),
      relayBatchSize: Number(process.env.POOL_RELAY_BATCH_SIZE ?? 8),
    },
  };
}

function parseBuckets(raw: string): bigint[] {
  const buckets = raw
    .split(',')
    .map((part) => BigInt(part.trim()))
    .filter((value) => value > 0n)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return buckets.length > 0 ? buckets : [1_000_000n];
}

export function poolSettlementEnabled(): boolean {
  return loadConfig().settlementProvider === 'pool';
}

