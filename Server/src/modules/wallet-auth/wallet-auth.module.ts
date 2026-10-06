import { Module } from '@nestjs/common';

import { WalletAuthController } from './wallet-auth.controller';
import { WalletSessionGuard } from './wallet-session.guard';
import { WalletSessionService } from './wallet-session.service';

@Module({
  controllers: [WalletAuthController],
  providers: [WalletSessionService, WalletSessionGuard],
  exports: [WalletSessionService, WalletSessionGuard],
})
export class WalletAuthModule {}
