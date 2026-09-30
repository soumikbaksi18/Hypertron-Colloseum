import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { AuthenticationException } from '../../common/exceptions/hypertron.exception';
import { AGENT_CONTEXT_KEY } from './agent-context';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new AuthenticationException(
        'Missing API key. Send "Authorization: Bearer ht_sk_...".',
      );
    }

    const agent = await this.apiKeys.resolve(header.slice('Bearer '.length).trim());
    if (!agent) {
      throw new AuthenticationException();
    }

    Reflect.set(request, AGENT_CONTEXT_KEY, agent);
    return true;
  }
}
