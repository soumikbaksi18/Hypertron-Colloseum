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
  proveBin: string;
  keysDir: string;
  spendSk: string;
  autoUnshield: boolean;
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  apiKeySaltRounds: number;
  settlementProvider: string;
  settlementLatencyMs: number;
  sessionSecret: string;
  publicAppUrl: string;
  pool: PoolRuntimeConfig;
}

export function loadConfig(): AppConfig {
  hydrateEnv();
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return {
    port: Number(process.env.PORT ?? 4000),
    corsOrigins: origins,
    apiKeySaltRounds: Number(process.env.API_KEY_SALT_ROUNDS ?? 12),
    settlementProvider: process.env.SETTLEMENT_PROVIDER ?? 'mock',
    settlementLatencyMs: Number(process.env.SETTLEMENT_LATENCY_MS ?? 1500),
    sessionSecret: process.env.SESSION_SECRET ?? 'hypertron-dev-session-secret',
    publicAppUrl: process.env.PUBLIC_APP_URL ?? 'http://localhost:5173',
    pool: {
      rpcUrl: process.env.SOLANA_RPC_URL ?? 'http://127.0.0.1:8899',
      relayerKeypair:
        process.env.SOLANA_RELAYER_KEYPAIR ??
        `${process.env.HOME ?? ''}/.config/solana/id.json`,
      mint: process.env.POOL_MINT ?? '',
      programId:
        process.env.POOL_PROGRAM_ID ??
        '9HQsgGDHgYw3N8PGnh9EWrUGRHgmp7tmdGaxuBHHA335',
      proveBin: process.env.POOL_PROVE_BIN ?? 'hypertron-prove',
      keysDir: process.env.POOL_KEYS_DIR ?? `${process.cwd()}/../keys`,
      spendSk: process.env.POOL_SPEND_SK ?? '',
      autoUnshield: (process.env.POOL_AUTO_UNSHIELD ?? 'true') !== 'false',
    },
  };
}

export function poolSettlementEnabled(): boolean {
  return loadConfig().settlementProvider === 'pool';
}

