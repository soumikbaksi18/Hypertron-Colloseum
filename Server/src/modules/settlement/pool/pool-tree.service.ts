import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PoolTreeService {
  constructor(private readonly prisma: PrismaService) {}

  async leaves(mint: string): Promise<string[]> {
    const rows = await this.prisma.poolLeaf.findMany({
      where: { mint },
      orderBy: { index: 'asc' },
    });
    return rows.map((row) => row.leaf);
  }

  async append(input: {
    mint: string;
    leaf: string;
    root?: string | null;
  }): Promise<number> {
    const count = await this.prisma.poolLeaf.count({ where: { mint: input.mint } });
    await this.prisma.poolLeaf.create({
      data: {
        mint: input.mint,
        index: count,
        leaf: input.leaf,
        root: input.root ?? null,
      },
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
}
