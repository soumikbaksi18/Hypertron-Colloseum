import { Injectable, Logger } from '@nestjs/common';

import { loadConfig } from '../../../common/config/configuration';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { strip0x } from './pool.bytes';

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
        encryptedBlob: input.encryptedBlob ?? null,
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
      create: { ...input, expiresAt },
      update: { ...input, expiresAt },
    });
  }

  async takePending(paymentLinkId: string) {
    const row = await this.prisma.poolPendingDeposit.findUnique({
      where: { paymentLinkId },
    });
    if (!row) return null;
    if (row.expiresAt.getTime() < Date.now()) {
      await this.prisma.poolPendingDeposit.delete({ where: { id: row.id } });
      return null;
    }
    await this.prisma.poolPendingDeposit.delete({ where: { id: row.id } });
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
}
