import { PublicKey } from '@solana/web3.js';

import { indexerNetwork } from './cluster';
import { BASE_URL, parseApi, unreachable } from './http';
import { randomFrHex } from './shield-keys';

function assetUrl(path: string): string {
  const keys = (import.meta.env.VITE_KEYS_BASE_URL ?? '').replace(/\/$/, '');
  const wasm = (import.meta.env.VITE_WASM_BASE_URL ?? '').replace(/\/$/, '');
  if (path.startsWith('/wasm/') && wasm) return `${wasm}${path}`;
  if (path.startsWith('/keys/') && keys) return `${keys}${path}`;
  const shared = keys || wasm;
  return shared ? `${shared}${path}` : path;
}

type WasmApi = {
  deposit_proof: (pk: Uint8Array, params: string) => string;
  unshield_proof: (pk: Uint8Array, params: string) => string;
  transfer_2_proof?: (pk: Uint8Array, params: string) => string;
  transfer_proof?: (pk: Uint8Array, params: string) => string;
  encrypt_note_blob: (
    view: string,
    ownerPk: string,
    k: string,
    v: string,
  ) => string;
  decrypt_note_blob: (viewSecret: string, blob: string) => string;
  owner_pk: (spendSk: string) => string;
};

function pubkeyToFrHex(address: string): string {
  const bytes = new PublicKey(address).toBytes();
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}

let wasm: WasmApi | null | undefined;
const pkCache = new Map<string, Uint8Array>();

async function tryWasm(): Promise<WasmApi | null> {
  if (wasm !== undefined) return wasm;
  try {
    const mod = (await import(
      /* @vite-ignore */ assetUrl('/wasm/hypertron_prover.js')
    )) as {
      default?: () => Promise<unknown>;
      deposit_proof: WasmApi['deposit_proof'];
      unshield_proof: WasmApi['unshield_proof'];
      transfer_2_proof?: WasmApi['transfer_2_proof'];
      transfer_proof?: WasmApi['transfer_proof'];
      encrypt_note_blob: WasmApi['encrypt_note_blob'];
      decrypt_note_blob: WasmApi['decrypt_note_blob'];
      owner_pk: WasmApi['owner_pk'];
    };
    if (mod.default) await mod.default();
    wasm = {
      deposit_proof: mod.deposit_proof,
      unshield_proof: mod.unshield_proof,
      transfer_2_proof: mod.transfer_2_proof,
      transfer_proof: mod.transfer_proof,
      encrypt_note_blob: mod.encrypt_note_blob,
      decrypt_note_blob: mod.decrypt_note_blob,
      owner_pk: mod.owner_pk,
    };
    return wasm;
  } catch {
    wasm = null;
    return null;
  }
}

async function pkBytes(
  name: 'deposit' | 'unshield' | 'transfer2' | 'transfer',
): Promise<Uint8Array> {
  const cached = pkCache.get(name);
  if (cached) return cached;
  const names = name === 'transfer2' ? ['transfer2', 'transfer'] : [name];
  for (const file of names) {
    const response = await fetch(assetUrl(`/keys/${file}.pk.bin`));
    if (!response.ok) continue;
    const buf = new Uint8Array(await response.arrayBuffer());
    pkCache.set(name, buf);
    return buf;
  }
  throw new Error(`Could not load ${name} proving key`);
}

async function postJson<T>(path: string, body: unknown, cookie = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: cookie ? 'include' : 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    unreachable();
  }
  return parseApi<T>(response);
}

export async function proveDeposit(input: {
  ownerPk: string;
  k: string;
  amount: string;
}): Promise<{ commitment: string; proof: string }> {
  const api = await tryWasm();
  if (api) {
    const pk = await pkBytes('deposit');
    const json = JSON.parse(
      api.deposit_proof(
        pk,
        JSON.stringify({
          owner_pk: input.ownerPk,
          k: input.k,
          amount: input.amount,
        }),
      ),
    ) as { commitment: string; proof: string };
    return json;
  }
  return postJson('/v1/pool/prove/deposit', {
    owner_pk: input.ownerPk,
    k: input.k,
    amount: input.amount,
  });
}

