export const BUSINESS_CONTEXT_KEY = 'businessContext';

export interface BusinessContext {
  businessId: string;
  walletPubkey: string;
  name: string;
  handle: string | null;
  payoutAddress: string | null;
  viewPub: string | null;
  ownerPk: string | null;
}
