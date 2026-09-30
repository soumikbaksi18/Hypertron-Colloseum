import { Module } from '@nestjs/common';

import { MockSettlementProvider } from './mock-settlement.provider';
import { PRIVATE_SETTLEMENT_PROVIDER } from './settlement.types';

@Module({
  providers: [
    MockSettlementProvider,
    {
      provide: PRIVATE_SETTLEMENT_PROVIDER,
      useExisting: MockSettlementProvider,
    },
  ],
  exports: [PRIVATE_SETTLEMENT_PROVIDER],
})
export class SettlementModule {}
