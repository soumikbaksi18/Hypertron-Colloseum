import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';

import { loadConfig } from '../../common/config/configuration';
import {
  PrivateSettlementProvider,
  SettleInput,
  SettlementResult,
} from './settlement.types';
import { bytesToHex, hexToBytes, randomFrHex } from './pool/pool.bytes';
import { PoolClient } from './pool/pool.client';
import { assertUnshieldAmount } from './pool/pool.denoms';
import { PoolProver, pubkeyToFrHex, spendSkBytes } from './pool/pool.prover';
import { PoolTreeService } from './pool/pool-tree.service';
import { RelayerQueueService } from './pool/relayer-queue.service';

export type ClientWithdrawProof = {
  root: string;
  nullifier: string;
  change_cm: string;
  proof: string;
  amount?: string;
};

export type ClientTransferProof = {
  root: string;
  nullifier_1: string;
  nullifier_2: string;
  out_cm1: string;
  out_cm2: string;
  proof: string;
  note_1?: string;
  note_2?: string;
  spent_cm1?: string;
  spent_cm2?: string;
  out1_owner_pk?: string;
  out1_v?: string;
  out2_owner_pk?: string;
  out2_v?: string;
  payment_link_id?: string;
};

export type ClientTransferOneProof = {
  root: string;
  nullifier: string;
  out_cm1: string;
  out_cm2: string;
  proof: string;
  note_1?: string;
  note_2?: string;
  spent_cm?: string;
  out1_owner_pk?: string;
  out1_v?: string;
  out2_owner_pk?: string;
  out2_v?: string;
  payment_link_id?: string;
};

class AsyncLock {
  private tail = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn);
    this.tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

@Injectable()
export class SolanaPoolSettlementProvider implements PrivateSettlementProvider {
  readonly name = 'pool';
  private readonly logger = new Logger(SolanaPoolSettlementProvider.name);
  private readonly lock = new AsyncLock();
  private ownerPkCache: string | null = null;

  constructor(
    private readonly client: PoolClient,
    private readonly prover: PoolProver,
    private readonly tree: PoolTreeService,
    private readonly relay: RelayerQueueService,
  ) {}

  async settle(input: SettleInput): Promise<SettlementResult> {
    return this.lock.run(() => this.settleLocked(input));
  }

  async prepareCustomerDeposit(input: {
    paymentLinkId: string;
    payer: string;
    amount: bigint;
    viewPub: string | null;
    ownerPk?: string | null;
    commitment?: string;
    proofHex?: string;
    blobHex?: string;
  }): Promise<{
    transaction: string;
    commitment: string;
    owner_pk: string;
    view_pub: string | null;
    amount: string;
  }> {
    return this.lock.run(() => this.prepareLocked(input));
  }

  async finalizeCustomerDeposit(input: {
    paymentLinkId: string;
    txSignature: string;
    viewPub: string | null;
    destination: string;
  }): Promise<void> {
    await this.lock.run(() => this.finalizeLocked(input));
  }

  async broadcastSignedDeposit(rawBase64: string): Promise<string> {
    return this.client.sendSigned(rawBase64);
  }

  async merkleLeaves(): Promise<string[]> {
    return this.tree.leaves(this.client.mint().toBase58());
  }

  async listOpenNotes(ownerPk: string) {
    const rows = await this.tree.listOpenByOwner(ownerPk);
    return rows.map((row) => ({
      commitment: row.commitment,
      leaf_index: row.leafIndex,
      value: row.value.toString(),
      encrypted_blob: row.encryptedBlob,
      payment_link_id: row.paymentLinkId,
    }));
  }

