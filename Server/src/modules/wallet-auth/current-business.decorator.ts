import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { BusinessContext } from './business-context';
import { BUSINESS_CONTEXT_KEY } from './business-context';

export const CurrentBusiness = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BusinessContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return Reflect.get(request, BUSINESS_CONTEXT_KEY) as BusinessContext;
  },
);
