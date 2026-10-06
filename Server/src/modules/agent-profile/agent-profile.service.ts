import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AgentContext } from '../auth/agent-context';
import { PolicyService } from '../policy/policy.service';

export interface AgentProfile {
  agent_id: string;
  label: string;
  business_name: string;
  currency: string;
  limits: {
    per_transaction_minor: string;
    daily_minor: string;
    auto_approve_minor: string;
  };
  today: {
    spent_minor: string;
    remaining_minor: string;
  };
  allowed_payees: { payee_ref: string; label: string }[];
}

@Injectable()
export class AgentProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async describe(agent: AgentContext): Promise<AgentProfile> {
    const [record, payees, spentToday] = await Promise.all([
      this.prisma.agent.findUniqueOrThrow({
        where: { id: agent.agentId },
        include: { business: { select: { name: true } } },
      }),
      this.prisma.allowedPayee.findMany({
        where: { businessId: agent.businessId, active: true },
        orderBy: { label: 'asc' },
        select: { payeeRef: true, label: true },
      }),
      this.policy.spentToday(agent.agentId),
    ]);

    const remaining = record.dailyLimitMinor - spentToday;

    return {
      agent_id: record.publicId,
      label: record.label,
      business_name: record.business.name,
      currency: record.currency,
      limits: {
        per_transaction_minor: record.perTxLimitMinor.toString(),
        daily_minor: record.dailyLimitMinor.toString(),
        auto_approve_minor: record.autoApproveLimitMinor.toString(),
      },
      today: {
        spent_minor: spentToday.toString(),
        remaining_minor: (remaining > 0n ? remaining : 0n).toString(),
      },
      allowed_payees: payees.map((payee) => ({
        payee_ref: payee.payeeRef,
        label: payee.label,
      })),
    };
  }
}
