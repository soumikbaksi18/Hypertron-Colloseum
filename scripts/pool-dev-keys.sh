#!/usr/bin/env bash
# Insecure Groth16 setup for localnet. Do not use these keys in production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYS="${POOL_KEYS_DIR:-$ROOT/keys}"
SEED="${HYPERTRON_INSECURE_DEV_SEED:-7}"
PROVE="${POOL_PROVE_BIN:-}"

if [[ -z "$PROVE" ]]; then
  if [[ -x "$ROOT/target/release/hypertron-prove" ]]; then
    PROVE="$ROOT/target/release/hypertron-prove"
  elif [[ -x "$ROOT/target/debug/hypertron-prove" ]]; then
    PROVE="$ROOT/target/debug/hypertron-prove"
  else
    echo "building hypertron-prove (release)…"
    cargo build -p hypertron-prover --release --bin hypertron-prove
    PROVE="$ROOT/target/release/hypertron-prove"
  fi
fi

mkdir -p "$KEYS"
export HYPERTRON_INSECURE_DEV_SETUP=1

setup() {
  local circuit="$1"
  local stem="${2:-$1}"
  local pk="$KEYS/${stem}.pk.bin"
  local vk="$KEYS/${stem}.vk.json"
  if [[ -f "$pk" && -f "$vk" ]]; then
    echo "skip $stem (already in $KEYS)"
    return
  fi
  echo "setup $circuit → $stem…"
  "$PROVE" setup --circuit "$circuit" --depth 20 --insecure-dev-seed "$SEED" \
    --pk-out "$pk" --vk-out "$vk"
}

setup deposit
setup unshield
setup transfer
setup transfer-2 transfer2

if [[ ! -f "$KEYS/spend.sk" ]]; then
  openssl rand -hex 32 | sed 's/^/0x/' > "$KEYS/spend.sk"
  echo "wrote $KEYS/spend.sk"
fi

echo
echo "keys in $KEYS"
echo "next:"
echo "  1. deploy hypertron_pool to localnet"
echo "  2. set POOL_MINT to an SPL mint the relayer holds"
echo "  3. cd Server && SETTLEMENT_PROVIDER=pool npm run pool:init"
echo "  4. SETTLEMENT_PROVIDER=pool npm run start:dev"
