import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { AuthenticationException } from '../../common/exceptions/hypertron.exception';
import { BUSINESS_CONTEXT_KEY } from './business-context';
import { SESSION_COOKIE, WalletSessionService } from './wallet-session.service';

@Injectable()
export class WalletSessionGuard implements CanActivate {
  constructor(private readonly sessions: WalletSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    const business = await this.sessions.resolve(token);
    if (!business) {
      throw new AuthenticationException(
        'Sign in with Phantom to continue.',
        'not_signed_in',
      );
    }
    Reflect.set(request, BUSINESS_CONTEXT_KEY, business);
    return true;
  }
}