  private async settleLocked(input: SettleInput): Promise<SettlementResult> {
    const amount = input.amountMinor;
    if (amount <= 0n) {
      throw new Error('amount must be positive');
    }

    const spendSk = this.spendSk();
    const ownerPk = await this.ownerPk();
    const k = randomFrHex();
    const proved = await this.prover.depositProof({
      ownerPk,
      k,
      amount,
    });

    const mint = this.client.mint().toBase58();
    const txSignature = await this.client.sendRelayerDeposit({
      amount,
      commitmentHex: proved.commitment,
      proof: proved.proof,
    });

    const tree = await this.client.fetchTree();
    const leafIndex = await this.tree.append({
      mint,
      leaf: proved.commitment,
      root: bytesToHex(tree.root),
    });

    const encryptedBlob = await this.prover.encryptNote({
      recipientView: input.viewPub ?? '',
      ownerPk,
      k,
      v: amount,
    });
    const nullifier = await this.prover.nullifier(spendSk, k);
    await this.tree.recordNote({
      mint,
      leafIndex,
      commitment: proved.commitment,
      ownerPk,
      blindingK: k,
      value: amount,
      encryptedBlob,
      nullifier,
      intentPublicId: input.intentPublicId,
    });

    let outSig = txSignature;
    const recipient = this.pickRecipient(input);
    if (loadConfig().pool.autoUnshield && recipient) {
      this.logger.warn(
        `POOL_AUTO_UNSHIELD is on; linking deposit to payout for ${input.intentPublicId}`,
      );
      outSig = await this.unshieldTo({
        mint,
        ownerPk,
        k,
        noteValue: amount,
        amount,
        leafIndex,
        commitment: proved.commitment,
        recipient,
      });
    }

    this.logger.log(
      `pool settled ${input.intentPublicId} cm=${proved.commitment} sig=${outSig}`,
    );

    return {
      settlementId: `set_${crypto.randomBytes(12).toString('hex')}`,
      commitment: proved.commitment,
      nullifier,
      txSignature: outSig,
      viewKeyHint: crypto
        .createHash('sha256')
        .update(`${input.viewPub ?? 'no-view-key'}:${proved.commitment}`)
        .digest('hex')
        .slice(0, 32),
    };
  }

  private async prepareLocked(input: {
    paymentLinkId: string;
    payer: string;
    amount: bigint;
    viewPub: string | null;
    ownerPk?: string | null;
    commitment?: string;
    proofHex?: string;
    blobHex?: string;
  }): Promise<{
    transaction: string;
    commitment: string;
    owner_pk: string;
    view_pub: string | null;
    amount: string;
  }> {
    const depositor = new PublicKey(input.payer);
    await this.client.ensureLocalnetPayer(depositor, input.amount);

    const ownerPk = (input.ownerPk ?? '').trim() || (await this.ownerPk());
    let commitment = (input.commitment ?? '').trim();
    let proof = input.proofHex ? hexToBytes(input.proofHex) : Buffer.alloc(0);
    let k = '';

    if (!commitment || proof.length === 0) {
      k = randomFrHex();
      const proved = await this.prover.depositProof({
        ownerPk,
        k,
        amount: input.amount,
      });
      commitment = proved.commitment;
      proof = proved.proof;
    }

    const blob = input.blobHex ? hexToBytes(input.blobHex) : undefined;
    const transaction = await this.client.serializeUnsignedDeposit({
      depositor,
      amount: input.amount,
      commitmentHex: commitment,
      proof,
      encryptedBlob: blob,
    });
    await this.tree.savePending({
      paymentLinkId: input.paymentLinkId,
      commitment,
      proofHex: bytesToHex(proof),
      ownerPk,
      blindingK: k,
      amount: input.amount,
      encryptedBlob: input.blobHex ?? null,
    });
    return {
      transaction,
      commitment,
      owner_pk: ownerPk,
      view_pub: input.viewPub,
      amount: input.amount.toString(),
    };
  }

