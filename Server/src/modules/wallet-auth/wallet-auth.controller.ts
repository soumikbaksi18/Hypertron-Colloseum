import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { ChallengeDto } from './dto/challenge.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyDto } from './dto/verify.dto';
import { CurrentBusiness } from './current-business.decorator';
import type { BusinessContext } from './business-context';
import { WalletSessionGuard } from './wallet-session.guard';
import { SESSION_COOKIE, WalletSessionService } from './wallet-session.service';

@Controller('v1/auth')
export class WalletAuthController {
  constructor(private readonly sessions: WalletSessionService) {}

  @Post('challenge')
  challenge(@Body() body: ChallengeDto) {
    return this.sessions.issueChallenge(body.publicKey);
  }

  @Post('verify')
  async verify(
    @Body() body: VerifyDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, business } = await this.sessions.verify(
      body.publicKey,
      body.challengeId,
      body.signature,
    );

    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: this.sessions.cookieMaxAge(),
    });

    return { auth: 'wallet', ...this.mePayload(business) };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revoke(request.cookies?.[SESSION_COOKIE]);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(WalletSessionGuard)
  me(@CurrentBusiness() business: BusinessContext) {
    return { auth: 'wallet', ...this.mePayload(business) };
  }

  @Patch('me')
  @UseGuards(WalletSessionGuard)
  async updateMe(
    @CurrentBusiness() business: BusinessContext,
    @Body() body: UpdateMeDto,
  ) {
    const next = await this.sessions.updateMe(business.businessId, body);
    return { auth: 'wallet', ...this.mePayload(next) };
  }

  private mePayload(business: BusinessContext) {
    return {
      business_id: business.businessId,
      name: business.name,
      wallet_address: business.walletPubkey,
      payout_address: business.payoutAddress,
    };
  }
}
