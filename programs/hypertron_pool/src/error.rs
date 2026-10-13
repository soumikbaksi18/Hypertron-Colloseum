use anchor_lang::prelude::*;

#[error_code]
pub enum PoolError {
    #[msg("verification key is malformed")]
    InvalidVk,
    #[msg("Groth16 verification failed")]
    ProofFailed,
    #[msg("Merkle root is not in the recent-root ring")]
    UnknownRoot,
    #[msg("amount must be positive")]
    ZeroAmount,
    #[msg("treasury mint does not match the pool")]
    MintMismatch,
    #[msg("Poseidon hash failed")]
    Poseidon,
    #[msg("public input count does not match the verifying key")]
    PublicInputCount,
    #[msg("address is not allowed by the compliance policy")]
    RecipientNotAllowed,
    #[msg("compliance policy is not attached to this pool")]
    ComplianceNotConfigured,
    #[msg("compliance policy is already attached")]
    ComplianceAlreadySet,
    #[msg("compliance listing PDA does not match the subject")]
    BadListing,
}
