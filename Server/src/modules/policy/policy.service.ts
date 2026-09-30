import { Injectable } from '@nestjs/common';
import { IntentStatus, PolicyDecision } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AgentContext } from '../auth/agent-context';

export interface PolicyRequest {
  agent: AgentContext;
  payeeRef: string;
  amountMinor: bigint;
  currency: string;
}

export interface PolicyResult {
  decision: PolicyDecision;
  reasons: string[];
  /// Snapshot of the authority the decision was made against, for the audit trail.
  spentTodayMinor: bigint;
  remainingTodayMinor: bigint;
}

/// Statuses that have already consumed the agent's daily authority. An intent
/// waiting on a human has not spent anything yet, so it does not count.
const CONSUMES_AUTHORITY: IntentStatus[] = [
  IntentStatus.authorized,
  IntentStatus.settling,
  IntentStatus.settled,
];

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(request: PolicyRequest): Promise<PolicyResult> {
    const { agent, amountMinor, currency, payeeRef } = request;
    const denials: string[] = [];
    const notes: string[] = [];

    if (currency !== agent.currency) {
      denials.push(
        `currency_not_permitted: agent is scoped to ${agent.currency}, intent used ${currency}`,
      );
    }

    if (amountMinor > agent.perTxLimitMinor) {
      denials.push(
        `per_transaction_limit_exceeded: ${amountMinor} > ${agent.perTxLimitMinor}`,
      );
    }

    const payee = await this.prisma.allowedPayee.findUnique({
      where: {
        businessId_payeeRef: { businessId: agent.businessId, payeeRef },
      },
    });

    if (!payee || !payee.active) {
      denials.push(`payee_not_allowlisted: ${payeeRef}`);
    } else {
      notes.push(`payee_allowlisted: ${payee.label}`);
    }

    const spentTodayMinor = await this.spentToday(agent.agentId);
    const remainingTodayMinor = agent.dailyLimitMinor - spentTodayMinor;

    if (amountMinor > remainingTodayMinor) {
      denials.push(
        `daily_limit_exceeded: ${amountMinor} > ${remainingTodayMinor} remaining of ${agent.dailyLimitMinor}`,
      );
    }

    if (denials.length > 0) {
      return {
        decision: PolicyDecision.denied,
        reasons: denials,
        spentTodayMinor,
        remainingTodayMinor,
      };
    }

    if (amountMinor > agent.autoApproveLimitMinor) {
      return {
        decision: PolicyDecision.needs_human_approval,
        reasons: [
          ...notes,
          `above_auto_approve_threshold: ${amountMinor} > ${agent.autoApproveLimitMinor}`,
        ],
        spentTodayMinor,
        remainingTodayMinor,
      };
    }

    return {
      decision: PolicyDecision.authorized,
      reasons: [
        ...notes,
        `within_auto_approve_threshold: ${amountMinor} <= ${agent.autoApproveLimitMinor}`,
        `within_per_transaction_limit: ${amountMinor} <= ${agent.perTxLimitMinor}`,
      ],
      spentTodayMinor,
      remainingTodayMinor,
    };
  }

  /// Re-checks limits at approval time. A human clicking "approve" an hour later
  /// must not be able to push the agent past its daily ceiling.
  async revalidateForApproval(
    agent: AgentContext,
    amountMinor: bigint,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const spentTodayMinor = await this.spentToday(agent.agentId);
    const remaining = agent.dailyLimitMinor - spentTodayMinor;

    if (amountMinor > remaining) {
      return {
        ok: false,
        reason: `daily_limit_exceeded: ${amountMinor} > ${remaining} remaining`,
      };
    }
    if (amountMinor > agent.perTxLimitMinor) {
      return {
        ok: false,
        reason: `per_transaction_limit_exceeded: ${amountMinor} > ${agent.perTxLimitMinor}`,
      };
    }
    return { ok: true };
  }

  async spentToday(agentId: string): Promise<bigint> {
    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);

    const result = await this.prisma.paymentIntent.aggregate({
      where: {
        agentId,
        status: { in: CONSUMES_AUTHORITY },
        createdAt: { gte: startOfUtcDay },
      },
      _sum: { amountMinor: true },
    });

    return result._sum.amountMinor ?? 0n;
  }
}
