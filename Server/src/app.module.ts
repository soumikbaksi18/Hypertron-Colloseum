import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HypertronExceptionFilter } from './common/filters/hypertron-exception.filter';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AgentProfileModule } from './modules/agent-profile/agent-profile.module';
import { AuthModule } from './modules/auth/auth.module';
import { IntentsModule } from './modules/intents/intents.module';
import { PolicyModule } from './modules/policy/policy.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { SinkModule } from './modules/sink/sink.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WalletAuthModule } from './modules/wallet-auth/wallet-auth.module';
import { PaymentLinksModule } from './modules/payment-links/payment-links.module';
import { DeveloperKeysModule } from './modules/developer-keys/developer-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WebhooksModule,
    AuthModule,
    PolicyModule,
    SettlementModule,
    IntentsModule,
    AgentProfileModule,
    SinkModule,
    WalletAuthModule,
    PaymentLinksModule,
    DeveloperKeysModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HypertronExceptionFilter },
  ],
})
export class AppModule {}
