import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { AGENT_CONTEXT_KEY, AgentContext } from './agent-context';

export const CurrentAgent = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AgentContext => {
    const request = context.switchToHttp().getRequest<Request>();
    return Reflect.get(request, AGENT_CONTEXT_KEY) as AgentContext;
  },
);