  private async finalizeLocked(input: {
    paymentLinkId: string;
    txSignature: string;
    viewPub: string | null;
    destination: string;
  }): Promise<void> {
    const pending = await this.tree.takePending(input.paymentLinkId);
    if (!pending) {
      this.logger.warn(`no pending pool deposit for ${input.paymentLinkId}`);
      return;
    }
    try {
      await this.client.rpc().confirmTransaction(input.txSignature, 'confirmed');
    } catch (error) {
      this.logger.warn(
        `could not confirm deposit ${input.txSignature}: ${String(error)}`,
      );
    }
    const mint = this.client.mint().toBase58();
    const tree = await this.client.fetchTree();
    const leafIndex = await this.tree.append({
      mint,
      leaf: pending.commitment,
      root: bytesToHex(tree.root),
    });
    let encryptedBlob: string | null = pending.encryptedBlob ?? null;
    let nullifier: string | null = null;
    if (pending.blindingK) {
      encryptedBlob =
        encryptedBlob ??
        (await this.prover.encryptNote({
          recipientView: input.viewPub ?? '',
          ownerPk: pending.ownerPk,
          k: pending.blindingK,
          v: pending.amount,
        }));
      try {
        nullifier = await this.prover.nullifier(this.spendSk(), pending.blindingK);
      } catch {
        nullifier = null;
      }
    }
    await this.tree.recordNote({
      mint,
      leafIndex,
      commitment: pending.commitment,
      ownerPk: pending.ownerPk,
      blindingK: pending.blindingK || '',
      value: pending.amount,
      encryptedBlob,
      nullifier,
      paymentLinkId: input.paymentLinkId.startsWith('dep_')
        ? null
        : input.paymentLinkId,
    });
  }

  async unshieldInvoice(
    paymentLinkId: string,
    destination: string,
    amount?: bigint,
    clientProof?: ClientWithdrawProof,
  ): Promise<string> {
    return this.lock.run(async () => {
      const recipient = parsePubkey(destination);
      if (!recipient) {
        throw new Error('destination must be a Solana address');
      }
      const note = await this.tree.findOpenNote(paymentLinkId);
      if (!note) {
        throw new Error(
          'No shielded balance for this invoice. It may still be settling, or was already withdrawn.',
        );
      }
      const withdrawAmount = amount ?? note.value;
      assertUnshieldAmount(note.value, withdrawAmount);
      return this.unshieldTo({
        mint: note.mint,
        ownerPk: note.ownerPk,
        k: note.blindingK,
        noteValue: note.value,
        amount: withdrawAmount,
        leafIndex: note.leafIndex,
        commitment: note.commitment,
        recipient,
        paymentLinkId,
        clientProof,
      });
    });
  }

  async submitTransfer(
    input: ClientTransferProof,
    spentLinks?: { a?: string; b?: string },
  ): Promise<string> {
    return this.relay.enqueue(async () => {
      const sig = await this.client.sendRelayerTransfer({
        rootHex: input.root,
        nullifier1Hex: input.nullifier_1,
        nullifier2Hex: input.nullifier_2,
        outCm1Hex: input.out_cm1,
        outCm2Hex: input.out_cm2,
        proof: hexToBytes(input.proof),
        note1: input.note_1 ? hexToBytes(input.note_1) : Buffer.alloc(0),
        note2: input.note_2 ? hexToBytes(input.note_2) : Buffer.alloc(0),
      });
      const mint = this.client.mint().toBase58();
      const tree = await this.client.fetchTree();
      await this.tree.append({
        mint,
        leaf: input.out_cm1,
        root: bytesToHex(tree.root),
      });
      await this.tree.append({
        mint,
        leaf: input.out_cm2,
        root: bytesToHex(tree.root),
      });
      if (spentLinks?.a) {
        const note = await this.tree.findOpenNote(spentLinks.a);
        if (note) await this.tree.markSpent(note.commitment, input.nullifier_1);
      }
      if (spentLinks?.b) {
        const note = await this.tree.findOpenNote(spentLinks.b);
        if (note) await this.tree.markSpent(note.commitment, input.nullifier_2);
      }
      await this.recordTransferOutputs(input, mint);
      this.logger.log(`transfer nullifiers=${input.nullifier_1.slice(0, 10)}… sig=${sig}`);
      return sig;
    });
  }

