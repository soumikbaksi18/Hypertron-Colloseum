import { Controller, Get, UseGuards } from '@nestjs/common';

import type { AgentContext } from '../auth/agent-context';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentAgent } from '../auth/current-agent.decorator';
import { AgentProfileService, AgentProfile } from './agent-profile.service';

/// Lets an operator console render the authority the calling key actually carries.
@Controller('v1/agent')
@UseGuards(ApiKeyGuard)
export class AgentProfileController {
  constructor(private readonly profile: AgentProfileService) {}

  @Get()
  get(@CurrentAgent() agent: AgentContext): Promise<AgentProfile> {
    return this.profile.describe(agent);
  }
}
