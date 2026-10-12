#!/usr/bin/env bash
# Deploy hypertron_pool to Solana devnet and print Render env values.
# Insecure Groth16 keys — public devnet only, never mainnet.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC="${SOLANA_RPC_URL:-https://api.devnet.solana.com}"
WALLET="${SOLANA_RELAYER_KEYPAIR:-$HOME/.config/solana/id.json}"
PROGRAM_ID="${POOL_PROGRAM_ID:-9HQsgGDHgYw3N8PGnh9EWrUGRHgmp7tmdGaxuBHHA335}"
# Circle USDC on Solana devnet
MINT="${POOL_MINT:-4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU}"
KEYS="${POOL_KEYS_DIR:-$ROOT/keys}"

if [[ ! -f "$WALLET" ]]; then
  echo "missing relayer keypair at $WALLET" >&2
  exit 1
fi

RELAYER="$(solana-keygen pubkey "$WALLET")"
echo "rpc      $RPC"
echo "relayer  $RELAYER"
echo "program  $PROGRAM_ID"
echo "mint     $MINT"

print_handoff() {
  echo
  echo "======== Render / Supabase (paste these) ========"
  echo "Do NOT use Atlas Mongo or api.hypertron.xyz."
  echo "Template: $ROOT/scripts/render.env.example"
  echo
  echo "--- Shared ---"
  echo "SOLANA_RPC_URL=$RPC"
  echo "POOL_PROGRAM_ID=$PROGRAM_ID"
  echo "POOL_MINT=$MINT"
  echo "POOL_NETWORK=devnet"
  echo "relayer pubkey: $RELAYER"
  echo "SOLANA_RELAYER_KEYPAIR=<paste contents of $WALLET>"
  echo
  echo "--- api (hypertron-colosseum-api) ---"
  echo "DATABASE_URL=<new Supabase Postgres URI, sslmode=require>"
  echo "CORS_ORIGINS=<https://your-frontend.onrender.com>"
  echo "PUBLIC_APP_URL=<https://your-frontend.onrender.com>"
  echo "POOL_INDEXER_URL=<https://your-indexer.onrender.com>"
  echo "COOKIE_SECURE=true"
  echo "COOKIE_SAMESITE=none"
  echo "SETTLEMENT_PROVIDER=pool"
  echo "POOL_AUTO_UNSHIELD=false"
  echo
  echo "--- indexer ---"
  echo "INDEXER_DATA_DIR=/var/data"
  echo "CORS_ORIGINS=<https://your-frontend.onrender.com>"
  echo
  echo "--- web (build-time) ---"
  echo "VITE_HYPERTRON_API_URL=<https://your-api.onrender.com>"
  echo "VITE_SOLANA_RPC_URL=$RPC"
  echo "VITE_INDEXER_URL=<https://your-indexer.onrender.com>"
  echo "VITE_INDEXER_NETWORK=devnet"
  echo
  echo "Phantom: Devnet. Customers need USDC mint $MINT."
  echo "Fund relayer: https://faucet.solana.com  then  $0"
}

echo "airdropping (devnet faucet is lossy)…"
for _ in 1 2 3; do
  solana airdrop 2 "$RELAYER" --url "$RPC" >/dev/null 2>&1 && break || true
  sleep 1
done
BALANCE="$(solana balance "$RELAYER" --url "$RPC")"
echo "balance  $BALANCE"
LAMPORTS="$(solana balance "$RELAYER" --url "$RPC" --lamports | awk '{print $1}')"
if [[ "${LAMPORTS:-0}" -lt 2500000000 ]]; then
  echo >&2
  echo "Need ~3+ SOL on $RELAYER to deploy. Public faucet returned 0 (rate limit)." >&2
  echo "Fund https://faucet.solana.com (devnet) for $RELAYER then re-run: $0" >&2
  print_handoff
  exit 2
fi

if [[ ! -f "$KEYS/deposit.vk.json" || ! -f "$KEYS/unshield.vk.json" ]]; then
  echo "generating insecure-dev proving keys…"
  POOL_KEYS_DIR="$KEYS" "$ROOT/scripts/pool-dev-keys.sh"
else
  echo "using existing keys in $KEYS"
fi

echo "building + deploying hypertron_pool…"
cd "$ROOT"
# cargo-build-sbf default (v1.43 / rustc 1.79) cannot parse edition 2024 crates.
cargo-build-sbf --tools-version v1.52 --manifest-path programs/hypertron_pool/Cargo.toml
SO="$ROOT/target/deploy/hypertron_pool.so"
if [[ ! -f "$SO" ]]; then
  SO="$(find "$ROOT/target" -name hypertron_pool.so | head -1)"
fi
solana program deploy "$SO" \
  --program-id "$ROOT/target/deploy/hypertron_pool-keypair.json" \
  --url "$RPC" \
  --keypair "$WALLET"

echo "initializing pool (VKs + vault)…"
cd "$ROOT/Server"
SOLANA_RPC_URL="$RPC" \
SOLANA_RELAYER_KEYPAIR="$WALLET" \
POOL_PROGRAM_ID="$PROGRAM_ID" \
POOL_MINT="$MINT" \
POOL_NETWORK=devnet \
POOL_KEYS_DIR="$KEYS" \
SETTLEMENT_PROVIDER=pool \
npm run pool:init

print_handoff
