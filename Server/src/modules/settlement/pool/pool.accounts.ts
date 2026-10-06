import { PublicKey } from '@solana/web3.js';

import { ACCOUNT_DISC, MERKLE_DEPTH } from './pool.constants';
import { bytesToHex } from './pool.bytes';

export interface DecodedPoolState {
  admin: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  tokenProgram: PublicKey;
  decimals: number;
  compliance: PublicKey;
  depositVk: PublicKey;
  unshieldVk: PublicKey;
  transferVk: PublicKey;
  depositVkId: number;
  unshieldVkId: number;
  transferVkId: number;
  nextVkId: number;
  rootCursor: number;
  roots: Buffer[];
  bump: number;
  vaultBump: number;
  treeBump: number;
}

export interface DecodedMerkleTree {
  nextIndex: bigint;
  filled: Buffer[];
  zeros: Buffer[];
  root: Buffer;
  bump: number;
}

class Cursor {
  constructor(
    private readonly buf: Buffer,
    private offset = 0,
  ) {}

  skip(n: number): void {
    this.offset += n;
  }

  u8(): number {
    const value = this.buf.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  u32(): number {
    const value = this.buf.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  u64(): bigint {
    const value = this.buf.readBigUInt64LE(this.offset);
    this.offset += 8;
    return value;
  }

  bytes(n: number): Buffer {
    const value = this.buf.subarray(this.offset, this.offset + n);
    this.offset += n;
    return Buffer.from(value);
  }

  pubkey(): PublicKey {
    return new PublicKey(this.bytes(32));
  }
}

function assertDisc(actual: Buffer, expected: Buffer, label: string): void {
  if (!actual.equals(expected)) {
    throw new Error(`${label} account discriminator mismatch`);
  }
}

export function decodePoolState(data: Buffer): DecodedPoolState {
  const cur = new Cursor(data);
  assertDisc(cur.bytes(8), ACCOUNT_DISC.poolState, 'PoolState');
  const admin = cur.pubkey();
  const mint = cur.pubkey();
  const vault = cur.pubkey();
  const tokenProgram = cur.pubkey();
  const decimals = cur.u8();
  const compliance = cur.pubkey();
  const depositVk = cur.pubkey();
  const unshieldVk = cur.pubkey();
  const transferVk = cur.pubkey();
  const depositVkId = cur.u32();
  const unshieldVkId = cur.u32();
  const transferVkId = cur.u32();
  const nextVkId = cur.u32();
  const rootCursor = cur.u8();
  const roots: Buffer[] = [];
  for (let i = 0; i < 32; i += 1) {
    roots.push(cur.bytes(32));
  }
  return {
    admin,
    mint,
    vault,
    tokenProgram,
    decimals,
    compliance,
    depositVk,
    unshieldVk,
    transferVk,
    depositVkId,
    unshieldVkId,
    transferVkId,
    nextVkId,
    rootCursor,
    roots,
    bump: cur.u8(),
    vaultBump: cur.u8(),
    treeBump: cur.u8(),
  };
}

export function decodeMerkleTree(data: Buffer): DecodedMerkleTree {
  const cur = new Cursor(data);
  assertDisc(cur.bytes(8), ACCOUNT_DISC.merkleTree, 'MerkleTree');
  const nextIndex = cur.u64();
  const filled: Buffer[] = [];
  const zeros: Buffer[] = [];
  for (let i = 0; i < MERKLE_DEPTH; i += 1) {
    filled.push(cur.bytes(32));
  }
  for (let i = 0; i < MERKLE_DEPTH; i += 1) {
    zeros.push(cur.bytes(32));
  }
  return {
    nextIndex,
    filled,
    zeros,
    root: cur.bytes(32),
    bump: cur.u8(),
  };
}

export function rootHex(tree: DecodedMerkleTree): string {
  return bytesToHex(tree.root);
}
