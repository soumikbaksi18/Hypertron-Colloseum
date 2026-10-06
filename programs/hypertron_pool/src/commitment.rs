//! Note / Merkle engine (Stellar `hypertron-commitment`).
//!
//! Incremental Poseidon tree. Leaves live off-chain; on-chain we store filled
//! subtrees, empty-subtree zeros, and the current root. Recent roots sit on
//! `PoolState` so in-flight proofs stay valid.

use crate::error::PoolError;
use crate::poseidon;
use crate::state::PoolState;
use anchor_lang::prelude::*;

pub const DEPTH: usize = 20;
pub const ROOT_HISTORY: usize = 32;

#[account]
pub struct MerkleTree {
    pub next_index: u64,
    pub filled: [[u8; 32]; DEPTH],
    pub zeros: [[u8; 32]; DEPTH],
    pub root: [u8; 32],
    pub bump: u8,
}

impl MerkleTree {
    pub const SIZE: usize = 8 + 32 * DEPTH + 32 * DEPTH + 32 + 1;
}

impl MerkleTree {
    pub fn init_empty(&mut self, bump: u8) -> Result<()> {
        self.bump = bump;
        self.next_index = 0;
        self.filled = [[0u8; 32]; DEPTH];
        self.zeros = [[0u8; 32]; DEPTH];
        let mut z = [0u8; 32];
        for i in 0..DEPTH {
            self.zeros[i] = z;
            z = poseidon::hash2(&z, &z)?;
        }
        self.root = z;
        Ok(())
    }
}

/// Insert a commitment leaf and push the new root into the recent-root ring.
pub fn insert(tree: &mut MerkleTree, pool: &mut PoolState, leaf: [u8; 32]) -> Result<u64> {
    let mut current = leaf;
    let mut idx = tree.next_index;
    for i in 0..DEPTH {
        if idx % 2 == 0 {
            tree.filled[i] = current;
            current = poseidon::hash2(&current, &tree.zeros[i])?;
        } else {
            current = poseidon::hash2(&tree.filled[i], &current)?;
        }
        idx /= 2;
    }
    let index = tree.next_index;
    tree.next_index = tree.next_index.saturating_add(1);
    tree.root = current;
    pool.record_root(current);
    Ok(index)
}

#[event]
pub struct CommitmentAdded {
    pub index: u64,
    pub leaf: [u8; 32],
    pub root: [u8; 32],
}

pub fn emit_added(tree: &MerkleTree, leaf: [u8; 32], index: u64) -> Result<()> {
    emit!(CommitmentAdded {
        index,
        leaf,
        root: tree.root,
    });
    Ok(())
}

pub fn require_known_root(pool: &PoolState, root: &[u8; 32]) -> Result<()> {
    require!(pool.known_root(root), PoolError::UnknownRoot);
    Ok(())
}
