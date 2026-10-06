import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PolicyModule } from '../policy/policy.module';
import { AgentProfileController } from './agent-profile.controller';
import { AgentProfileService } from './agent-profile.service';

@Module({
  imports: [AuthModule, PolicyModule],
  controllers: [AgentProfileController],
  providers: [AgentProfileService],
})
export class AgentProfileModule {}
