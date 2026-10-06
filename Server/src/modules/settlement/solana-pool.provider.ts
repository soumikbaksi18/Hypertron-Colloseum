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
import { bytesToHex, randomFrHex } from './pool/pool.bytes';
import { PoolClient } from './pool/pool.client';
import { PoolProver, pubkeyToFrHex, spendSkBytes } from './pool/pool.prover';
import { PoolTreeService } from './pool/pool-tree.service';

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
  ) {}

  async settle(input: SettleInput): Promise<SettlementResult> {
    return this.lock.run(() => this.settleLocked(input));
  }

  async prepareCustomerDeposit(input: {
    paymentLinkId: string;
    payer: string;
    amount: bigint;
    viewPub: string | null;
  }): Promise<{ transaction: string; commitment: string }> {
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
      outSig = await this.unshieldTo({
        mint,
        ownerPk,
        k,
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
  }): Promise<{ transaction: string; commitment: string }> {
    const depositor = new PublicKey(input.payer);
    await this.client.ensureLocalnetPayer(depositor, input.amount);

    const ownerPk = await this.ownerPk();
    const k = randomFrHex();
    const proved = await this.prover.depositProof({
      ownerPk,
      k,
      amount: input.amount,
    });
    const transaction = await this.client.serializeUnsignedDeposit({
      depositor,
      amount: input.amount,
      commitmentHex: proved.commitment,
      proof: proved.proof,
    });
    await this.tree.savePending({
      paymentLinkId: input.paymentLinkId,
      commitment: proved.commitment,
      proofHex: bytesToHex(proved.proof),
      ownerPk,
      blindingK: k,
      amount: input.amount,
    });
    return { transaction, commitment: proved.commitment };
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
    const encryptedBlob = await this.prover.encryptNote({
      recipientView: input.viewPub ?? '',
      ownerPk: pending.ownerPk,
      k: pending.blindingK,
      v: pending.amount,
    });
    const nullifier = await this.prover.nullifier(
      this.spendSk(),
      pending.blindingK,
    );
    await this.tree.recordNote({
      mint,
      leafIndex,
      commitment: pending.commitment,
      ownerPk: pending.ownerPk,
      blindingK: pending.blindingK,
      value: pending.amount,
      encryptedBlob,
      nullifier,
      paymentLinkId: input.paymentLinkId,
    });
  }

  async unshieldInvoice(paymentLinkId: string, destination: string): Promise<string> {
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
      return this.unshieldTo({
        mint: note.mint,
        ownerPk: note.ownerPk,
        k: note.blindingK,
        amount: note.value,
        leafIndex: note.leafIndex,
        commitment: note.commitment,
        recipient,
      });
    });
  }

  private async unshieldTo(input: {
    mint: string;
    ownerPk: string;
    k: string;
    amount: bigint;
    leafIndex: number;
    commitment: string;
    recipient: PublicKey;
  }): Promise<string> {
    const leaves = await this.tree.leaves(input.mint);
    const changeK = randomFrHex();
    const proved = await this.prover.unshieldProof({
      spendSk: this.spendSk(),
      k: input.k,
      v: input.amount,
      index: input.leafIndex,
      leaves,
      recipientField: pubkeyToFrHex(input.recipient.toBytes()),
      amount: input.amount,
      changeK,
    });
    const sig = await this.client.sendRelayerWithdraw({
      recipient: input.recipient,
      amount: input.amount,
      rootHex: proved.root,
      nullifierHex: proved.nullifier,
      changeCmHex: proved.changeCm,
      proof: proved.proof,
    });
    const tree = await this.client.fetchTree();
    await this.tree.append({
      mint: input.mint,
      leaf: proved.changeCm,
      root: bytesToHex(tree.root),
    });
    await this.tree.markSpent(input.commitment, proved.nullifier);
    return sig;
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
