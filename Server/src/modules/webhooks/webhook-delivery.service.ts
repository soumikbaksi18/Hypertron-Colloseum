import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { publicId, signWebhookPayload } from '../../common/utils/crypto.util';
import {
  DELIVERY_ID_HEADER,
  DELIVERY_TIMEOUT_MS,
  EVENT_ID_HEADER,
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  SIGNATURE_HEADER,
  isRetryableStatus,
} from './webhooks.constants';

const SWEEP_INTERVAL_MS = 2_000;

/// Delivers signed lifecycle events to the business's endpoint.
///
/// The database is authoritative for attempt state and a periodic sweep picks up
/// anything due, so retries survive a restart. Redis/BullMQ is the upgrade path
/// once throughput justifies it; the interface here does not change.
@Injectable()
export class WebhookDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private timer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /// Fans an intent event out to every active endpoint subscribed to its type.
  async dispatch(
    businessId: string,
    eventPublicId: string,
    eventType: string,
  ): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { businessId, active: true },
    });

    for (const endpoint of endpoints) {
      const subscribed =
        endpoint.events.length === 0 || endpoint.events.includes(eventType);
      if (!subscribed) {
        continue;
      }

      await this.prisma.webhookDelivery.upsert({
        where: {
          endpointId_eventId: { endpointId: endpoint.id, eventId: eventPublicId },
        },
        create: {
          publicId: publicId('whd'),
          endpointId: endpoint.id,
          eventId: eventPublicId,
          nextAttemptAt: new Date(),
        },
        update: {},
      });
    }

    void this.sweep();
  }

  private async sweep(): Promise<void> {
    if (this.sweeping) {
      return;
    }
    this.sweeping = true;

    try {
      const due = await this.prisma.webhookDelivery.findMany({
        where: {
          status: DeliveryStatus.pending,
          nextAttemptAt: { lte: new Date() },
        },
        include: { endpoint: true },
        take: 20,
      });

      for (const delivery of due) {
        await this.attempt(delivery.id);
      }
    } catch (error) {
      this.logger.error(`webhook sweep failed: ${String(error)}`);
    } finally {
      this.sweeping = false;
    }
  }

  private async attempt(deliveryId: string): Promise<void> {
    // Claim the row so a concurrent sweep cannot double-send this attempt.
    const claimed = await this.prisma.webhookDelivery.updateMany({
      where: { id: deliveryId, status: DeliveryStatus.pending },
      data: { nextAttemptAt: null },
    });
    if (claimed.count === 0) {
      return;
    }

    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery) {
      return;
    }

    const event = await this.prisma.intentEvent.findUnique({
      where: { publicId: delivery.eventId },
    });
    if (!event) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.failed, error: 'event_missing' },
      });
      return;
    }

    const body = JSON.stringify({
      id: event.publicId,
      type: event.type,
      created: Math.floor(event.createdAt.getTime() / 1000),
      data: event.data,
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const attemptCount = delivery.attemptCount + 1;

    let responseStatus: number | null = null;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Hypertron-Webhooks/1.0',
          [SIGNATURE_HEADER]: signWebhookPayload(
            delivery.endpoint.signingSecret,
            timestamp,
            body,
          ),
          [EVENT_ID_HEADER]: event.publicId,
          [DELIVERY_ID_HEADER]: delivery.publicId,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      responseStatus = response.status;
    } catch (error) {
      errorMessage = String(error);
    }

    const delivered = responseStatus !== null && responseStatus < 300;

    if (delivered) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.succeeded,
          attemptCount,
          responseStatus,
          error: null,
          nextAttemptAt: null,
        },
      });
      return;
    }

    const retryable = isRetryableStatus(responseStatus);
    const exhausted = attemptCount >= MAX_ATTEMPTS;

    if (!retryable || exhausted) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.failed,
          attemptCount,
          responseStatus,
          error: errorMessage ?? `http_${responseStatus}`,
          nextAttemptAt: null,
        },
      });
      this.logger.warn(
        `webhook ${delivery.publicId} gave up after ${attemptCount} attempt(s)`,
      );
      return;
    }

    const delay = RETRY_DELAYS_MS[attemptCount - 1] ?? RETRY_DELAYS_MS.at(-1)!;
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.pending,
        attemptCount,
        responseStatus,
        error: errorMessage ?? `http_${responseStatus}`,
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
  }
}
