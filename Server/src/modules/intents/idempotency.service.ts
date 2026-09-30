import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  IdempotencyConflictException,
  InvalidRequestException,
} from '../../common/exceptions/hypertron.exception';
import { hashRequestBody } from '../../common/utils/crypto.util';

const TTL_MS = 24 * 60 * 60 * 1000;
const IN_FLIGHT = 0;

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  validateKey(raw: string | undefined): string | null {
    if (raw === undefined) {
      return null;
    }
    const key = raw.trim();
    if (key.length === 0 || key.length > 255) {
      throw new InvalidRequestException(
        'invalid_idempotency_key',
        'Idempotency-Key must be between 1 and 255 characters.',
      );
    }
    return key;
  }

  /// Reserves the key, or returns the stored response for a replayed request.
  async begin<T>(
    agentId: string,
    key: string | null,
    payload: unknown,
  ): Promise<{ replayed: T } | { replayed: null }> {
    if (!key) {
      return { replayed: null };
    }

    const requestHash = hashRequestBody(payload);
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { agentId_key: { agentId, key } },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new IdempotencyConflictException(
          'idempotency_key_reused',
          'This Idempotency-Key was already used with a different request body.',
        );
      }
      if (existing.responseStatus === IN_FLIGHT) {
        throw new IdempotencyConflictException(
          'idempotency_key_in_flight',
          'A request with this Idempotency-Key is still in progress.',
        );
      }
      return { replayed: existing.responseBody as T };
    }

    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          agentId,
          key,
          requestHash,
          responseStatus: IN_FLIGHT,
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
    } catch {
      throw new IdempotencyConflictException(
        'idempotency_key_in_flight',
        'A request with this Idempotency-Key is still in progress.',
      );
    }

    return { replayed: null };
  }

  async complete(
    agentId: string,
    key: string | null,
    status: number,
    body: unknown,
  ): Promise<void> {
    if (!key) {
      return;
    }
    await this.prisma.idempotencyRecord.update({
      where: { agentId_key: { agentId, key } },
      data: { responseStatus: status, responseBody: body as object },
    });
  }

  /// Releases the reservation so a failed call can be retried with the same key.
  async release(agentId: string, key: string | null): Promise<void> {
    if (!key) {
      return;
    }
    await this.prisma.idempotencyRecord
      .delete({ where: { agentId_key: { agentId, key } } })
      .catch(() => undefined);
  }
}
