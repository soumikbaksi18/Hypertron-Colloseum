//! Double-spend registry (Stellar `hypertron-nullifier`).
//!
//! Each spent nullifier is its own PDA. `init` fails if the account already
//! exists, so double-spend prevention is atomic. Rent-exempt PDAs do not expire.

use anchor_lang::prelude::*;

#[account]
pub struct NullifierMarker {}

#[event]
pub struct NullifierSpent {
    pub nullifier: [u8; 32],
}
