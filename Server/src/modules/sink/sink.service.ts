import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface ReceivedWebhook {
  received_at: string;
  type: string;
  event_id: string;
  signature_valid: boolean;
  intent: { id?: string; status?: string; reference?: string | null } | null;
}

@Injectable()
export class SinkService {
  private readonly logger = new Logger(SinkService.name);
  private readonly received: ReceivedWebhook[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async record(body: unknown, signature?: string): Promise<{ ok: true }> {
    const event = body as {
      id?: string;
      type?: string;
      data?: { id?: string; status?: string; reference?: string | null };
    };

    const valid = await this.verify(body, signature);

    this.received.unshift({
      received_at: new Date().toISOString(),
      type: event.type ?? 'unknown',
      event_id: event.id ?? 'unknown',
      signature_valid: valid,
      intent: event.data
        ? {
            id: event.data.id,
            status: event.data.status,
            reference: event.data.reference ?? null,
          }
        : null,
    });
    this.received.length = Math.min(this.received.length, 50);

    this.logger.log(
      `sink received ${event.type ?? 'unknown'} (signature ${valid ? 'ok' : 'INVALID'})`,
    );
    return { ok: true };
  }

  list(): { count: number; events: ReceivedWebhook[] } {
    return { count: this.received.length, events: this.received };
  }

  /// Mirrors what a real integrator does: recompute the HMAC over
  /// `<timestamp>.<raw body>` and compare in constant time.
  private async verify(body: unknown, signature?: string): Promise<boolean> {
    if (!signature) {
      return false;
    }

    const parts = new Map(
      signature.split(',').map((piece) => {
        const [key, value] = piece.split('=');
        return [key?.trim(), value?.trim()] as [string, string];
      }),
    );
    const timestamp = parts.get('t');
    const provided = parts.get('v1');
    if (!timestamp || !provided) {
      return false;
    }

    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { active: true },
      select: { signingSecret: true },
    });

    const payload = `${timestamp}.${JSON.stringify(body)}`;
    return endpoints.some((endpoint) => {
      const expected = crypto
        .createHmac('sha256', Buffer.from(endpoint.signingSecret, 'hex'))
        .update(payload, 'utf8')
        .digest('hex');
      return (
        expected.length === provided.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
      );
    });
  }
}
