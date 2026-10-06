import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AgentContext } from '../auth/agent-context';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentAgent } from '../auth/current-agent.decorator';
import { ApproveIntentDto } from './dto/approve-intent.dto';
import { CreateIntentDto } from './dto/create-intent.dto';
import { IdempotencyService } from './idempotency.service';
import { IntentResponse } from './intent.mapper';
import { IntentsService } from './intents.service';

@Controller('v1/payment_intents')
@UseGuards(ApiKeyGuard)
export class IntentsController {
  constructor(
    private readonly intents: IntentsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateIntentDto,
    @CurrentAgent() agent: AgentContext,
    @Headers('idempotency-key') rawKey?: string,
  ): Promise<IntentResponse> {
    const key = this.idempotency.validateKey(rawKey);
    const reservation = await this.idempotency.begin<IntentResponse>(
      agent.agentId,
      key,
      dto,
    );
    if (reservation.replayed) {
      return reservation.replayed;
    }

    try {
      const intent = await this.intents.create(dto, agent);
      await this.idempotency.complete(
        agent.agentId,
        key,
        HttpStatus.CREATED,
        intent,
      );
      return intent;
    } catch (error) {
      // Free the key so the agent can retry the same logical request.
      await this.idempotency.release(agent.agentId, key);
      throw error;
    }
  }

  @Get()
  list(
    @CurrentAgent() agent: AgentContext,
    @Query('limit') limit?: string,
  ): Promise<IntentResponse[]> {
    const parsed = Number(limit ?? 20);
    const bounded = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 20;
    return this.intents.list(agent, bounded);
  }

  /// The machine-readable settlement result the agent polls for.
  @Get(':id')
  get(
    @Param('id') id: string,
    @CurrentAgent() agent: AgentContext,
  ): Promise<IntentResponse> {
    return this.intents.get(id, agent);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveIntentDto,
    @CurrentAgent() agent: AgentContext,
  ): Promise<IntentResponse> {
    return this.intents.decide(id, dto, agent);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @CurrentAgent() agent: AgentContext,
  ): Promise<IntentResponse> {
    return this.intents.cancel(id, agent);
  }
}
