import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { getKeyPrefix } from '../../common/utils/crypto.util';
import { AgentContext } from './agent-context';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(rawKey: string): Promise<AgentContext | null> {
    const keyPrefix = getKeyPrefix(rawKey);
    if (!keyPrefix) {
      return null;
    }

    const candidates = await this.prisma.apiKey.findMany({
      where: { keyPrefix, active: true, revokedAt: null },
      include: { agent: true },
    });

    for (const candidate of candidates) {
      if (!(await bcrypt.compare(rawKey, candidate.secretHash))) {
        continue;
      }
      if (!candidate.agent.active) {
        return null;
      }

      void this.prisma.apiKey
        .update({
          where: { id: candidate.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);

      return {
        agentId: candidate.agent.id,
        agentPublicId: candidate.agent.publicId,
        businessId: candidate.agent.businessId,
        apiKeyId: candidate.publicId,
        currency: candidate.agent.currency,
        perTxLimitMinor: candidate.agent.perTxLimitMinor,
        dailyLimitMinor: candidate.agent.dailyLimitMinor,
        autoApproveLimitMinor: candidate.agent.autoApproveLimitMinor,
      };
    }

    return null;
  }
}
