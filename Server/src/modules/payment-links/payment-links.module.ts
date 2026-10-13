import { Module } from '@nestjs/common';

import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { SettlementModule } from '../settlement/settlement.module';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksService } from './payment-links.service';

@Module({
  imports: [WalletAuthModule, SettlementModule],
  controllers: [PaymentLinksController],
  providers: [PaymentLinksService],
})
export class PaymentLinksModule {}
