import { Injectable } from '@nestjs/common';
import { IntentStatus, PaymentIntent, Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StateTransitionException } from '../../common/exceptions/hypertron.exception';
import { IntentEventsService } from './intent-events.service';

/// The only legal shape of the lifecycle:
///
///   requires_authorization ─┬─> denied
///                           ├─> requires_approval ─┬─> authorized
///                           │                      ├─> denied
///                           │                      └─> canceled
///                           └─> authorized ─┬─> settling ─┬─> settled
///                                           └─> canceled  └─> failed
const ALLOWED_FROM: Record<IntentStatus, IntentStatus[]> = {
  [IntentStatus.requires_authorization]: [],
  [IntentStatus.requires_approval]: [IntentStatus.requires_authorization],
  [IntentStatus.authorized]: [
    IntentStatus.requires_authorization,
    IntentStatus.requires_approval,
  ],
  [IntentStatus.denied]: [
    IntentStatus.requires_authorization,
    IntentStatus.requires_approval,
  ],
  [IntentStatus.settling]: [IntentStatus.authorized],
  [IntentStatus.settled]: [IntentStatus.settling],
  [IntentStatus.failed]: [IntentStatus.settling],
  [IntentStatus.canceled]: [
    IntentStatus.requires_authorization,
    IntentStatus.requires_approval,
    IntentStatus.authorized,
  ],
};

const EVENT_TYPE: Record<IntentStatus, string> = {
  [IntentStatus.requires_authorization]: 'payment_intent.created',
  [IntentStatus.requires_approval]: 'payment_intent.requires_approval',
  [IntentStatus.authorized]: 'payment_intent.authorized',
  [IntentStatus.denied]: 'payment_intent.denied',
  [IntentStatus.settling]: 'payment_intent.settling',
  [IntentStatus.settled]: 'payment_intent.settled',
  [IntentStatus.failed]: 'payment_intent.failed',
  [IntentStatus.canceled]: 'payment_intent.canceled',
};

@Injectable()
export class IntentStateMachine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: IntentEventsService,
  ) {}

  async transition(
    intentId: string,
    to: IntentStatus,
    data: Prisma.PaymentIntentUpdateInput = {},
  ): Promise<PaymentIntent> {
    const from = ALLOWED_FROM[to];

    // Compare-and-set: the status guard lives in the WHERE clause, so two
    // concurrent callers cannot both win the same transition.
    const updated = await this.prisma.paymentIntent.updateMany({
      where: { id: intentId, status: { in: from } },
      data: { ...data, status: to },
    });

    if (updated.count === 0) {
      const current = await this.prisma.paymentIntent.findUnique({
        where: { id: intentId },
      });
      if (!current) {
        throw new StateTransitionException(`Payment intent ${intentId} not found.`);
      }
      // Losing the race to the same target is a no-op, not an error.
      if (current.status === to) {
        return current;
      }
      throw new StateTransitionException(
        `Cannot move payment intent from ${current.status} to ${to}.`,
      );
    }

    const intent = await this.prisma.paymentIntent.findUniqueOrThrow({
      where: { id: intentId },
    });

    await this.events.emit(intent, EVENT_TYPE[to]);
    return intent;
  }

  eventTypeFor(status: IntentStatus): string {
    return EVENT_TYPE[status];
  }
}
