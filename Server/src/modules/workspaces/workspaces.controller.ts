import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentBusiness } from '../wallet-auth/current-business.decorator';
import type { BusinessContext } from '../wallet-auth/business-context';
import { SESSION_COOKIE } from '../wallet-auth/wallet-session.service';
import { WalletSessionGuard } from '../wallet-auth/wallet-session.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('v1/workspaces')
@UseGuards(WalletSessionGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentBusiness() business: BusinessContext) {
    return this.workspaces.list(business.walletPubkey);
  }

  @Post()
  create(
    @CurrentBusiness() business: BusinessContext,
    @Body() body: CreateWorkspaceDto,
    @Req() request: Request,
  ) {
    return this.workspaces.create(
      business.walletPubkey,
      request.cookies?.[SESSION_COOKIE],
      body,
    );
  }

  @Post(':id/activate')
  activate(
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    return this.workspaces.activate(
      business.walletPubkey,
      request.cookies?.[SESSION_COOKIE],
      id,
    );
  }
}
