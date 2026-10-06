import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { SinkService } from './sink.service';

/// A local stand-in for the business's accounting system, so the demo can show
/// the reconciliation leg actually arriving and its signature verifying.
/// Not part of the product surface.
@Controller('dev/webhook-sink')
export class SinkController {
  constructor(private readonly sink: SinkService) {}

  @Post()
  receive(
    @Body() body: unknown,
    @Headers('hypertron-signature') signature?: string,
  ) {
    return this.sink.record(body, signature);
  }

  @Get()
  list() {
    return this.sink.list();
  }
}
