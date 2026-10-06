import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import { IX, MAX_IC, PROOF_LEN } from './pool.constants';
import { encodeU32Le, encodeU64Le, encodeVecU8, hexToFixed } from './pool.bytes';
import {
  merklePda,
  nullifierPda,
  poolPda,
  vaultAuthorityPda,
  vkPda,
} from './pool.pdas';

export function depositIx(args: {
  programId: PublicKey;
  depositor: PublicKey;
  mint: PublicKey;
  pool: PublicKey;
  merkle: PublicKey;
  depositVk: PublicKey;
  depositorAta: PublicKey;
  vault: PublicKey;
  tokenProgram: PublicKey;
  amount: bigint;
  commitment: Buffer;
  proof: Buffer;
}): TransactionInstruction {
  if (args.commitment.length !== 32) {
    throw new Error('deposit commitment must be 32 bytes');
  }
  if (args.proof.length !== PROOF_LEN) {
    throw new Error(`deposit proof must be ${PROOF_LEN} bytes`);
  }

  const data = Buffer.concat([
    IX.deposit,
    encodeU64Le(args.amount),
    args.commitment,
    args.proof,
  ]);

  return new TransactionInstruction({
    programId: args.programId,
    data,
    keys: [
      { pubkey: args.depositor, isSigner: true, isWritable: true },
      { pubkey: args.pool, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: args.merkle, isSigner: false, isWritable: true },
      { pubkey: args.depositVk, isSigner: false, isWritable: false },
      { pubkey: args.depositorAta, isSigner: false, isWritable: true },
      { pubkey: args.vault, isSigner: false, isWritable: true },
      { pubkey: args.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: args.programId, isSigner: false, isWritable: false },
      { pubkey: args.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function withdrawIx(args: {
  programId: PublicKey;
  feePayer: PublicKey;
  mint: PublicKey;
  pool: PublicKey;
  merkle: PublicKey;
  unshieldVk: PublicKey;
  vaultAuthority: PublicKey;
  vault: PublicKey;
  recipient: PublicKey;
  recipientAta: PublicKey;
  tokenProgram: PublicKey;
  root: Buffer;
  nullifier: Buffer;
  amount: bigint;
  changeCm: Buffer;
  proof: Buffer;
}): TransactionInstruction {
  const data = Buffer.concat([
    IX.withdraw,
    args.root,
    args.nullifier,
    encodeU64Le(args.amount),
    args.changeCm,
    args.proof,
  ]);

  return new TransactionInstruction({
    programId: args.programId,
    data,
    keys: [
      { pubkey: args.feePayer, isSigner: true, isWritable: true },
      { pubkey: args.pool, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: args.merkle, isSigner: false, isWritable: true },
      { pubkey: args.unshieldVk, isSigner: false, isWritable: false },
      { pubkey: args.vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: args.vault, isSigner: false, isWritable: true },
      { pubkey: args.recipient, isSigner: false, isWritable: false },
      { pubkey: args.recipientAta, isSigner: false, isWritable: true },
      {
        pubkey: nullifierPda(args.programId, args.nullifier),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: args.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: args.programId, isSigner: false, isWritable: false },
      { pubkey: args.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function registerVkIx(args: {
  programId: PublicKey;
  admin: PublicKey;
  vkId: number;
  nrPubinputs: number;
  alpha: Buffer;
  beta: Buffer;
  gamma: Buffer;
  delta: Buffer;
  ic: Buffer[];
}): TransactionInstruction {
  const padded = [...args.ic];
  while (padded.length < MAX_IC) {
    padded.push(Buffer.alloc(64));
  }
  if (padded.length !== MAX_IC) {
    throw new Error(`ic must pad to ${MAX_IC} G1 points`);
  }

  const data = Buffer.concat([
    IX.registerVk,
    encodeU32Le(args.vkId),
    encodeU32Le(args.nrPubinputs),
    args.alpha,
    args.beta,
    args.gamma,
    args.delta,
    Buffer.from([args.ic.length]),
    ...padded.slice(0, MAX_IC),
  ]);

  return new TransactionInstruction({
    programId: args.programId,
    data,
    keys: [
      { pubkey: args.admin, isSigner: true, isWritable: true },
      {
        pubkey: vkPda(args.programId, args.admin, args.vkId),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function initializeIx(args: {
  programId: PublicKey;
  admin: PublicKey;
  mint: PublicKey;
  depositVk: PublicKey;
  unshieldVk: PublicKey;
  transferVk: PublicKey;
  tokenProgram?: PublicKey;
  depositVkId: number;
  unshieldVkId: number;
  transferVkId: number;
}): TransactionInstruction {
  const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ID;
  const data = Buffer.concat([
    IX.initialize,
    encodeU32Le(args.depositVkId),
    encodeU32Le(args.unshieldVkId),
    encodeU32Le(args.transferVkId),
  ]);

  return new TransactionInstruction({
    programId: args.programId,
    data,
    keys: [
      { pubkey: args.admin, isSigner: true, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      {
        pubkey: poolPda(args.programId, args.mint),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: vaultAuthorityPda(args.programId, args.mint),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: getAssociatedTokenAddressSync(
          args.mint,
          vaultAuthorityPda(args.programId, args.mint),
          true,
          tokenProgram,
        ),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: merklePda(args.programId, args.mint),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: args.depositVk, isSigner: false, isWritable: false },
      { pubkey: args.unshieldVk, isSigner: false, isWritable: false },
      { pubkey: args.transferVk, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function transferIx(args: {
  programId: PublicKey;
  feePayer: PublicKey;
  pool: PublicKey;
  merkle: PublicKey;
  transferVk: PublicKey;
  root: Buffer;
  nullifier1: Buffer;
  nullifier2: Buffer;
  outCm1: Buffer;
  outCm2: Buffer;
  proof: Buffer;
  note1: Buffer;
  note2: Buffer;
}): TransactionInstruction {
  const data = Buffer.concat([
    IX.transfer,
    args.root,
    args.nullifier1,
    args.nullifier2,
    args.outCm1,
    args.outCm2,
    args.proof,
    encodeVecU8(args.note1),
    encodeVecU8(args.note2),
  ]);

  return new TransactionInstruction({
    programId: args.programId,
    data,
    keys: [
      { pubkey: args.feePayer, isSigner: true, isWritable: true },
      { pubkey: args.pool, isSigner: false, isWritable: true },
      { pubkey: args.merkle, isSigner: false, isWritable: true },
      { pubkey: args.transferVk, isSigner: false, isWritable: false },
      {
        pubkey: nullifierPda(args.programId, args.nullifier1),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: nullifierPda(args.programId, args.nullifier2),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function parseVkJson(raw: string): {
  nrPubinputs: number;
  alpha: Buffer;
  beta: Buffer;
  gamma: Buffer;
  delta: Buffer;
  ic: Buffer[];
} {
  const parsed = JSON.parse(raw) as {
    nr_pubinputs: number;
    alpha: string;
    beta: string;
    gamma: string;
    delta: string;
    ic: string[];
  };
  return {
    nrPubinputs: parsed.nr_pubinputs,
    alpha: hexToFixed(parsed.alpha, 64),
    beta: hexToFixed(parsed.beta, 128),
    gamma: hexToFixed(parsed.gamma, 128),
    delta: hexToFixed(parsed.delta, 128),
    ic: parsed.ic.map((point) => hexToFixed(point, 64)),
  };
}