  async submitTransferOne(input: ClientTransferOneProof): Promise<string> {
    return this.relay.enqueue(async () => {
      const sig = await this.client.sendRelayerTransferOne({
        rootHex: input.root,
        nullifierHex: input.nullifier,
        outCm1Hex: input.out_cm1,
        outCm2Hex: input.out_cm2,
        proof: hexToBytes(input.proof),
        note1: input.note_1 ? hexToBytes(input.note_1) : Buffer.alloc(0),
        note2: input.note_2 ? hexToBytes(input.note_2) : Buffer.alloc(0),
      });
      const mint = this.client.mint().toBase58();
      const tree = await this.client.fetchTree();
      await this.tree.append({
        mint,
        leaf: input.out_cm1,
        root: bytesToHex(tree.root),
      });
      await this.tree.append({
        mint,
        leaf: input.out_cm2,
        root: bytesToHex(tree.root),
      });
      if (input.spent_cm) {
        await this.tree.markSpent(input.spent_cm, input.nullifier);
      }
      await this.recordTransferOutputs(
        {
          ...input,
          nullifier_1: input.nullifier,
          nullifier_2: '',
          spent_cm1: input.spent_cm,
        },
        mint,
      );
      this.logger.log(`transfer_one nf=${input.nullifier.slice(0, 10)}… sig=${sig}`);
      return sig;
    });
  }

  async withdrawWallet(input: {
    destination: string;
    spentCommitment: string;
    ownerPk: string;
    noteValue: bigint;
    clientProof: ClientWithdrawProof;
  }): Promise<string> {
    const recipient = parsePubkey(input.destination);
    if (!recipient) {
      throw new Error('destination must be a Solana address');
    }
    const note = await this.tree.findOpenByCommitment(input.spentCommitment);
    if (!note) {
      throw new Error('No unspent note matches that commitment.');
    }
    if (note.ownerPk !== input.ownerPk) {
      throw new Error('That note is not owned by this wallet.');
    }
    const amount = BigInt(input.clientProof.amount ?? input.noteValue.toString());
    assertUnshieldAmount(note.value, amount);
    return this.unshieldTo({
      mint: note.mint,
      ownerPk: note.ownerPk,
      k: note.blindingK,
      noteValue: note.value,
      amount,
      leafIndex: note.leafIndex,
      commitment: note.commitment,
      recipient,
      clientProof: input.clientProof,
    });
  }

  async proveTransferOne(input: {
    spendSk: string;
    k: string;
    v: bigint;
    index: number;
    out1OwnerPk: string;
    out1K: string;
    out1V: bigint;
    out2OwnerPk: string;
    out2K: string;
    out2V: bigint;
    recipientView?: string;
  }) {
    const leaves = await this.tree.leaves(this.client.mint().toBase58());
    return this.prover.transferOneProof({
      ...input,
      spendSk: spendSkBytes(input.spendSk),
      leaves,
    });
  }

