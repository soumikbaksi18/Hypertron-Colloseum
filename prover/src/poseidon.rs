//! Circomlib-compatible Poseidon over BN254 (t=3, x^5, 8 full + 57 partial).
//!
//! Native hashing matches Light Protocol `light-poseidon` / Solana `sol_poseidon`
//! (`Parameters::Bn254X5`, two inputs, big-endian field elements). The same
//! MDS and round constants are used in-circuit.

use ark_bn254::Fr;
use ark_ff::PrimeField;
use ark_r1cs_std::{fields::fp::FpVar, fields::FieldVar};
use ark_relations::r1cs::SynthesisError;
use light_poseidon::{Poseidon, PoseidonHasher};

include!("poseidon_bn254_t3.rs");

pub const HALF_F: usize = ROUNDS_F / 2;

fn hex_to_fr(h: &str) -> Fr {
    let h = h.trim_start_matches("0x");
    let mut raw: Vec<u8> = Vec::new();
    let mut i = 0;
    if h.len() % 2 == 1 {
        raw.push(u8::from_str_radix(&h[0..1], 16).unwrap());
        i = 1;
    }
    while i < h.len() {
        raw.push(u8::from_str_radix(&h[i..i + 2], 16).unwrap());
        i += 2;
    }
    let mut bytes = [0u8; 32];
    let off = 32 - raw.len();
    bytes[off..].copy_from_slice(&raw);
    Fr::from_be_bytes_mod_order(&bytes)
}

/// MDS matrix as field elements.
pub fn mds_fr() -> [[Fr; 3]; 3] {
    core::array::from_fn(|i| core::array::from_fn(|j| hex_to_fr(MDS_T3[i][j])))
}

/// Round constants as field elements (`N_ROUNDS x t`).
pub fn rc_fr() -> [[Fr; 3]; 65] {
    core::array::from_fn(|r| core::array::from_fn(|i| hex_to_fr(RC_T3[r][i])))
}

fn pow5(x: Fr) -> Fr {
    let x2 = x * x;
    let x4 = x2 * x2;
    x4 * x
}

/// Native Poseidon permutation over `Fr`, t=3, matching circomlib / sol_poseidon.
pub fn permute(state: &mut [Fr; 3]) {
    let mds = mds_fr();
    let rc = rc_fr();
    for round in 0..N_ROUNDS {
        for i in 0..3 {
            state[i] += rc[round][i];
        }
        let full = round < HALF_F || round >= N_ROUNDS - HALF_F;
        if full {
            for i in 0..3 {
                state[i] = pow5(state[i]);
            }
        } else {
            state[0] = pow5(state[0]);
        }
        let mut ns = [Fr::from(0u64); 3];
        for i in 0..3 {
            for j in 0..3 {
                ns[i] += mds[i][j] * state[j];
            }
        }
        *state = ns;
    }
}

/// Native 2-to-1 compression: domain tag 0, then `(a, b)`.
pub fn poseidon2to1(a: Fr, b: Fr) -> Fr {
    let mut state = [Fr::from(0u64), a, b];
    permute(&mut state);
    state[0]
}

/// Same compression via `light-poseidon` (reference for `sol_poseidon`).
pub fn poseidon2to1_light(a: Fr, b: Fr) -> Fr {
    let mut h = Poseidon::<Fr>::new_circom(2).expect("t=3 circom params");
    h.hash(&[a, b]).expect("poseidon hash")
}

fn pow5_var(x: &FpVar<Fr>) -> Result<FpVar<Fr>, SynthesisError> {
    let x2 = x * x;
    let x4 = &x2 * &x2;
    Ok(&x4 * x)
}

fn permute_var(
    state: &mut [FpVar<Fr>; 3],
    mds: &[[Fr; 3]; 3],
    rc: &[[Fr; 3]; 65],
) -> Result<(), SynthesisError> {
    for round in 0..N_ROUNDS {
        for i in 0..3 {
            state[i] = &state[i] + FpVar::constant(rc[round][i]);
        }
        let full = round < HALF_F || round >= N_ROUNDS - HALF_F;
        if full {
            for i in 0..3 {
                state[i] = pow5_var(&state[i])?;
            }
        } else {
            state[0] = pow5_var(&state[0])?;
        }
        let mut ns: [FpVar<Fr>; 3] = core::array::from_fn(|_| FpVar::constant(Fr::from(0u64)));
        for i in 0..3 {
            let mut acc = FpVar::constant(Fr::from(0u64));
            for j in 0..3 {
                acc = &acc + &(&state[j] * FpVar::constant(mds[i][j]));
            }
            ns[i] = acc;
        }
        *state = ns;
    }
    Ok(())
}

/// In-circuit 2-to-1 Poseidon compression (same permutation as [`poseidon2to1`]).
pub fn hash2_var(
    a: &FpVar<Fr>,
    b: &FpVar<Fr>,
    mds: &[[Fr; 3]; 3],
    rc: &[[Fr; 3]; 65],
) -> Result<FpVar<Fr>, SynthesisError> {
    let mut state = [FpVar::constant(Fr::from(0u64)), a.clone(), b.clone()];
    permute_var(&mut state, mds, rc)?;
    Ok(state[0].clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_light_poseidon() {
        let a = Fr::from(1u64);
        let b = Fr::from(2u64);
        assert_eq!(poseidon2to1(a, b), poseidon2to1_light(a, b));
        let a = Fr::from_be_bytes_mod_order(&[1u8; 32]);
        let b = Fr::from_be_bytes_mod_order(&[2u8; 32]);
        assert_eq!(poseidon2to1(a, b), poseidon2to1_light(a, b));
    }
}
