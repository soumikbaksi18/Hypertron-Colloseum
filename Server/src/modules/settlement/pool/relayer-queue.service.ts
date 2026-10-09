import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { loadConfig } from '../../../common/config/configuration';

export type RelayerJob = () => Promise<string>;

type Queued = {
  run: RelayerJob;
  resolve: (signature: string) => void;
  reject: (error: unknown) => void;
};

@Injectable()
export class RelayerQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(RelayerQueueService.name);
  private readonly queue: Queued[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private flushing = false;

  enqueue(run: RelayerJob): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ run, resolve, reject });
      this.logger.log(`queued relayer job n=${this.queue.length}`);
      const cfg = loadConfig().pool;
      if (this.queue.length >= cfg.relayBatchSize) {
        void this.flush();
        return;
      }
      if (!this.timer) {
        this.timer = setTimeout(() => void this.flush(), cfg.relayIntervalMs);
      }
    });
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, loadConfig().pool.relayBatchSize);
    try {
      for (const job of batch) {
        try {
          const signature = await job.run();
          job.resolve(signature);
        } catch (error) {
          job.reject(error);
        }
      }
    } finally {
      this.flushing = false;
      if (this.queue.length > 0 && !this.timer) {
        this.timer = setTimeout(
          () => void this.flush(),
          loadConfig().pool.relayIntervalMs,
        );
      }
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
    void this.flush();
  }
}
