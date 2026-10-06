import { Module } from '@nestjs/common';

import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { DeveloperKeysController } from './developer-keys.controller';
import { DeveloperKeysService } from './developer-keys.service';

@Module({
  imports: [WalletAuthModule],
  controllers: [DeveloperKeysController],
  providers: [DeveloperKeysService],
})
export class DeveloperKeysModule {}
