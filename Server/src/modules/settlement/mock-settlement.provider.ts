import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';

import { loadConfig } from '../../common/config/configuration';
import {
  PrivateSettlementProvider,
  SettleInput,
  SettlementResult,
} from './settlement.types';

/// Stands in for the shielded pool until the Anchor program lands. It produces
/// the same *shape* of result — opaque handles plus a viewing-key hint — so the
/// agent-facing contract is already final.
@Injectable()
export class MockSettlementProvider implements PrivateSettlementProvider {
  readonly name = 'mock';

  private readonly logger = new Logger(MockSettlementProvider.name);
  private readonly latencyMs = loadConfig().settlementLatencyMs;

  async settle(input: SettleInput): Promise<SettlementResult> {
    // A real proof takes seconds to generate; keep the async lifecycle honest.
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

    const commitment = this.field('commitment', input);
    const nullifier = this.field('nullifier', input);

    this.logger.log(
      `settled ${input.intentPublicId} privately (${input.amountMinor} ${input.currency} minor units)`,
    );

    return {
      settlementId: `set_${crypto.randomBytes(12).toString('hex')}`,
      commitment,
      nullifier,
      txSignature: crypto.randomBytes(32).toString('base64url'),
      viewKeyHint: crypto
        .createHash('sha256')
        .update(`${input.viewPub ?? 'no-view-key'}:${commitment}`)
        .digest('hex')
        .slice(0, 32),
    };
  }

  private field(domain: string, input: SettleInput): string {
    return `0x${crypto
      .createHash('sha256')
      .update(`hypertron:${domain}:${input.intentPublicId}:${crypto.randomUUID()}`)
      .digest('hex')}`;
  }
}
