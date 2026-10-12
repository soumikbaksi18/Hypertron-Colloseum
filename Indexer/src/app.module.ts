import { Module } from '@nestjs/common';

import { HealthModule } from './health/health.module';
import { IngestService } from './ingest.service';
import { PoolController } from './pool.controller';

@Module({
  imports: [HealthModule],
  controllers: [PoolController],
  providers: [IngestService],
})
export class AppModule {}
