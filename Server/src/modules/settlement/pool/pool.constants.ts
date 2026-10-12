import { PublicKey } from '@solana/web3.js';

export const POOL_PROGRAM_ID = new PublicKey(
  '9HQsgGDHgYw3N8PGnh9EWrUGRHgmp7tmdGaxuBHHA335',
);

export const MERKLE_DEPTH = 20;
export const PROOF_LEN = 256;
export const MAX_IC = 8;

export const VK_ID = {
  deposit: 1,
  unshield: 2,
  transfer: 3,
  transfer2: 4,
  transferOne: 5,
} as const;

export const SEEDS = {
  pool: Buffer.from('pool'),
  vault: Buffer.from('vault'),
  merkle: Buffer.from('merkle'),
  vk: Buffer.from('vk'),
  nullifier: Buffer.from('nullifier'),
  merchant: Buffer.from('merchant'),
  compliance: Buffer.from('compliance'),
  listing: Buffer.from('listing'),
};

/// Anchor 0.31: sha256("global:<name>")[..8]
export const IX = {
  initialize: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
  registerVk: Buffer.from([248, 1, 135, 102, 153, 191, 170, 30]),
  initializeCompliance: Buffer.from([77, 93, 116, 221, 108, 121, 232, 145]),
  setListing: Buffer.from([61, 63, 131, 242, 184, 230, 149, 123]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  transfer: Buffer.from([163, 52, 200, 231, 140, 3, 69, 186]),
  withdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]),
  registerMerchantTreasury: Buffer.from([25, 19, 134, 54, 240, 159, 41, 107]),
  setTransferVk: Buffer.from([21, 159, 117, 216, 161, 13, 129, 44]),
  transferOne: Buffer.from([156, 214, 220, 18, 66, 251, 139, 63]),
};

export const ACCOUNT_DISC = {
  poolState: Buffer.from([247, 237, 227, 245, 215, 195, 222, 70]),
  merkleTree: Buffer.from([98, 51, 51, 226, 162, 20, 73, 212]),
};