  private async recordTransferOutputs(
    input: {
      out_cm1: string;
      out_cm2: string;
      note_1?: string;
      note_2?: string;
      spent_cm1?: string;
      spent_cm2?: string;
      nullifier_1?: string;
      nullifier_2?: string;
      out1_owner_pk?: string;
      out1_v?: string;
      out2_owner_pk?: string;
      out2_v?: string;
      payment_link_id?: string;
    },
    mint: string,
  ): Promise<void> {
    if (input.spent_cm1 && input.nullifier_1) {
      await this.tree.markSpent(input.spent_cm1, input.nullifier_1);
    }
    if (input.spent_cm2 && input.nullifier_2) {
      await this.tree.markSpent(input.spent_cm2, input.nullifier_2);
    }
    const tree = await this.client.fetchTree();
    const next = Number(tree.nextIndex);
    if (input.out1_owner_pk && input.out1_v && BigInt(input.out1_v) > 0n) {
      await this.tree.recordNote({
        mint,
        leafIndex: next - 2,
        commitment: input.out_cm1,
        ownerPk: input.out1_owner_pk,
        blindingK: '',
        value: BigInt(input.out1_v),
        encryptedBlob: input.note_1 ?? null,
        paymentLinkId: input.payment_link_id ?? null,
      });
    }
    if (input.out2_owner_pk && input.out2_v && BigInt(input.out2_v) > 0n) {
      await this.tree.recordNote({
        mint,
        leafIndex: next - 1,
        commitment: input.out_cm2,
        ownerPk: input.out2_owner_pk,
        blindingK: '',
        value: BigInt(input.out2_v),
        encryptedBlob: input.note_2 ?? null,
      });
    }
  }

  async transferOpenNotes(input: {
    paymentLinkIdA: string;
    paymentLinkIdB: string;
    out1OwnerPk: string;
    out1V: bigint;
    recipientView?: string;
  }): Promise<string> {
    const a = await this.tree.findOpenNote(input.paymentLinkIdA);
    const b = await this.tree.findOpenNote(input.paymentLinkIdB);
    if (!a || !b) {
      throw new Error('both notes must be unspent in the pool');
    }
    if (!a.blindingK || !b.blindingK) {
      throw new Error('server cannot prove a transfer without note openings');
    }
    const total = a.value + b.value;
    if (input.out1V <= 0n || input.out1V >= total) {
      throw new Error('out1 value must be between 0 and the combined notes');
    }
    const leaves = await this.tree.leaves(a.mint);
    const indexA = this.tree.indexOfLeaf(leaves, a.commitment);
    const indexB = this.tree.indexOfLeaf(leaves, b.commitment);
    if (indexA < 0 || indexB < 0) {
      throw new Error(
        'Could not find those notes in the Merkle tree. The indexer tree may be behind.',
      );
    }
    const out2K = randomFrHex();
    const out1OwnerPk = a.ownerPk;
    const proved = await this.prover.transfer2Proof({
      spendSk: this.spendSk(),
      k: [a.blindingK, b.blindingK],
      v: [a.value, b.value],
      index: [indexA, indexB],
      leaves,
      out1OwnerPk,
      out1K: randomFrHex(),
      out1V: input.out1V,
      out2OwnerPk: a.ownerPk,
      out2K,
      out2V: total - input.out1V,
      recipientView: input.recipientView,
    });
    return this.submitTransfer(
      {
        root: proved.root,
        nullifier_1: proved.nullifier1,
        nullifier_2: proved.nullifier2,
        out_cm1: proved.outCm1,
        out_cm2: proved.outCm2,
        proof: bytesToHex(proved.proof),
        note_1: bytesToHex(proved.note1),
        note_2: bytesToHex(proved.note2),
      },
      { a: input.paymentLinkIdA, b: input.paymentLinkIdB },
    );
  }

  async proveTransfer2(input: {
    spendSk: string;
    k: [string, string];
    v: [bigint, bigint];
    index: [number, number];
    out1OwnerPk: string;
    out1K: string;
    out1V: bigint;
    out2OwnerPk: string;
    out2K: string;
    out2V: bigint;
    recipientView?: string;
  }) {
    const leaves = await this.tree.leaves(this.client.mint().toBase58());
    return this.prover.transfer2Proof({
      ...input,
      spendSk: spendSkBytes(input.spendSk),
      leaves,
    });
  }

