import { Module } from '@nestjs/common';

import { loadConfig } from '../../common/config/configuration';
import { MockSettlementProvider } from './mock-settlement.provider';
import { PoolClient } from './pool/pool.client';
import { PoolProver } from './pool/pool.prover';
import { PoolTreeService } from './pool/pool-tree.service';
import { SolanaPoolSettlementProvider } from './solana-pool.provider';
import { PRIVATE_SETTLEMENT_PROVIDER } from './settlement.types';
import type { PrivateSettlementProvider } from './settlement.types';

@Module({
  providers: [
    MockSettlementProvider,
    PoolClient,
    PoolProver,
    PoolTreeService,
    SolanaPoolSettlementProvider,
    {
      provide: PRIVATE_SETTLEMENT_PROVIDER,
      useFactory: (
        mock: MockSettlementProvider,
        pool: SolanaPoolSettlementProvider,
      ): PrivateSettlementProvider =>
        loadConfig().settlementProvider === 'pool' ? pool : mock,
      inject: [MockSettlementProvider, SolanaPoolSettlementProvider],
    },
  ],
  exports: [
    PRIVATE_SETTLEMENT_PROVIDER,
    SolanaPoolSettlementProvider,
    PoolClient,
  ],
})
export class SettlementModule {}
