/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HYPERTRON_API_URL?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_INDEXER_URL?: string;
  readonly VITE_INDEXER_NETWORK?: string;
  readonly VITE_KEYS_BASE_URL?: string;
  readonly VITE_WASM_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
