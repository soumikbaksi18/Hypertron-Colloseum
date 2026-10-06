//! Shielded pool composition (Stellar `hypertron-transfer`).
//!
//! Deposit / private transfer / withdraw, using commitment, nullifier,
//! verifier, and optional compliance as modules.

use crate::commitment::{self, MerkleTree};
use crate::compliance::{self, CompliancePolicy};
use crate::error::PoolError;
use crate::nullifier::NullifierMarker;
use crate::state::{self, PoolState};
use crate::verifier::VerifyingKeyAccount;
use crate::PROOF_LEN;
use crate::ZK_ELGAMAL_PROOF_PROGRAM_ID;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = admin,
        space = 8 + PoolState::SIZE,
        seeds = [b"pool", mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, PoolState>,
    /// CHECK: PDA authority of the vault ATA.
    #[account(seeds = [b"vault", mint.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = admin,
        space = 8 + MerkleTree::SIZE,
        seeds = [b"merkle", mint.key().as_ref()],
        bump
    )]
    pub merkle_tree: Account<'info, MerkleTree>,
    pub deposit_vk: Account<'info, VerifyingKeyAccount>,
    pub unshield_vk: Account<'info, VerifyingKeyAccount>,
    pub transfer_vk: Account<'info, VerifyingKeyAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut, has_one = mint, has_one = vault, has_one = deposit_vk)]
    pub pool: Account<'info, PoolState>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [b"merkle", pool.mint.as_ref()], bump = pool.tree_bump)]
    pub merkle_tree: Account<'info, MerkleTree>,
    pub deposit_vk: Account<'info, VerifyingKeyAccount>,
    #[account(mut, token::mint = mint, token::authority = depositor)]
    pub depositor_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub policy: Option<Account<'info, CompliancePolicy>>,
    /// CHECK: listing PDA for the depositor; omit (program id) if no policy.
    pub listing: Option<UncheckedAccount<'info>>,
}

#[derive(Accounts)]
#[instruction(root: [u8; 32], nullifier_1: [u8; 32], nullifier_2: [u8; 32])]
pub struct PoolTransfer<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut, has_one = transfer_vk)]
    pub pool: Account<'info, PoolState>,
    #[account(mut, seeds = [b"merkle", pool.mint.as_ref()], bump = pool.tree_bump)]
    pub merkle_tree: Account<'info, MerkleTree>,
    pub transfer_vk: Account<'info, VerifyingKeyAccount>,
    #[account(
        init,
        payer = fee_payer,
        space = 8,
        seeds = [b"nullifier", nullifier_1.as_ref()],
        bump
    )]
    pub nullifier_pda_1: Account<'info, NullifierMarker>,
    #[account(
        init,
        payer = fee_payer,
        space = 8,
        seeds = [b"nullifier", nullifier_2.as_ref()],
        bump
    )]
    pub nullifier_pda_2: Account<'info, NullifierMarker>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(root: [u8; 32], nullifier: [u8; 32])]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    #[account(mut, has_one = mint, has_one = vault, has_one = unshield_vk)]
    pub pool: Account<'info, PoolState>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, seeds = [b"merkle", pool.mint.as_ref()], bump = pool.tree_bump)]
    pub merkle_tree: Account<'info, MerkleTree>,
    pub unshield_vk: Account<'info, VerifyingKeyAccount>,
    /// CHECK: PDA derived in seeds; signs the Token-2022 transfer out.
    #[account(seeds = [b"vault", pool.mint.as_ref()], bump = pool.vault_bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: payout destination; bound into the Groth16 public inputs.
    pub recipient: UncheckedAccount<'info>,
    #[account(mut, token::mint = mint, token::authority = recipient)]
    pub recipient_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = fee_payer,
        space = 8,
        seeds = [b"nullifier", nullifier.as_ref()],
        bump
    )]
    pub nullifier_pda: Account<'info, NullifierMarker>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub policy: Option<Account<'info, CompliancePolicy>>,
    /// CHECK: listing PDA for the recipient; omit (program id) if no policy.
    pub listing: Option<UncheckedAccount<'info>>,
}

