import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'hypertron-server',
      status: 'ok',
      description:
        'Programmable private financial layer for businesses and autonomous agents.',
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
