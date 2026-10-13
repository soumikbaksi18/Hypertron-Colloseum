//! Hypertron shielded pool — one Anchor program, five protocol modules.
//!
//! | Module        | Stellar contract           | Job |
//! |---------------|----------------------------|-----|
//! | `commitment`  | `hypertron-commitment`     | Poseidon Merkle tree of note commitments |
//! | `nullifier`   | `hypertron-nullifier`      | Spent-nullifier PDAs |
//! | `verifier`    | `hypertron-verifier`       | Groth16 VK storage + BN254 verify |
//! | `transfer`    | `hypertron-transfer`       | deposit / transfer / withdraw |
//! | `compliance`  | `hypertron-compliance`     | optional allow/deny list |

use anchor_lang::prelude::*;

pub mod commitment;
pub mod compliance;
pub mod error;
pub mod nullifier;
pub mod poseidon;
pub mod state;
pub mod transfer;
pub mod verifier;

pub use commitment::DEPTH;
pub use compliance::{InitializeCompliance, SetListing};
pub use error::PoolError;
pub use transfer::{
    Deposit, Initialize, PoolTransfer, RegisterMerchantTreasury, SetTransferVk, TransferOne,
    Withdraw,
};
pub use verifier::{RegisterVk, MAX_IC};

// Anchor's #[program] re-exports client account structs from the crate root.
pub(crate) use compliance::{
    __client_accounts_initialize_compliance, __client_accounts_set_listing,
};
pub(crate) use transfer::{
    __client_accounts_deposit, __client_accounts_initialize, __client_accounts_pool_transfer,
    __client_accounts_register_merchant_treasury, __client_accounts_set_transfer_vk,
    __client_accounts_transfer_one, __client_accounts_withdraw,
};
pub(crate) use verifier::__client_accounts_register_vk;

declare_id!("9HQsgGDHgYw3N8PGnh9EWrUGRHgmp7tmdGaxuBHHA335");

pub const PROOF_LEN: usize = 256;

/// Native ZK ElGamal Proof Program (Token-2022 confidential amounts).
/// Not Hypertron's Groth16 verifier. Do not prove ElGamal inside the pool circuit.
pub const ZK_ELGAMAL_PROOF_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0, 37, 6, 113, 83, 91, 74, 216, 175, 159, 252, 91, 126, 231, 255, 218, 156, 133, 129, 96, 13,
    116, 203, 36, 219, 244, 55, 237, 208, 0, 0, 0,
]);

#[program]
pub mod hypertron_pool {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        deposit_vk_id: u32,
        unshield_vk_id: u32,
        transfer_vk_id: u32,
    ) -> Result<()> {
        transfer::initialize(ctx, deposit_vk_id, unshield_vk_id, transfer_vk_id)
    }

    pub fn set_transfer_vk(ctx: Context<SetTransferVk>, transfer_vk_id: u32) -> Result<()> {
        transfer::set_transfer_vk(ctx, transfer_vk_id)
    }

    pub fn register_vk(
        ctx: Context<RegisterVk>,
        vk_id: u32,
        nr_pubinputs: u32,
        alpha: [u8; 64],
        beta: [u8; 128],
        gamma: [u8; 128],
        delta: [u8; 128],
        ic_len: u8,
        ic: [[u8; 64]; MAX_IC],
    ) -> Result<()> {
        verifier::register_vk(ctx, vk_id, nr_pubinputs, alpha, beta, gamma, delta, ic_len, ic)
    }

    pub fn initialize_compliance(
        ctx: Context<InitializeCompliance>,
        default_allow: bool,
    ) -> Result<()> {
        compliance::initialize_compliance(ctx, default_allow)
    }

    pub fn set_listing(
        ctx: Context<SetListing>,
        subject: Pubkey,
        allowed: bool,
    ) -> Result<()> {
        compliance::set_listing(ctx, subject, allowed)
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        commitment: [u8; 32],
        proof: [u8; PROOF_LEN],
        encrypted_blob: Vec<u8>,
    ) -> Result<()> {
        transfer::deposit(ctx, amount, commitment, proof, encrypted_blob)
    }

    pub fn transfer(
        ctx: Context<PoolTransfer>,
        root: [u8; 32],
        nullifier_1: [u8; 32],
        nullifier_2: [u8; 32],
        out_cm1: [u8; 32],
        out_cm2: [u8; 32],
        proof: [u8; PROOF_LEN],
        note_1: Vec<u8>,
        note_2: Vec<u8>,
    ) -> Result<()> {
        transfer::transfer(
            ctx,
            root,
            nullifier_1,
            nullifier_2,
            out_cm1,
            out_cm2,
            proof,
            note_1,
            note_2,
        )
    }

    /// 1-in / 2-out private transfer (spend one note, pay + change).
    /// Verifies against the registered transfer-one VK (id 5), not PoolState.transfer_vk.
    pub fn transfer_one(
        ctx: Context<TransferOne>,
        root: [u8; 32],
        nullifier: [u8; 32],
        out_cm1: [u8; 32],
        out_cm2: [u8; 32],
        proof: [u8; PROOF_LEN],
        note_1: Vec<u8>,
        note_2: Vec<u8>,
    ) -> Result<()> {
        transfer::transfer_one(ctx, root, nullifier, out_cm1, out_cm2, proof, note_1, note_2)
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
        root: [u8; 32],
        nullifier: [u8; 32],
        amount: u64,
        change_cm: [u8; 32],
        proof: [u8; PROOF_LEN],
    ) -> Result<()> {
        transfer::withdraw(ctx, root, nullifier, amount, change_cm, proof)
    }

    pub fn register_merchant_treasury(
        ctx: Context<RegisterMerchantTreasury>,
        confidential: bool,
    ) -> Result<()> {
        transfer::register_merchant_treasury(ctx, confidential)
    }
}
