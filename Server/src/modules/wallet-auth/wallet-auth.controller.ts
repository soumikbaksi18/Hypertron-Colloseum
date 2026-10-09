import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ChallengeDto } from './dto/challenge.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyDto } from './dto/verify.dto';
import { CurrentBusiness } from './current-business.decorator';
import type { BusinessContext } from './business-context';
import { WalletSessionGuard } from './wallet-session.guard';
import { loadConfig } from '../../common/config/configuration';
import { SESSION_COOKIE, WalletSessionService } from './wallet-session.service';

function sessionCookieOptions() {
  const cookie = loadConfig().cookie;
  return {
    httpOnly: true as const,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: '/',
    ...(cookie.domain ? { domain: cookie.domain } : {}),
  };
}

@Controller('v1/auth')
export class WalletAuthController {
  constructor(private readonly sessions: WalletSessionService) {}

  @Post('challenge')
  challenge(@Body() body: ChallengeDto, @Req() request: Request) {
    const origin = request.headers.origin;
    return this.sessions.issueChallenge({
      publicKey: body.publicKey,
      domain: body.domain,
      uri: body.uri,
      originHeader: Array.isArray(origin) ? origin[0] : origin,
    });
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
      body.signedMessage,
    );

    response.cookie(SESSION_COOKIE, token, {
      ...sessionCookieOptions(),
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
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
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
      handle: business.handle,
      wallet_address: business.walletPubkey,
      payout_address: business.payoutAddress,
      view_pub: business.viewPub,
      owner_pk: business.ownerPk,
    };
  }
}

@Controller('v1/ids')
export class HypertronIdsController {
  constructor(private readonly sessions: WalletSessionService) {}

  @Get(':handle')
  lookup(@Param('handle') handle: string) {
    return this.sessions.lookupHandle(handle);
  }
}
