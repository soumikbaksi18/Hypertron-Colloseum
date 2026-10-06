//! Allow/deny policy (Stellar `hypertron-compliance`).
//!
//! `default_allow = true`  → denylist (everyone in unless listed false)
//! `default_allow = false` → allowlist (nobody in unless listed true)
//!
//! Consulted at deposit (depositor) and withdraw (recipient). Private transfer
//! has no public addresses, so it is not gated here.

use crate::error::PoolError;
use crate::state::PoolState;
use anchor_lang::prelude::*;

#[account]
pub struct CompliancePolicy {
    pub pool: Pubkey,
    pub admin: Pubkey,
    pub default_allow: bool,
    pub bump: u8,
}

impl CompliancePolicy {
    pub const SIZE: usize = 32 + 32 + 1 + 1;
}

#[account]
pub struct Listing {
    pub policy: Pubkey,
    pub subject: Pubkey,
    pub allowed: bool,
    pub bump: u8,
}

impl Listing {
    pub const SIZE: usize = 32 + 32 + 1 + 1;
}

#[derive(Accounts)]
pub struct InitializeCompliance<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, has_one = admin)]
    pub pool: Account<'info, PoolState>,
    #[account(
        init,
        payer = admin,
        space = 8 + CompliancePolicy::SIZE,
        seeds = [b"compliance", pool.key().as_ref()],
        bump
    )]
    pub policy: Account<'info, CompliancePolicy>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subject: Pubkey)]
pub struct SetListing<'info> {
    pub admin: Signer<'info>,
    pub pool: Account<'info, PoolState>,
    #[account(
        mut,
        seeds = [b"compliance", pool.key().as_ref()],
        bump = policy.bump,
        has_one = admin,
        has_one = pool
    )]
    pub policy: Account<'info, CompliancePolicy>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Listing::SIZE,
        seeds = [b"listing", policy.key().as_ref(), subject.as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_compliance(ctx: Context<InitializeCompliance>, default_allow: bool) -> Result<()> {
    require!(
        ctx.accounts.pool.compliance == Pubkey::default(),
        PoolError::ComplianceAlreadySet
    );
    let policy = &mut ctx.accounts.policy;
    policy.pool = ctx.accounts.pool.key();
    policy.admin = ctx.accounts.admin.key();
    policy.default_allow = default_allow;
    policy.bump = ctx.bumps.policy;
    ctx.accounts.pool.compliance = policy.key();
    emit!(ComplianceConfigured {
        policy: policy.key(),
        default_allow,
    });
    Ok(())
}

pub fn set_listing(ctx: Context<SetListing>, subject: Pubkey, allowed: bool) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    listing.policy = ctx.accounts.policy.key();
    listing.subject = subject;
    listing.allowed = allowed;
    listing.bump = ctx.bumps.listing;
    emit!(ListingSet {
        subject,
        allowed,
    });
    Ok(())
}

/// If `pool.compliance` is unset, allow. Otherwise apply allow/deny using the
/// listing account (empty/uninitialized → not listed).
pub fn assert_allowed<'info>(
    pool: &PoolState,
    policy: &Option<Account<'info, CompliancePolicy>>,
    listing: Option<&UncheckedAccount<'info>>,
    subject: Pubkey,
) -> Result<()> {
    if pool.compliance == Pubkey::default() {
        return Ok(());
    }
    let policy = policy
        .as_ref()
        .ok_or(error!(PoolError::ComplianceNotConfigured))?;
    require_keys_eq!(policy.key(), pool.compliance, PoolError::ComplianceNotConfigured);

    let listing = listing.ok_or(error!(PoolError::BadListing))?;
    let (expected, _) = Pubkey::find_program_address(
        &[b"listing", policy.key().as_ref(), subject.as_ref()],
        &crate::ID,
    );
    require_keys_eq!(listing.key(), expected, PoolError::BadListing);

    let listed_allowed = if listing.data_is_empty() {
        None
    } else {
        let data = listing.try_borrow_data()?;
        let parsed = Listing::try_deserialize(&mut &data[..])
            .map_err(|_| error!(PoolError::BadListing))?;
        require_keys_eq!(parsed.policy, policy.key(), PoolError::BadListing);
        require_keys_eq!(parsed.subject, subject, PoolError::BadListing);
        Some(parsed.allowed)
    };

    let ok = match listed_allowed {
        Some(flag) => flag,
        None => policy.default_allow,
    };
    require!(ok, PoolError::RecipientNotAllowed);
    Ok(())
}

#[event]
pub struct ComplianceConfigured {
    pub policy: Pubkey,
    pub default_allow: bool,
}

#[event]
pub struct ListingSet {
    pub subject: Pubkey,
    pub allowed: bool,
}