#[derive(Accounts)]
pub struct RegisterMerchantTreasury<'info> {
    pub owner: Signer<'info>,
    pub pool: Account<'info, PoolState>,
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        space = 8 + MerchantTreasury::SIZE,
        seeds = [b"merchant", pool.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, MerchantTreasury>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MerchantTreasury {
    pub merchant: Pubkey,
    pub treasury: Pubkey,
    pub confidential: bool,
    pub zk_elgamal_proof_program: Pubkey,
    pub bump: u8,
}

impl MerchantTreasury {
    pub const SIZE: usize = 32 + 32 + 1 + 32 + 1;
}

pub fn initialize(
    ctx: Context<Initialize>,
    deposit_vk_id: u32,
    unshield_vk_id: u32,
    transfer_vk_id: u32,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.admin = ctx.accounts.admin.key();
    pool.mint = ctx.accounts.mint.key();
    pool.vault = ctx.accounts.vault.key();
    pool.token_program = ctx.accounts.token_program.key();
    pool.decimals = ctx.accounts.mint.decimals;
    pool.compliance = Pubkey::default();
    require_keys_eq!(ctx.accounts.deposit_vk.authority, ctx.accounts.admin.key());
    require_keys_eq!(ctx.accounts.unshield_vk.authority, ctx.accounts.admin.key());
    require_keys_eq!(ctx.accounts.transfer_vk.authority, ctx.accounts.admin.key());
    require_eq!(
        ctx.accounts.deposit_vk.vk_id,
        deposit_vk_id,
        PoolError::InvalidVk
    );
    require_eq!(
        ctx.accounts.unshield_vk.vk_id,
        unshield_vk_id,
        PoolError::InvalidVk
    );
    require_eq!(
        ctx.accounts.transfer_vk.vk_id,
        transfer_vk_id,
        PoolError::InvalidVk
    );
    pool.deposit_vk = ctx.accounts.deposit_vk.key();
    pool.unshield_vk = ctx.accounts.unshield_vk.key();
    pool.transfer_vk = ctx.accounts.transfer_vk.key();
    pool.deposit_vk_id = deposit_vk_id;
    pool.unshield_vk_id = unshield_vk_id;
    pool.transfer_vk_id = transfer_vk_id;
    pool.next_vk_id = deposit_vk_id
        .max(unshield_vk_id)
        .max(transfer_vk_id)
        .saturating_add(1);
    pool.bump = ctx.bumps.pool;
    pool.vault_bump = ctx.bumps.vault_authority;
    pool.tree_bump = ctx.bumps.merkle_tree;

    ctx.accounts
        .merkle_tree
        .init_empty(ctx.bumps.merkle_tree)?;
    pool.root_cursor = 0;
    pool.roots = [[0u8; 32]; commitment::ROOT_HISTORY];
    pool.roots[0] = ctx.accounts.merkle_tree.root;
    Ok(())
}

pub fn deposit(
    ctx: Context<Deposit>,
    amount: u64,
    commitment_leaf: [u8; 32],
    proof: [u8; PROOF_LEN],
) -> Result<()> {
    require!(amount > 0, PoolError::ZeroAmount);
    compliance::assert_allowed(
        &ctx.accounts.pool,
        &ctx.accounts.policy,
        ctx.accounts.listing.as_ref(),
        ctx.accounts.depositor.key(),
    )?;
    state::assert_vk(&ctx.accounts.deposit_vk, ctx.accounts.pool.deposit_vk_id)?;
    let amount_fe = state::u64_to_fr(amount);
    let inputs = [commitment_leaf, amount_fe];
    crate::verifier::verify(&ctx.accounts.deposit_vk, &proof, &inputs)?;

    let index = commitment::insert(
        &mut ctx.accounts.merkle_tree,
        &mut ctx.accounts.pool,
        commitment_leaf,
    )?;

    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.depositor_ata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;
    commitment::emit_added(&ctx.accounts.merkle_tree, commitment_leaf, index)?;
    Ok(())
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
    commitment::require_known_root(&ctx.accounts.pool, &root)?;
    state::assert_vk(&ctx.accounts.transfer_vk, ctx.accounts.pool.transfer_vk_id)?;
    let inputs = [root, nullifier_1, nullifier_2, out_cm1, out_cm2];
    crate::verifier::verify(&ctx.accounts.transfer_vk, &proof, &inputs)?;

    commitment::insert(&mut ctx.accounts.merkle_tree, &mut ctx.accounts.pool, out_cm1)?;
    commitment::insert(&mut ctx.accounts.merkle_tree, &mut ctx.accounts.pool, out_cm2)?;

    emit!(crate::nullifier::NullifierSpent {
        nullifier: nullifier_1,
    });
    emit!(crate::nullifier::NullifierSpent {
        nullifier: nullifier_2,
    });
    emit!(PrivateTransfer {
        nullifier_1,
        nullifier_2,
        out_cm1,
        out_cm2,
        note_1,
        note_2,
    });
    Ok(())
}

pub fn withdraw(
    ctx: Context<Withdraw>,
    root: [u8; 32],
    nullifier: [u8; 32],
    amount: u64,
    change_cm: [u8; 32],
    proof: [u8; PROOF_LEN],
) -> Result<()> {
    require!(amount > 0, PoolError::ZeroAmount);
    commitment::require_known_root(&ctx.accounts.pool, &root)?;
    compliance::assert_allowed(
        &ctx.accounts.pool,
        &ctx.accounts.policy,
        ctx.accounts.listing.as_ref(),
        ctx.accounts.recipient.key(),
    )?;
    let recipient_fe = state::reduce_fr(&ctx.accounts.recipient.key().to_bytes());
    let amount_fe = state::u64_to_fr(amount);
    state::assert_vk(&ctx.accounts.unshield_vk, ctx.accounts.pool.unshield_vk_id)?;
    let inputs = [root, nullifier, recipient_fe, amount_fe, change_cm];
    crate::verifier::verify(&ctx.accounts.unshield_vk, &proof, &inputs)?;

    commitment::insert(
        &mut ctx.accounts.merkle_tree,
        &mut ctx.accounts.pool,
        change_cm,
    )?;

    let pool = ctx.accounts.pool.clone();
    let bump = pool.vault_bump;
    let mint = pool.mint;
    let seeds: &[&[u8]] = &[b"vault", mint.as_ref(), &[bump]];
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.recipient_ata.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            &[seeds],
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;
    emit!(crate::nullifier::NullifierSpent { nullifier });
    emit!(Withdrawn {
        nullifier,
        amount,
        recipient: ctx.accounts.recipient.key(),
        change_cm,
    });
    Ok(())
}

pub fn register_merchant_treasury(
    ctx: Context<RegisterMerchantTreasury>,
    confidential: bool,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.treasury.mint,
        ctx.accounts.pool.mint,
        PoolError::MintMismatch
    );
    let rec = &mut ctx.accounts.merchant;
    rec.merchant = ctx.accounts.owner.key();
    rec.treasury = ctx.accounts.treasury.key();
    rec.confidential = confidential;
    rec.zk_elgamal_proof_program = ZK_ELGAMAL_PROOF_PROGRAM_ID;
    rec.bump = ctx.bumps.merchant;
    emit!(MerchantTreasuryRegistered {
        merchant: rec.merchant,
        treasury: rec.treasury,
        confidential,
    });
    Ok(())
}

#[event]
pub struct PrivateTransfer {
    pub nullifier_1: [u8; 32],
    pub nullifier_2: [u8; 32],
    pub out_cm1: [u8; 32],
    pub out_cm2: [u8; 32],
    pub note_1: Vec<u8>,
    pub note_2: Vec<u8>,
}

#[event]
pub struct Withdrawn {
    pub nullifier: [u8; 32],
    pub amount: u64,
    pub recipient: Pubkey,
    pub change_cm: [u8; 32],
}

#[event]
pub struct MerchantTreasuryRegistered {
    pub merchant: Pubkey,
    pub treasury: Pubkey,
    pub confidential: bool,
}
