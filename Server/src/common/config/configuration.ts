export interface AppConfig {
  port: number;
  corsOrigins: string[];
  apiKeySaltRounds: number;
  settlementProvider: string;
  settlementLatencyMs: number;
}

export function loadConfig(): AppConfig {
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
  };
}
