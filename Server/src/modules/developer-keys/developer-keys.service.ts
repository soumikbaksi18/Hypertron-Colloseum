import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { loadConfig } from '../../common/config/configuration';
import {
  ResourceNotFoundException,
} from '../../common/exceptions/hypertron.exception';
import { generateApiKey, publicId } from '../../common/utils/crypto.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BusinessContext } from '../wallet-auth/business-context';

@Injectable()
export class DeveloperKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { agent: { businessId } },
      include: { agent: { select: { publicId: true, label: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((key) => this.toRecord(key));
  }

  async create(business: BusinessContext) {
    const agent = await this.ensureWorkspaceAgent(business.businessId);
    const generated = generateApiKey();
    const saltRounds = loadConfig().apiKeySaltRounds;
    const created = await this.prisma.apiKey.create({
      data: {
        publicId: publicId('ak'),
        agentId: agent.id,
        keyPrefix: generated.keyPrefix,
        secretHash: await bcrypt.hash(generated.raw, saltRounds),
        lastFour: generated.lastFour,
      },
      include: { agent: { select: { publicId: true, label: true } } },
    });

    return {
      ...this.toRecord(created),
      secret: generated.raw,
    };
  }

  async revoke(businessId: string, publicIdValue: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { publicId: publicIdValue, agent: { businessId } },
    });
    if (!key) {
      throw new ResourceNotFoundException('API key not found.');
    }
    const updated = await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { active: false, revokedAt: new Date() },
      include: { agent: { select: { publicId: true, label: true } } },
    });
    return this.toRecord(updated);
  }

  private async ensureWorkspaceAgent(businessId: string) {
    const existing = await this.prisma.agent.findFirst({
      where: { businessId, active: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    const usdc = (whole: number) => BigInt(whole) * 1_000_000n;
    return this.prisma.agent.create({
      data: {
        publicId: publicId('agt'),
        businessId,
        label: 'workspace-agent',
        currency: 'USDC',
        perTxLimitMinor: usdc(5_000),
        dailyLimitMinor: usdc(20_000),
        autoApproveLimitMinor: usdc(1_000),
      },
    });
  }

  private toRecord(key: {
    publicId: string;
    lastFour: string;
    active: boolean;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    agent: { publicId: string; label: string };
  }) {
    return {
      id: key.publicId,
      last_four: key.lastFour,
      active: key.active && !key.revokedAt,
      last_used_at: key.lastUsedAt?.toISOString() ?? null,
      revoked_at: key.revokedAt?.toISOString() ?? null,
      created_at: key.createdAt.toISOString(),
      agent_id: key.agent.publicId,
      agent_label: key.agent.label,
    };
  }
}