export async function encryptNote(input: {
  viewPub: string;
  ownerPk: string;
  k: string;
  amount: string;
}): Promise<string | null> {
  if (!input.viewPub) return null;
  const api = await tryWasm();
  if (api) {
    return api.encrypt_note_blob(
      input.viewPub,
      input.ownerPk,
      input.k,
      input.amount,
    );
  }
  const json = await postJson<{ blob: string | null }>('/v1/pool/encrypt', {
    recipient_view: input.viewPub,
    owner_pk: input.ownerPk,
    k: input.k,
    v: input.amount,
  });
  return json.blob;
}

export async function proveUnshield(input: {
  spendSk: string;
  k: string;
  v: string;
  index: number;
  recipient: string;
  amount: string;
  changeK: string;
}): Promise<{
  root: string;
  nullifier: string;
  change_cm: string;
  proof: string;
}> {
  const api = await tryWasm();
  if (api) {
    try {
      const pk = await pkBytes('unshield');
      const leaves = await fetchLeaves();
      if (leaves.length > 0) {
        const json = JSON.parse(
          api.unshield_proof(
            pk,
            JSON.stringify({
              spend_sk: input.spendSk,
              k: input.k,
              v: input.v,
              index: input.index,
              leaves,
              recipient_field: pubkeyToFrHex(input.recipient),
              amount: input.amount,
              change_k: input.changeK,
            }),
          ),
        ) as {
          root: string;
          nullifier: string;
          change_cm: string;
          proof: string;
        };
        return json;
      }
    } catch {
      // Nest CLI prove is the fallback when WASM keys or indexer leaves are missing.
    }
  }
  return postJson(
    '/v1/pool/prove/unshield',
    {
      spend_sk: input.spendSk,
      k: input.k,
      v: input.v,
      index: input.index,
      recipient: input.recipient,
      amount: input.amount,
      change_k: input.changeK,
    },
    true,
  );
}

export { randomFrHex };

export async function fetchLeaves(): Promise<string[]> {
  try {
    const nest = await fetch(`${BASE_URL}/v1/pool/leaves`);
    if (nest.ok) {
      const json = (await nest.json()) as { leaves?: string[] };
      if (Array.isArray(json.leaves) && json.leaves.length > 0) {
        return json.leaves;
      }
    }
  } catch {
    // Fall through to the indexer.
  }
  try {
    const network = indexerNetwork();
    const base = (import.meta.env.VITE_INDEXER_URL ?? '').replace(/\/$/, '');
    const url = base
      ? `${base}/v1/pool/${network}/leaves`
      : `/idx/v1/pool/${network}/leaves`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = (await response.json()) as { leaves?: string[] };
    return json.leaves ?? [];
  } catch {
    return [];
  }
}

export async function decryptNote(viewSecret: string, blob: string) {
  const api = await tryWasm();
  if (api) {
    try {
      const json = JSON.parse(api.decrypt_note_blob(viewSecret, blob)) as {
        owner_pk: string;
        k: string;
        v: string;
      };
      return { ownerPk: json.owner_pk, k: json.k, v: json.v };
    } catch {
      // Nest decrypt if the WASM module is present but this blob fails locally.
    }
  }
  return postJson<{ ownerPk: string; k: string; v: string }>(
    '/v1/pool/decrypt',
    { view_secret: viewSecret, blob },
    true,
  );
}

