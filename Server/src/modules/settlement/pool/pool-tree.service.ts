import { Injectable, Logger } from '@nestjs/common';

import { loadConfig } from '../../../common/config/configuration';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { hexBlobOrNull, strip0x } from './pool.bytes';

@Injectable()
export class PoolTreeService {
  private readonly logger = new Logger(PoolTreeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async leaves(mint: string): Promise<string[]> {
    const local = await this.localLeaves(mint);
    const indexed = await this.indexerLeaves();
    if (indexed && this.samePrefix(indexed, local)) return indexed;
    if (indexed && indexed.length > 0 && indexed.length < local.length) {
      this.logger.warn(
        `indexer tree is short (${indexed.length} < ${local.length}); using local leaves`,
      );
    }
    return local;
  }

  indexOfLeaf(leaves: string[], commitment: string): number {
    const want = strip0x(commitment).toLowerCase();
    return leaves.findIndex((leaf) => strip0x(leaf).toLowerCase() === want);
  }

  private async localLeaves(mint: string): Promise<string[]> {
    const rows = await this.prisma.poolLeaf.findMany({
      where: { mint },
      orderBy: { index: 'asc' },
    });
    return rows.map((row) => row.leaf);
  }

  private samePrefix(indexed: string[], local: string[]): boolean {
    if (indexed.length < local.length) return false;
    return local.every(
      (leaf, i) =>
        strip0x(indexed[i] ?? '').toLowerCase() === strip0x(leaf).toLowerCase(),
    );
  }

  private async indexerLeaves(): Promise<string[] | null> {
    const base = loadConfig().pool.indexerUrl;
    if (!base) return null;
    try {
      const network = loadConfig().pool.network;
      const response = await fetch(`${base}/v1/pool/${network}/leaves?since=0`, {
        signal: AbortSignal.timeout(2_500),
      });
      if (!response.ok) return null;
      const json = (await response.json()) as { leaves?: string[] };
      if (!Array.isArray(json.leaves) || json.leaves.length === 0) return null;
      return json.leaves;
    } catch (error) {
      this.logger.debug(`indexer leaves fallback: ${String(error)}`);
      return null;
    }
  }

  async append(input: {
    mint: string;
    leaf: string;
    root?: string | null;
  }): Promise<number> {
    const count = await this.prisma.poolLeaf.count({ where: { mint: input.mint } });
    await this.prisma.poolLeaf.upsert({
      where: { mint_index: { mint: input.mint, index: count } },
      create: {
        mint: input.mint,
        index: count,
        leaf: input.leaf,
        root: input.root ?? null,
      },
      update: { leaf: input.leaf, root: input.root ?? null },
    });
    return count;
  }

  async recordNote(input: {
    mint: string;
    leafIndex: number;
    commitment: string;
    ownerPk: string;
    blindingK: string;
    value: bigint;
    encryptedBlob?: string | null;
    nullifier?: string | null;
    intentPublicId?: string | null;
    paymentLinkId?: string | null;
  }): Promise<void> {
    await this.prisma.poolNote.create({
      data: {
        mint: input.mint,
        leafIndex: input.leafIndex,
        commitment: input.commitment,
        ownerPk: input.ownerPk,
        blindingK: input.blindingK,
        value: input.value,
        encryptedBlob: hexBlobOrNull(input.encryptedBlob),
        nullifier: input.nullifier ?? null,
        intentPublicId: input.intentPublicId ?? null,
        paymentLinkId: input.paymentLinkId ?? null,
      },
    });
  }

  async markSpent(commitment: string, nullifier: string): Promise<void> {
    await this.prisma.poolNote.updateMany({
      where: { commitment },
      data: { spent: true, nullifier },
    });
  }

  async savePending(input: {
    paymentLinkId: string;
    commitment: string;
    proofHex: string;
    ownerPk: string;
    blindingK: string;
    amount: bigint;
    encryptedBlob?: string | null;
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.poolPendingDeposit.upsert({
      where: { paymentLinkId: input.paymentLinkId },
      create: { ...input, status: 'prepared', expiresAt },
      update: { ...input, expiresAt },
    });
  }

  async peekPending(paymentLinkId: string) {
    return this.prisma.poolPendingDeposit.findUnique({
      where: { paymentLinkId },
    });
  }

  async attachPendingTx(paymentLinkId: string, txSignature: string) {
    return this.prisma.poolPendingDeposit.update({
      where: { paymentLinkId },
      data: { txSignature, status: 'submitted' },
    });
  }

  async markPendingStatus(
    paymentLinkId: string,
    status: 'prepared' | 'submitted' | 'confirmed' | 'failed' | 'expired',
  ) {
    return this.prisma.poolPendingDeposit.update({
      where: { paymentLinkId },
      data: { status },
    });
  }

  async consumePending(paymentLinkId: string) {
    await this.prisma.poolPendingDeposit.deleteMany({
      where: { paymentLinkId },
    });
  }

  /** Kept for callers that still expect a one-shot take. Does not delete submitted txs. */
  async takePending(paymentLinkId: string) {
    const row = await this.peekPending(paymentLinkId);
    if (!row) return null;
    if (row.txSignature) return row;
    if (row.expiresAt.getTime() < Date.now()) {
      await this.prisma.poolPendingDeposit.delete({ where: { id: row.id } });
      return null;
    }
    return row;
  }

  async findOpenNote(paymentLinkId: string) {
    return this.prisma.poolNote.findFirst({
      where: { paymentLinkId, spent: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listOpenByOwner(ownerPk: string) {
    return this.prisma.poolNote.findMany({
      where: { ownerPk, spent: false },
      orderBy: { leafIndex: 'asc' },
    });
  }

  async findOpenByCommitment(commitment: string) {
    return this.prisma.poolNote.findFirst({
      where: { commitment, spent: false },
    });
  }

  async listNotesForDisclose() {
    return this.prisma.poolNote.findMany({
      where: { encryptedBlob: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async paymentLinksByPublicIds(ids: string[]) {
    if (!ids.length) return [];
    return this.prisma.paymentLink.findMany({
      where: { publicId: { in: ids } },
      include: { business: { select: { handle: true, name: true } } },
    });
  }

  async signaturesForCommitments(commitments: string[]): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    if (!commitments.length) return found;
    const byLeaf = new Map(
      commitments.map((commitment) => [strip0x(commitment).toLowerCase(), commitment]),
    );
    const base = loadConfig().pool.indexerUrl;
    if (base) {
      try {
        const network = loadConfig().pool.network;
        const query = encodeURIComponent(commitments.join(','));
        const response = await fetch(
          `${base}/v1/pool/${network}/commitments?leaves=${query}`,
          { signal: AbortSignal.timeout(2_500) },
        );
        if (response.ok) {
          const json = (await response.json()) as {
            commitments?: { leaf?: string; txHash?: string }[];
          };
          for (const row of json.commitments ?? []) {
            const key = strip0x(row.leaf ?? '').toLowerCase();
            const original = byLeaf.get(key);
            if (original && row.txHash) found.set(original, row.txHash);
          }
        }
      } catch (error) {
        this.logger.debug(`indexer signatures: ${String(error)}`);
      }
    }
    return found;
  }

  async listIdentityHints() {
    return this.prisma.business.findMany({
      where: { OR: [{ ownerPk: { not: null } }, { handle: { not: null } }] },
      select: { ownerPk: true, handle: true, name: true, walletPubkey: true },
    });
  }
}
