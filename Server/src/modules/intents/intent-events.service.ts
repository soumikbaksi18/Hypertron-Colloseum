import { Injectable, Logger } from '@nestjs/common';
import { PaymentIntent } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { publicId } from '../../common/utils/crypto.util';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { toIntentResponse } from './intent.mapper';

@Injectable()
export class IntentEventsService {
  private readonly logger = new Logger(IntentEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookDeliveryService,
  ) {}

  async emit(intent: PaymentIntent, type: string): Promise<void> {
    const snapshot = toIntentResponse(intent);

    const event = await this.prisma.intentEvent.upsert({
      where: { intentId_type: { intentId: intent.id, type } },
      create: {
        publicId: publicId('evt'),
        intentId: intent.id,
        type,
        data: snapshot as unknown as object,
      },
      update: {},
    });

    // A webhook problem must never roll back a settled payment.
    try {
      await this.webhooks.dispatch(intent.businessId, event.publicId, type);
    } catch (error) {
      this.logger.error(`failed to enqueue webhook for ${type}: ${String(error)}`);
    }
  }
}
