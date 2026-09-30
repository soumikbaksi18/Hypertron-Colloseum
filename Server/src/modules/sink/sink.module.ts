import { Module } from '@nestjs/common';

import { SinkController } from './sink.controller';
import { SinkService } from './sink.service';

@Module({
  controllers: [SinkController],
  providers: [SinkService],
})
export class SinkModule {}
