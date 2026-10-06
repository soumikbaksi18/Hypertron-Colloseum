import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentBusiness } from '../wallet-auth/current-business.decorator';
import type { BusinessContext } from '../wallet-auth/business-context';
import { WalletSessionGuard } from '../wallet-auth/wallet-session.guard';
import { ConfirmPaymentLinkDto } from './dto/confirm-payment-link.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PreparePaymentLinkDto } from './dto/prepare-payment-link.dto';
import { BroadcastPaymentLinkDto } from './dto/broadcast-payment-link.dto';
import { WithdrawPaymentLinkDto } from './dto/withdraw-payment-link.dto';
import { PaymentLinksService } from './payment-links.service';

@Controller('v1/payment-links')
export class PaymentLinksController {
  constructor(private readonly links: PaymentLinksService) {}

  @Post()
  @UseGuards(WalletSessionGuard)
  create(
    @CurrentBusiness() business: BusinessContext,
    @Body() body: CreatePaymentLinkDto,
  ) {
    return this.links.create(business, body);
  }

  @Get()
  @UseGuards(WalletSessionGuard)
  list(@CurrentBusiness() business: BusinessContext) {
    return this.links.list(business.businessId, business.name);
  }

  @Get(':id')
  getPublic(@Param('id') id: string) {
    return this.links.getPublic(id);
  }

  @Post(':id/prepare-shield')
  prepareShield(@Param('id') id: string, @Body() body: PreparePaymentLinkDto) {
    return this.links.prepareShield(id, body.payer_pubkey);
  }

  @Post(':id/broadcast')
  broadcast(@Param('id') id: string, @Body() body: BroadcastPaymentLinkDto) {
    return this.links.broadcast(id, body);
  }

  @Post(':id/withdraw')
  @UseGuards(WalletSessionGuard)
  withdraw(
    @CurrentBusiness() business: BusinessContext,
    @Param('id') id: string,
    @Body() body: WithdrawPaymentLinkDto,
  ) {
    return this.links.withdraw(business, id, body.destination);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() body: ConfirmPaymentLinkDto) {
    return this.links.confirm(id, body);
  }
}
