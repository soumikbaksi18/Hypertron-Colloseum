import { PublicKey } from '@solana/web3.js';

import { SEEDS } from './pool.constants';

export function poolPda(programId: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([SEEDS.pool, mint.toBuffer()], programId)[0];
}

export function vaultAuthorityPda(
  programId: PublicKey,
  mint: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync([SEEDS.vault, mint.toBuffer()], programId)[0];
}

export function merklePda(programId: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [SEEDS.merkle, mint.toBuffer()],
    programId,
  )[0];
}

export function vkPda(
  programId: PublicKey,
  admin: PublicKey,
  vkId: number,
): PublicKey {
  const id = Buffer.alloc(4);
  id.writeUInt32LE(vkId);
  return PublicKey.findProgramAddressSync(
    [SEEDS.vk, admin.toBuffer(), id],
    programId,
  )[0];
}

export function nullifierPda(
  programId: PublicKey,
  nullifier: Buffer,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [SEEDS.nullifier, nullifier],
    programId,
  )[0];
}

export function merchantPda(
  programId: PublicKey,
  pool: PublicKey,
  owner: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [SEEDS.merchant, pool.toBuffer(), owner.toBuffer()],
    programId,
  )[0];
}
