export const BUSINESS_CONTEXT_KEY = 'businessContext';

export interface BusinessContext {
  businessId: string;
  walletPubkey: string;
  name: string;
  payoutAddress: string | null;
  setupComplete: boolean;
}
