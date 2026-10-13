import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentBusiness } from '../wallet-auth/current-business.decorator';
import type { BusinessContext } from '../wallet-auth/business-context';
import { WalletSessionGuard } from '../wallet-auth/wallet-session.guard';
import { DeveloperKeysService } from './developer-keys.service';

@Controller('v1/developer/keys')
@UseGuards(WalletSessionGuard)
export class DeveloperKeysController {
  constructor(private readonly keys: DeveloperKeysService) {}

  @Get()
  list(@CurrentBusiness() business: BusinessContext) {
    return this.keys.list(business.businessId);
  }

  @Post()
  create(@CurrentBusiness() business: BusinessContext) {
    return this.keys.create(business);
  }

  @Delete(':id')
  revoke(
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
  ) {
    return this.keys.revoke(business.businessId, id);
  }
}
