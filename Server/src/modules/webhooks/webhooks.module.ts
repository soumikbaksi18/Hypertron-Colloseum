import { Global, Module } from '@nestjs/common';

import { WebhookDeliveryService } from './webhook-delivery.service';

@Global()
@Module({
  providers: [WebhookDeliveryService],
  exports: [WebhookDeliveryService],
})
export class WebhooksModule {}