export async function proveTransfer2(input: {
  spendSk: string;
  k1: string;
  k2: string;
  v1: string;
  v2: string;
  index1: number;
  index2: number;
  out1OwnerPk: string;
  out1K: string;
  out1V: string;
  out2OwnerPk: string;
  out2K: string;
  out2V: string;
  recipientView?: string;
}): Promise<{
  root: string;
  nullifier_1: string;
  nullifier_2: string;
  out_cm1: string;
  out_cm2: string;
  proof: string;
  note_1?: string;
  note_2?: string;
}> {
  const api = await tryWasm();
  if (api?.transfer_2_proof) {
    try {
      const pk = await pkBytes('transfer2');
      const leaves = await fetchLeaves();
      if (leaves.length > 0) {
        const json = JSON.parse(
          api.transfer_2_proof(
            pk,
            JSON.stringify({
              spend_sk: input.spendSk,
              inputs: [
                { k: input.k1, v: input.v1, index: input.index1 },
                { k: input.k2, v: input.v2, index: input.index2 },
              ],
              leaves,
              out1_owner_pk: input.out1OwnerPk,
              out1_k: input.out1K,
              out1_v: input.out1V,
              out2_owner_pk: input.out2OwnerPk,
              out2_k: input.out2K,
              out2_v: input.out2V,
              recipient_view: input.recipientView,
              self_view: input.recipientView,
            }),
          ),
        ) as {
          root: string;
          nullifiers?: string[];
          out_cm1: string;
          out_cm2: string;
          proof: string;
          recipient_blob?: string;
          change_blob?: string;
        };
        return {
          root: json.root,
          nullifier_1: json.nullifiers?.[0] ?? '',
          nullifier_2: json.nullifiers?.[1] ?? '',
          out_cm1: json.out_cm1,
          out_cm2: json.out_cm2,
          proof: json.proof,
          note_1: json.recipient_blob,
          note_2: json.change_blob,
        };
      }
    } catch {
      // Nest CLI prove is the fallback when WASM keys or indexer leaves are missing.
    }
  }
  return postJson(
    '/v1/pool/prove/transfer',
    {
      spend_sk: input.spendSk,
      k1: input.k1,
      k2: input.k2,
      v1: input.v1,
      v2: input.v2,
      index1: input.index1,
      index2: input.index2,
      out1_owner_pk: input.out1OwnerPk,
      out1_k: input.out1K,
      out1_v: input.out1V,
      out2_owner_pk: input.out2OwnerPk,
      out2_k: input.out2K,
      out2_v: input.out2V,
      recipient_view: input.recipientView,
    },
    true,
  );
}

export async function proveTransferOne(input: {
  spendSk: string;
  k: string;
  v: string;
  index: number;
  out1OwnerPk: string;
  out1K: string;
  out1V: string;
  out2OwnerPk: string;
  out2K: string;
  out2V: string;
  recipientView?: string;
  selfView?: string;
}): Promise<{
  root: string;
  nullifier: string;
  out_cm1: string;
  out_cm2: string;
  proof: string;
  note_1?: string;
  note_2?: string;
}> {
  const api = await tryWasm();
  if (api?.transfer_proof) {
    try {
      const pk = await pkBytes('transfer');
      const leaves = await fetchLeaves();
      if (leaves.length > 0) {
        const json = JSON.parse(
          api.transfer_proof(
            pk,
            JSON.stringify({
              spend_sk: input.spendSk,
              k: input.k,
              v: input.v,
              index: input.index,
              leaves,
              out1_owner_pk: input.out1OwnerPk,
              out1_k: input.out1K,
              out1_v: input.out1V,
              out2_owner_pk: input.out2OwnerPk,
              out2_k: input.out2K,
              out2_v: input.out2V,
              recipient_view: input.recipientView,
              self_view: input.selfView,
            }),
          ),
        ) as {
          root: string;
          nullifier: string;
          out_cm1: string;
          out_cm2: string;
          proof: string;
          recipient_blob?: string;
          change_blob?: string;
        };
        return {
          root: json.root,
          nullifier: json.nullifier,
          out_cm1: json.out_cm1,
          out_cm2: json.out_cm2,
          proof: json.proof,
          note_1: json.recipient_blob,
          note_2: json.change_blob,
        };
      }
    } catch {
      // Nest CLI prove is the fallback when WASM keys or leaves are missing.
    }
  }
  return postJson(
    '/v1/pool/prove/transfer-one',
    {
      spend_sk: input.spendSk,
      k: input.k,
      v: input.v,
      index: input.index,
      out1_owner_pk: input.out1OwnerPk,
      out1_k: input.out1K,
      out1_v: input.out1V,
      out2_owner_pk: input.out2OwnerPk,
      out2_k: input.out2K,
      out2_v: input.out2V,
      recipient_view: input.recipientView,
    },
    true,
  );
}

export async function privateTransfer(body: Record<string, string>) {
  return postJson<{ tx_signature: string }>('/v1/pool/transfer', body, true);
}

export async function keygenFromServer(): Promise<{
  spend_sk: string;
  owner_pk: string;
  view_secret: string;
  view_pub: string;
}> {
  return postJson('/v1/pool/keygen', {}, true);
}
