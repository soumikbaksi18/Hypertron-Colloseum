import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import bs58 from 'bs58';

import { loadConfig } from '../../../common/config/configuration';
import { decodeMerkleTree, decodePoolState } from './pool.accounts';
import type { DecodedMerkleTree, DecodedPoolState } from './pool.accounts';
import { hexToFixed } from './pool.bytes';
import { POOL_PROGRAM_ID } from './pool.constants';
import {
  depositIx,
  initializeIx,
  parseVkJson,
  registerVkIx,
  withdrawIx,
} from './pool.instructions';
import { merklePda, poolPda, vaultAuthorityPda, vkPda } from './pool.pdas';

@Injectable()
export class PoolClient {
  private readonly logger = new Logger(PoolClient.name);
  private connection: Connection | null = null;
  private relayer: Keypair | null = null;

  rpc(): Connection {
    if (!this.connection) {
      this.connection = new Connection(loadConfig().pool.rpcUrl, 'confirmed');
    }
    return this.connection;
  }

  programId(): PublicKey {
    return new PublicKey(loadConfig().pool.programId || POOL_PROGRAM_ID);
  }

  mint(): PublicKey {
    const mint = loadConfig().pool.mint;
    if (!mint) {
      throw new Error('POOL_MINT is not set');
    }
    return new PublicKey(mint);
  }

  relayerKeypair(): Keypair {
    if (!this.relayer) {
      this.relayer = loadKeypair(loadConfig().pool.relayerKeypair);
    }
    return this.relayer;
  }

  poolAddress(): PublicKey {
    return poolPda(this.programId(), this.mint());
  }

  merkleAddress(): PublicKey {
    return merklePda(this.programId(), this.mint());
  }

  async fetchPool(): Promise<DecodedPoolState> {
    const info = await this.rpc().getAccountInfo(this.poolAddress());
    if (!info) {
      throw new Error(
        `Pool is not initialized at ${this.poolAddress().toBase58()}. Run npm run pool:init.`,
      );
    }
    return decodePoolState(info.data);
  }

  async fetchTree(): Promise<DecodedMerkleTree> {
    const info = await this.rpc().getAccountInfo(this.merkleAddress());
    if (!info) {
      throw new Error('Merkle tree account is missing. Initialize the pool first.');
    }
    return decodeMerkleTree(info.data);
  }

  async buildDepositIx(input: {
    depositor: PublicKey;
    amount: bigint;
    commitmentHex: string;
    proof: Buffer;
  }): Promise<{ ix: TransactionInstruction; pool: DecodedPoolState }> {
    const pool = await this.fetchPool();
    const mint = this.mint();
    const programId = this.programId();
    const depositorAta = getAssociatedTokenAddressSync(
      mint,
      input.depositor,
      true,
      pool.tokenProgram,
    );
    return {
      pool,
      ix: depositIx({
        programId,
        depositor: input.depositor,
        mint,
        pool: this.poolAddress(),
        merkle: this.merkleAddress(),
        depositVk: pool.depositVk,
        depositorAta,
        vault: pool.vault,
        tokenProgram: pool.tokenProgram,
        amount: input.amount,
        commitment: hexToFixed(input.commitmentHex, 32),
        proof: input.proof,
      }),
    };
  }

  isLocalnet(): boolean {
    const rpc = loadConfig().pool.rpcUrl.toLowerCase();
    return rpc.includes('127.0.0.1') || rpc.includes('localhost');
  }

  async ensureLocalnetPayer(depositor: PublicKey, amount: bigint): Promise<void> {
    if (!this.isLocalnet()) {
      this.logger.log(
        `skip localnet fund; rpc=${loadConfig().pool.rpcUrl} payer=${depositor.toBase58()}`,
      );
      return;
    }

    const relayer = this.relayerKeypair();
    const conn = this.rpc();
    const lamports = await conn.getBalance(depositor);
    this.logger.log(
      `localnet payer ${depositor.toBase58()} lamports=${lamports} need=${amount.toString()}`,
    );
    if (lamports < 50_000_000) {
      await this.send(
        [
          SystemProgram.transfer({
            fromPubkey: relayer.publicKey,
            toPubkey: depositor,
            lamports: 1_000_000_000,
          }),
        ],
        [relayer],
      );
    }

    const mint = this.mint();
    const pool = await this.fetchPool();
    const ata = getAssociatedTokenAddressSync(
      mint,
      depositor,
      true,
      pool.tokenProgram,
    );
    let have = 0n;
    try {
      const balance = await conn.getTokenAccountBalance(ata);
      have = BigInt(balance.value.amount);
    } catch {
      have = 0n;
    }
    if (have >= amount) return;

    const ixs: TransactionInstruction[] = [
      createAssociatedTokenAccountIdempotentInstruction(
        relayer.publicKey,
        ata,
        depositor,
        mint,
        pool.tokenProgram,
      ),
      createMintToInstruction(
        mint,
        ata,
        relayer.publicKey,
        amount - have,
        [],
        pool.tokenProgram,
      ),
    ];
    await this.send(ixs, [relayer]);
    this.logger.log(
      `localnet funded ${depositor.toBase58()} with ${amount - have} of ${mint.toBase58()}`,
    );
  }

  async serializeUnsignedDeposit(input: {
    depositor: PublicKey;
    amount: bigint;
    commitmentHex: string;
    proof: Buffer;
  }): Promise<string> {
    const { ix } = await this.buildDepositIx(input);
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
    tx.add(ix);
    tx.feePayer = input.depositor;
    const latest = await this.rpc().getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    return tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64');
  }

