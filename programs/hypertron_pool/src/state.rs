use crate::{commitment::ROOT_HISTORY, verifier::VerifyingKeyAccount};
use anchor_lang::prelude::*;

/// Pool composition: token vault + pointers to the four protocol modules.
#[account]
pub struct PoolState {
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub token_program: Pubkey,
    pub decimals: u8,
    /// `Pubkey::default()` means no policy attached (permissionless).
    pub compliance: Pubkey,
    pub deposit_vk: Pubkey,
    pub unshield_vk: Pubkey,
    pub transfer_vk: Pubkey,
    pub deposit_vk_id: u32,
    pub unshield_vk_id: u32,
    pub transfer_vk_id: u32,
    pub next_vk_id: u32,
    pub root_cursor: u8,
    pub roots: [[u8; 32]; ROOT_HISTORY],
    pub bump: u8,
    pub vault_bump: u8,
    pub tree_bump: u8,
}

impl PoolState {
    pub const SIZE: usize = 32 * 8 + 1 + 4 * 4 + 1 + 32 * ROOT_HISTORY + 3;
}

impl PoolState {
    pub fn known_root(&self, root: &[u8; 32]) -> bool {
        self.roots.iter().any(|r| r == root)
    }

    pub fn record_root(&mut self, root: [u8; 32]) {
        let next = (self.root_cursor as usize + 1) % ROOT_HISTORY;
        self.roots[next] = root;
        self.root_cursor = next as u8;
    }
}

pub fn assert_vk(acc: &VerifyingKeyAccount, expected_id: u32) -> Result<()> {
    require_eq!(acc.vk_id, expected_id, crate::error::PoolError::InvalidVk);
    Ok(())
}

/// BN254 scalar field modulus (big-endian).
const FR_MODULUS: [u8; 32] = [
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29, 0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
    0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91, 0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01,
];

pub fn u64_to_fr(v: u64) -> [u8; 32] {
    let mut b = [0u8; 32];
    b[24..].copy_from_slice(&v.to_be_bytes());
    b
}

pub fn reduce_fr(bytes: &[u8; 32]) -> [u8; 32] {
    let mut acc = *bytes;
    for _ in 0..8 {
        if acc.as_slice() < FR_MODULUS.as_slice() {
            break;
        }
        sub_be(&mut acc, &FR_MODULUS);
    }
    acc
}

fn sub_be(a: &mut [u8; 32], b: &[u8; 32]) {
    let mut borrow: u16 = 0;
    for i in (0..32).rev() {
        let av = a[i] as u16;
        let bv = b[i] as u16 + borrow;
        if av >= bv {
            a[i] = (av - bv) as u8;
            borrow = 0;
        } else {
            a[i] = (av + 256 - bv) as u8;
            borrow = 1;
        }
    }
}
