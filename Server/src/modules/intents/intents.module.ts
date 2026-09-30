import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PolicyModule } from '../policy/policy.module';
import { SettlementModule } from '../settlement/settlement.module';
import { IdempotencyService } from './idempotency.service';
import { IntentEventsService } from './intent-events.service';
import { IntentStateMachine } from './intent-state-machine';
import { IntentsController } from './intents.controller';
import { IntentsService } from './intents.service';

@Module({
  imports: [AuthModule, PolicyModule, SettlementModule],
  controllers: [IntentsController],
  providers: [
    IntentsService,
    IntentStateMachine,
    IntentEventsService,
    IdempotencyService,
  ],
})
export class IntentsModule {}
