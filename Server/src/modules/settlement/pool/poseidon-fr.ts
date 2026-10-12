import { poseidon2 } from 'poseidon-lite';
import * as nacl from 'tweetnacl';

import { bytesToHex, strip0x } from './pool.bytes';

/** BN254 scalar field. Same reduction as `Fr::from_be_bytes_mod_order`. */
const FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Circomlib / light-poseidon t=3 compression: state starts `[0, a, b]`. */
export function poseidonFr(a: bigint, b: bigint): bigint {
  return poseidon2([a % FIELD, b % FIELD]);
}

export function frFromHex(hex: string): bigint {
  const body = strip0x(hex);
  if (!/^[0-9a-fA-F]+$/.test(body)) {
    throw new Error('expected hex field element');
  }
  return BigInt(`0x${body}`) % FIELD;
}

export function frToHex(value: bigint): string {
  const reduced = ((value % FIELD) + FIELD) % FIELD;
  return `0x${reduced.toString(16).padStart(64, '0')}`;
}

/** `owner_pk = Poseidon(spend_sk, 0)`. */
export function ownerPkFromSpendSk(spendSk: string): string {
  return frToHex(poseidonFr(frFromHex(spendSk), 0n));
}

/** `cm = Poseidon(Poseidon(owner_pk, k), v)`. */
export function commitmentFromNote(ownerPk: string, k: string, value: bigint): string {
  const inner = poseidonFr(frFromHex(ownerPk), frFromHex(k));
  return frToHex(poseidonFr(inner, value % FIELD));
}

/** `nf = Poseidon(spend_sk, k)`. */
export function nullifierFromSpend(spendSk: string, k: string): string {
  return frToHex(poseidonFr(frFromHex(spendSk), frFromHex(k)));
}

/** X25519 viewing keypair. Secret bytes are what `ViewingKey::from_seed` accepts. */
export function generateViewingKey(): { viewSecret: string; viewPub: string } {
  const pair = nacl.box.keyPair();
  return {
    viewSecret: bytesToHex(pair.secretKey),
    viewPub: bytesToHex(pair.publicKey),
  };
}
