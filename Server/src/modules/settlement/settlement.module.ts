import { Module } from '@nestjs/common';

import { loadConfig } from '../../common/config/configuration';
import { MockSettlementProvider } from './mock-settlement.provider';
import { PoolClient } from './pool/pool.client';
import { PoolProver } from './pool/pool.prover';
import { PoolTreeService } from './pool/pool-tree.service';
import { RelayerQueueService } from './pool/relayer-queue.service';
import { SolanaPoolSettlementProvider } from './solana-pool.provider';
import { PoolHttpController } from './pool/pool-http.controller';
import { PRIVATE_SETTLEMENT_PROVIDER } from './settlement.types';
import type { PrivateSettlementProvider } from './settlement.types';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';

@Module({
  imports: [WalletAuthModule],
  providers: [
    MockSettlementProvider,
    PoolClient,
    PoolProver,
    PoolTreeService,
    RelayerQueueService,
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
  controllers: [PoolHttpController],
  exports: [
    PRIVATE_SETTLEMENT_PROVIDER,
    SolanaPoolSettlementProvider,
    PoolClient,
    PoolProver,
  ],
})
export class SettlementModule {}
