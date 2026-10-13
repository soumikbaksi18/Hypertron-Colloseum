//! On-chain Groth16 verifier (Stellar `hypertron-verifier`).
//!
//! Verifying keys live in PDAs and are referenced by id. Verification uses
//! Light Protocol `groth16-solana` (BN254 alt_bn128 syscalls).

use crate::error::PoolError;
use crate::PROOF_LEN;
use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

pub const MAX_IC: usize = 8;

#[account]
pub struct VerifyingKeyAccount {
    pub authority: Pubkey,
    pub vk_id: u32,
    pub nr_pubinputs: u32,
    pub alpha: [u8; 64],
    pub beta: [u8; 128],
    pub gamma: [u8; 128],
    pub delta: [u8; 128],
    pub ic_len: u8,
    pub ic: [[u8; 64]; MAX_IC],
    pub bump: u8,
}

impl VerifyingKeyAccount {
    pub const SIZE: usize = 32 + 4 + 4 + 64 + 128 * 3 + 1 + 64 * MAX_IC + 1;
}

#[derive(Accounts)]
#[instruction(vk_id: u32)]
pub struct RegisterVk<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + VerifyingKeyAccount::SIZE,
        seeds = [b"vk", admin.key().as_ref(), &vk_id.to_le_bytes()],
        bump
    )]
    pub vk: Box<Account<'info, VerifyingKeyAccount>>,
    pub system_program: Program<'info, System>,
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
    require!(ic_len as usize <= MAX_IC, PoolError::InvalidVk);
    require!(
        ic_len as u32 == nr_pubinputs.saturating_add(1),
        PoolError::InvalidVk
    );
    let acc = &mut ctx.accounts.vk;
    acc.vk_id = vk_id;
    acc.nr_pubinputs = nr_pubinputs;
    acc.alpha = alpha;
    acc.beta = beta;
    acc.gamma = gamma;
    acc.delta = delta;
    acc.ic_len = ic_len;
    acc.ic = ic;
    acc.authority = ctx.accounts.admin.key();
    acc.bump = ctx.bumps.vk;
    emit!(VkRegistered { vk_id });
    Ok(())
}

#[event]
pub struct VkRegistered {
    pub vk_id: u32,
}

pub fn verify(
    acc: &VerifyingKeyAccount,
    proof: &[u8; PROOF_LEN],
    inputs: &[[u8; 32]],
) -> Result<()> {
    require!(
        inputs.len() == acc.nr_pubinputs as usize,
        PoolError::PublicInputCount
    );
    let proof_a: [u8; 64] = proof[0..64].try_into().unwrap();
    let proof_b: [u8; 128] = proof[64..192].try_into().unwrap();
    let proof_c: [u8; 64] = proof[192..256].try_into().unwrap();
    let ic_len = acc.ic_len as usize;
    let ic = &acc.ic[..ic_len];
    let vk = Groth16Verifyingkey {
        nr_pubinputs: acc.nr_pubinputs as usize,
        vk_alpha_g1: acc.alpha,
        vk_beta_g2: acc.beta,
        vk_gamme_g2: acc.gamma,
        vk_delta_g2: acc.delta,
        vk_ic: ic,
    };
    match inputs.len() {
        2 => verify_n::<2>(&proof_a, &proof_b, &proof_c, inputs, &vk)?,
        4 => verify_n::<4>(&proof_a, &proof_b, &proof_c, inputs, &vk)?,
        5 => verify_n::<5>(&proof_a, &proof_b, &proof_c, inputs, &vk)?,
        _ => return err!(PoolError::PublicInputCount),
    }
    Ok(())
}

fn verify_n<const N: usize>(
    a: &[u8; 64],
    b: &[u8; 128],
    c: &[u8; 64],
    inputs: &[[u8; 32]],
    vk: &Groth16Verifyingkey,
) -> Result<()> {
    let mut arr = [[0u8; 32]; N];
    arr.copy_from_slice(inputs);
    let mut verifier =
        Groth16Verifier::<N>::new(a, b, c, &arr, vk).map_err(|_| PoolError::ProofFailed)?;
    verifier.verify().map_err(|_| PoolError::ProofFailed)?;
    Ok(())
}