  private async unshieldTo(input: {
    mint: string;
    ownerPk: string;
    k: string;
    noteValue: bigint;
    amount: bigint;
    leafIndex: number;
    commitment: string;
    recipient: PublicKey;
    paymentLinkId?: string;
    clientProof?: ClientWithdrawProof;
  }): Promise<string> {
    const changeK = randomFrHex();
    const proved =
      input.clientProof ??
      (await (async () => {
        if (!input.k) {
          throw new Error(
            'This note was client-proved. Submit an unshield proof from the merchant wallet.',
          );
        }
        const leaves = await this.tree.leaves(input.mint);
        const inner = await this.prover.unshieldProof({
          spendSk: this.spendSk(),
          k: input.k,
          v: input.noteValue,
          index: input.leafIndex,
          leaves,
          recipientField: pubkeyToFrHex(input.recipient.toBytes()),
          amount: input.amount,
          changeK,
        });
        return {
          root: inner.root,
          nullifier: inner.nullifier,
          change_cm: inner.changeCm,
          proof: bytesToHex(inner.proof),
          amount: input.amount.toString(),
        };
      })());

    const amount = BigInt(proved.amount ?? input.amount.toString());
    return this.relay.enqueue(async () => {
      const sig = await this.client.sendRelayerWithdraw({
        recipient: input.recipient,
        amount,
        rootHex: proved.root,
        nullifierHex: proved.nullifier,
        changeCmHex: proved.change_cm,
        proof: hexToBytes(proved.proof),
      });
      const tree = await this.client.fetchTree();
      await this.tree.append({
        mint: input.mint,
        leaf: proved.change_cm,
        root: bytesToHex(tree.root),
      });
      await this.tree.markSpent(input.commitment, proved.nullifier);
      const changeValue = input.noteValue - amount;
      if (changeValue > 0n) {
        await this.tree.recordNote({
          mint: input.mint,
          leafIndex: Number(tree.nextIndex) - 1,
          commitment: proved.change_cm,
          ownerPk: input.ownerPk,
          blindingK: input.clientProof ? '' : changeK,
          value: changeValue,
          paymentLinkId: input.paymentLinkId ?? null,
        });
      }
      this.logger.log(`unshield nf=${proved.nullifier.slice(0, 10)}… sig=${sig}`);
      return sig;
    });
  }

  async ownerPublicKey(): Promise<string> {
    return this.ownerPk();
  }

  async proveDeposit(input: {
    ownerPk: string;
    k: string;
    amount: bigint;
  }) {
    return this.prover.depositProof(input);
  }

  async proveUnshield(input: {
    spendSk: string;
    k: string;
    v: bigint;
    index: number;
    recipient: string;
    amount: bigint;
    changeK: string;
  }) {
    const leaves = await this.tree.leaves(this.client.mint().toBase58());
    return this.prover.unshieldProof({
      spendSk: spendSkBytes(input.spendSk),
      k: input.k,
      v: input.v,
      index: input.index,
      leaves,
      recipientField: pubkeyToFrHex(new PublicKey(input.recipient).toBytes()),
      amount: input.amount,
      changeK: input.changeK,
    });
  }

  private pickRecipient(input: SettleInput): PublicKey | null {
    return (
      parsePubkey(input.payeeRef) ??
      parsePubkey(input.payoutAddress)
    );
  }

  private spendSk(): string {
    const fromEnv = loadConfig().pool.spendSk;
    if (fromEnv) return spendSkBytes(fromEnv);
    const file = path.join(path.resolve(loadConfig().pool.keysDir), 'spend.sk');
    if (fs.existsSync(file)) {
      return spendSkBytes(fs.readFileSync(file, 'utf8').trim());
    }
    const generated = randomFrHex();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${generated}\n`);
    this.logger.warn(`wrote new pool spend key to ${file}`);
    return generated;
  }

  private async ownerPk(): Promise<string> {
    if (this.ownerPkCache) return this.ownerPkCache;
    this.ownerPkCache = await this.prover.ownerPk(this.spendSk());
    return this.ownerPkCache;
  }
}

function parsePubkey(value: string | null | undefined): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
