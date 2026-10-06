import { Injectable } from '@nestjs/common';

import { loadConfig } from './common/config/configuration';

@Injectable()
export class AppService {
  getStatus() {
    const cfg = loadConfig();
    return {
      service: 'hypertron-server',
      status: 'ok',
      description:
        'Programmable private financial layer for businesses and autonomous agents.',
      settlement: cfg.settlementProvider,
      pool_rpc: cfg.pool.rpcUrl,
      pool_mint: cfg.pool.mint || null,
      flow: [
        'agent',
        'payment_intent',
        'policy_authorization',
        'private_settlement',
        'reconciliation',
      ],
    };
  }
}