  async sendRelayerDeposit(input: {
    amount: bigint;
    commitmentHex: string;
    proof: Buffer;
  }): Promise<string> {
    const relayer = this.relayerKeypair();
    const { ix } = await this.buildDepositIx({
      depositor: relayer.publicKey,
      ...input,
    });
    return this.send([ix], [relayer]);
  }

  async sendRelayerWithdraw(input: {
    recipient: PublicKey;
    amount: bigint;
    rootHex: string;
    nullifierHex: string;
    changeCmHex: string;
    proof: Buffer;
  }): Promise<string> {
    const pool = await this.fetchPool();
    const relayer = this.relayerKeypair();
    const programId = this.programId();
    const mint = this.mint();
    const recipientAta = getAssociatedTokenAddressSync(
      mint,
      input.recipient,
      true,
      pool.tokenProgram,
    );
    const createAta = createAssociatedTokenAccountIdempotentInstruction(
      relayer.publicKey,
      recipientAta,
      input.recipient,
      mint,
      pool.tokenProgram,
    );
    const ix = withdrawIx({
      programId,
      feePayer: relayer.publicKey,
      mint,
      pool: this.poolAddress(),
      merkle: this.merkleAddress(),
      unshieldVk: pool.unshieldVk,
      vaultAuthority: vaultAuthorityPda(programId, mint),
      vault: pool.vault,
      recipient: input.recipient,
      recipientAta,
      tokenProgram: pool.tokenProgram,
      root: hexToFixed(input.rootHex, 32),
      nullifier: hexToFixed(input.nullifierHex, 32),
      amount: input.amount,
      changeCm: hexToFixed(input.changeCmHex, 32),
      proof: input.proof,
    });
    return this.send([createAta, ix], [relayer]);
  }

  async registerVkFromFile(vkPath: string, vkId: number): Promise<string> {
    const admin = this.relayerKeypair();
    const programId = this.programId();
    const vk = parseVkJson(fs.readFileSync(vkPath, 'utf8'));
    const ix = registerVkIx({
      programId,
      admin: admin.publicKey,
      vkId,
      nrPubinputs: vk.nrPubinputs,
      alpha: vk.alpha,
      beta: vk.beta,
      gamma: vk.gamma,
      delta: vk.delta,
      ic: vk.ic,
    });
    const pda = vkPda(programId, admin.publicKey, vkId);
    const existing = await this.rpc().getAccountInfo(pda);
    if (existing) {
      this.logger.log(`vk ${vkId} already registered at ${pda.toBase58()}`);
      return pda.toBase58();
    }
    await this.send([ix], [admin]);
    return pda.toBase58();
  }

  async initializePool(vkIds: {
    deposit: number;
    unshield: number;
    transfer: number;
  }): Promise<string> {
    const existing = await this.rpc().getAccountInfo(this.poolAddress());
    if (existing) {
      this.logger.log(`pool already initialized at ${this.poolAddress().toBase58()}`);
      return this.poolAddress().toBase58();
    }
    const admin = this.relayerKeypair();
    const programId = this.programId();
    const mint = this.mint();
    const mintInfo = await this.rpc().getAccountInfo(mint);
    if (!mintInfo) {
      throw new Error(`Mint ${mint.toBase58()} does not exist on ${loadConfig().pool.rpcUrl}`);
    }
    const ix = initializeIx({
      programId,
      admin: admin.publicKey,
      mint,
      depositVk: vkPda(programId, admin.publicKey, vkIds.deposit),
      unshieldVk: vkPda(programId, admin.publicKey, vkIds.unshield),
      transferVk: vkPda(programId, admin.publicKey, vkIds.transfer),
      tokenProgram: mintInfo.owner,
      depositVkId: vkIds.deposit,
      unshieldVkId: vkIds.unshield,
      transferVkId: vkIds.transfer,
    });
    return this.send([ix], [admin]);
  }

  private async send(
    ixs: TransactionInstruction[],
    signers: Keypair[],
  ): Promise<string> {
    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));
    for (const ix of ixs) tx.add(ix);
    tx.feePayer = signers[0].publicKey;
    const latest = await this.rpc().getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    const sig = await this.rpc().sendTransaction(tx, signers, {
      skipPreflight: false,
    });
    await this.rpc().confirmTransaction(
      { signature: sig, ...latest },
      'confirmed',
    );
    this.logger.log(`sent ${sig}`);
    return sig;
  }

  async sendSigned(rawBase64: string): Promise<string> {
    const raw = Buffer.from(rawBase64, 'base64');
    if (raw.length < 64 || raw.length > 4096) {
      throw new Error('signed deposit transaction is the wrong size');
    }
    const sig = await this.rpc().sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    const latest = await this.rpc().getLatestBlockhash();
    await this.rpc().confirmTransaction(
      { signature: sig, ...latest },
      'confirmed',
    );
    this.logger.log(`broadcast ${sig}`);
    return sig;
  }
}

export function loadKeypair(spec: string): Keypair {
  const trimmed = spec.trim();
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed) as number[]));
  }
  const file = trimmed.startsWith('~')
    ? path.join(os.homedir(), trimmed.slice(1))
    : trimmed;
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (raw.startsWith('[')) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
    }
    return Keypair.fromSecretKey(bs58.decode(raw));
  }
  try {
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch {
    throw new Error(`Cannot load relayer keypair from ${spec}`);
  }
}
