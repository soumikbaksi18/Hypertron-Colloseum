import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntentStatus, PaymentIntent, PolicyDecision } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  InvalidRequestException,
  ResourceNotFoundException,
  StateTransitionException,
} from '../../common/exceptions/hypertron.exception';
import { publicId } from '../../common/utils/crypto.util';
import { AgentContext } from '../auth/agent-context';
import { PolicyService } from '../policy/policy.service';
import { PRIVATE_SETTLEMENT_PROVIDER } from '../settlement/settlement.types';
import type { PrivateSettlementProvider } from '../settlement/settlement.types';
import { ApproveIntentDto } from './dto/approve-intent.dto';
import { CreateIntentDto } from './dto/create-intent.dto';
import { IntentEventsService } from './intent-events.service';
import { IntentStateMachine } from './intent-state-machine';
import { IntentResponse, toIntentResponse } from './intent.mapper';

@Injectable()
export class IntentsService {
  private readonly logger = new Logger(IntentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly stateMachine: IntentStateMachine,
    private readonly events: IntentEventsService,
    @Inject(PRIVATE_SETTLEMENT_PROVIDER)
    private readonly settlement: PrivateSettlementProvider,
  ) {}

  /// Agent -> Payment Intent -> Policy & Authorization.
  ///
  /// Policy is evaluated synchronously so the agent learns immediately whether it
  /// is authorized. Settlement then runs in the background.
  async create(dto: CreateIntentDto, agent: AgentContext): Promise<IntentResponse> {
    const amountMinor = BigInt(dto.amount_minor);
    const currency = dto.currency ?? agent.currency;

    const created = await this.prisma.paymentIntent.create({
      data: {
        publicId: publicId('pi'),
        businessId: agent.businessId,
        agentId: agent.agentId,
        payeeRef: dto.payee_ref,
        amountMinor,
        currency,
        reference: dto.reference ?? null,
        status: IntentStatus.requires_authorization,
      },
    });

    await this.events.emit(created, 'payment_intent.created');

    const result = await this.policy.evaluate({
      agent,
      payeeRef: dto.payee_ref,
      amountMinor,
      currency,
    });

    const decided = await this.stateMachine.transition(
      created.id,
      this.statusFor(result.decision),
      {
        policyDecision: result.decision,
        policyReasons: result.reasons,
        policyEvaluatedAt: new Date(),
      },
    );

    if (decided.status === IntentStatus.authorized) {
      this.settleInBackground(decided.id);
    }

    return toIntentResponse(decided);
  }

  async get(publicIdValue: string, agent: AgentContext): Promise<IntentResponse> {
    return toIntentResponse(await this.load(publicIdValue, agent));
  }

  async list(agent: AgentContext, limit: number): Promise<IntentResponse[]> {
    const intents = await this.prisma.paymentIntent.findMany({
      where: { businessId: agent.businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return intents.map(toIntentResponse);
  }

  /// The human-in-the-loop leg. Limits are re-checked here because an approval can
  /// land long after the intent was created.
  async decide(
    publicIdValue: string,
    dto: ApproveIntentDto,
    agent: AgentContext,
  ): Promise<IntentResponse> {
    const intent = await this.load(publicIdValue, agent);

    if (intent.status !== IntentStatus.requires_approval) {
      throw new StateTransitionException(
        `Payment intent is ${intent.status} and is not awaiting approval.`,
      );
    }

    if (dto.action === 'deny') {
      const denied = await this.stateMachine.transition(
        intent.id,
        IntentStatus.denied,
        {
          policyDecision: PolicyDecision.denied,
          policyReasons: [
            ...intent.policyReasons,
            `denied_by_human: ${dto.approved_by}${dto.reason ? ` (${dto.reason})` : ''}`,
          ],
        },
      );
      return toIntentResponse(denied);
    }

    const recheck = await this.policy.revalidateForApproval(agent, intent.amountMinor);
    if (!recheck.ok) {
      const denied = await this.stateMachine.transition(
        intent.id,
        IntentStatus.denied,
        {
          policyDecision: PolicyDecision.denied,
          policyReasons: [...intent.policyReasons, recheck.reason],
        },
      );
      return toIntentResponse(denied);
    }

    const authorized = await this.stateMachine.transition(
      intent.id,
      IntentStatus.authorized,
      {
        policyDecision: PolicyDecision.authorized,
        policyReasons: [
          ...intent.policyReasons,
          `approved_by_human: ${dto.approved_by}`,
        ],
        approvedBy: dto.approved_by,
        approvedAt: new Date(),
      },
    );

    this.settleInBackground(authorized.id);
    return toIntentResponse(authorized);
  }

  async cancel(publicIdValue: string, agent: AgentContext): Promise<IntentResponse> {
    const intent = await this.load(publicIdValue, agent);
    const canceled = await this.stateMachine.transition(
      intent.id,
      IntentStatus.canceled,
    );
    return toIntentResponse(canceled);
  }

  /// Private Settlement -> Reconciliation.
  ///
  /// Detached from the request so the agent is never blocked on proof generation;
  /// completion reaches the caller through the receipt endpoint or a webhook.
  private settleInBackground(intentId: string): void {
    void this.settle(intentId).catch((error) => {
      this.logger.error(`settlement failed for ${intentId}: ${String(error)}`);
    });
  }

  private async settle(intentId: string): Promise<void> {
    const settling = await this.stateMachine.transition(
      intentId,
      IntentStatus.settling,
    );

    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: settling.businessId },
      select: { viewPub: true, payoutAddress: true, walletPubkey: true },
    });

    try {
      const result = await this.settlement.settle({
        intentPublicId: settling.publicId,
        payeeRef: settling.payeeRef,
        amountMinor: settling.amountMinor,
        currency: settling.currency,
        viewPub: business.viewPub,
        payoutAddress: business.payoutAddress ?? business.walletPubkey,
      });

      await this.stateMachine.transition(intentId, IntentStatus.settled, {
        settlementId: result.settlementId,
        commitment: result.commitment,
        nullifier: result.nullifier,
        txSignature: result.txSignature,
        viewKeyHint: result.viewKeyHint,
        settledAt: new Date(),
      });
    } catch (error) {
      await this.stateMachine.transition(intentId, IntentStatus.failed, {
        failureCode: 'settlement_failed',
        failureMessage: String(error).slice(0, 500),
      });
    }
  }

  private statusFor(decision: PolicyDecision): IntentStatus {
    switch (decision) {
      case PolicyDecision.authorized:
        return IntentStatus.authorized;
      case PolicyDecision.needs_human_approval:
        return IntentStatus.requires_approval;
      case PolicyDecision.denied:
        return IntentStatus.denied;
    }
  }

  private async load(
    publicIdValue: string,
    agent: AgentContext,
  ): Promise<PaymentIntent> {
    if (!publicIdValue.startsWith('pi_')) {
      throw new InvalidRequestException(
        'invalid_intent_id',
        'Payment intent ids look like "pi_...".',
      );
    }

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { publicId: publicIdValue },
    });

    // Scope to the business, and do not leak existence across tenants.
    if (!intent || intent.businessId !== agent.businessId) {
      throw new ResourceNotFoundException(
        `No such payment intent: ${publicIdValue}`,
      );
    }

    return intent;
  }
}
