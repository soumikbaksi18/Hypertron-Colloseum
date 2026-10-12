import { Module } from '@nestjs/common';

import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [WalletAuthModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}
