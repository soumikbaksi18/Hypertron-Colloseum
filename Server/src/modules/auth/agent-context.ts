export const AGENT_CONTEXT_KEY = 'agentContext';

/// Everything downstream code needs about the caller. An API key maps to exactly
/// one agent, so authenticating the key also establishes the spending authority.
export interface AgentContext {
  agentId: string;
  agentPublicId: string;
  businessId: string;
  apiKeyId: string;
  currency: string;
  perTxLimitMinor: bigint;
  dailyLimitMinor: bigint;
  autoApproveLimitMinor: bigint;
}
