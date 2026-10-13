//! Groth16 setup / prove / Solana-layout serialization (BN254).
//!
//! On-chain `groth16-solana` expects:
//!   - G1 = 64-byte big-endian `x || y`
//!   - G2 = 128-byte big-endian `x.c0 || x.c1 || y.c0 || y.c1`
//!   - public inputs as 32-byte big-endian scalars
//!   - `proof_a` **negated** before verification
//!
//! Proof bytes submitted to `hypertron_pool` are 256 bytes: A(64) || B(128) || C(64).

use std::ops::Neg;

use anyhow::Result;
use ark_bn254::{Bn254, Fr, G1Affine, G2Affine};
use ark_ec::AffineRepr;
use ark_ff::{BigInteger, PrimeField};
use ark_groth16::{Groth16, Proof, ProvingKey, VerifyingKey};
use ark_relations::r1cs::ConstraintSynthesizer;
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_snark::SNARK;
use ark_std::rand::{rngs::StdRng, CryptoRng, RngCore, SeedableRng};
use serde::{Deserialize, Serialize};

/// Verifying key in the exact shape `hypertron_pool::register_vk` stores.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VkJson {
    pub nr_pubinputs: usize,
    pub alpha: String,
    pub beta: String,
    pub gamma: String,
    pub delta: String,
    pub ic: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub insecure_dev_seed: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProofJson {
    pub proof: String,
    pub public_inputs: Vec<String>,
}

pub type Keys = (ProvingKey<Bn254>, VerifyingKey<Bn254>);

pub fn setup<C: ConstraintSynthesizer<Fr>, R: RngCore + CryptoRng>(
    circuit: C,
    rng: &mut R,
) -> Result<Keys> {
    let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, rng)?;
    Ok((pk, vk))
}

pub fn prove<C: ConstraintSynthesizer<Fr>, R: RngCore + CryptoRng>(
    pk: &ProvingKey<Bn254>,
    circuit: C,
    rng: &mut R,
) -> Result<Proof<Bn254>> {
    Ok(Groth16::<Bn254>::prove(pk, circuit, rng)?)
}

pub fn insecure_dev_rng(seed: u64) -> impl RngCore + CryptoRng {
    StdRng::seed_from_u64(seed)
}

pub fn verify(vk: &VerifyingKey<Bn254>, public_inputs: &[Fr], proof: &Proof<Bn254>) -> bool {
    Groth16::<Bn254>::verify(vk, public_inputs, proof).unwrap_or(false)
}

fn fq_be32(f: impl Into<ark_ff::BigInt<4>>) -> [u8; 32] {
    let be = f.into().to_bytes_be();
    let mut buf = [0u8; 32];
    buf[(32 - be.len())..].copy_from_slice(&be);
    buf
}

fn g1_be(p: &G1Affine) -> [u8; 64] {
    let (x, y) = p.xy().expect("g1 at infinity");
    let mut buf = [0u8; 64];
    buf[..32].copy_from_slice(&fq_be32(x.into_bigint()));
    buf[32..].copy_from_slice(&fq_be32(y.into_bigint()));
    buf
}

fn g2_be(p: &G2Affine) -> [u8; 128] {
    // Solana / Ethereum alt_bn128 encodes Fp2 as (c1, c0) = (imag, real).
    let (x, y) = p.xy().expect("g2 at infinity");
    let mut buf = [0u8; 128];
    buf[0..32].copy_from_slice(&fq_be32(x.c1.into_bigint()));
    buf[32..64].copy_from_slice(&fq_be32(x.c0.into_bigint()));
    buf[64..96].copy_from_slice(&fq_be32(y.c1.into_bigint()));
    buf[96..128].copy_from_slice(&fq_be32(y.c0.into_bigint()));
    buf
}

/// Scalar -> 32-byte big-endian (groth16-solana public inputs).
pub fn fr_be32(f: &Fr) -> [u8; 32] {
    let be = f.into_bigint().to_bytes_be();
    let mut buf = [0u8; 32];
    buf[(32 - be.len())..].copy_from_slice(&be);
    buf
}

/// Solana pubkey (or any 32 bytes) reduced into Fr, matching on-chain `reduce_fr`.
pub fn pubkey_fr(bytes: &[u8; 32]) -> Fr {
    Fr::from_be_bytes_mod_order(bytes)
}

pub fn vk_json(vk: &VerifyingKey<Bn254>) -> VkJson {
    VkJson {
        nr_pubinputs: vk.gamma_abc_g1.len().saturating_sub(1),
        alpha: hex::encode(g1_be(&vk.alpha_g1)),
        beta: hex::encode(g2_be(&vk.beta_g2)),
        gamma: hex::encode(g2_be(&vk.gamma_g2)),
        delta: hex::encode(g2_be(&vk.delta_g2)),
        ic: vk.gamma_abc_g1.iter().map(|p| hex::encode(g1_be(p))).collect(),
        insecure_dev_seed: None,
    }
}

/// 256-byte Solana proof: negated A || B || C, big-endian coordinates.
pub fn proof_solana_bytes(proof: &Proof<Bn254>) -> [u8; 256] {
    let a_neg = G1Affine::from(proof.a.neg());
    let mut out = [0u8; 256];
    out[0..64].copy_from_slice(&g1_be(&a_neg));
    out[64..192].copy_from_slice(&g2_be(&proof.b));
    out[192..256].copy_from_slice(&g1_be(&proof.c));
    out
}

/// Hex of [`proof_solana_bytes`] — what `hypertron_pool` verifies.
pub fn proof_hex(proof: &Proof<Bn254>) -> String {
    hex::encode(proof_solana_bytes(proof))
}

pub fn pk_to_bytes(pk: &ProvingKey<Bn254>) -> Result<Vec<u8>> {
    let mut v = Vec::new();
    pk.serialize_compressed(&mut v)?;
    Ok(v)
}

pub fn pk_from_bytes(bytes: &[u8]) -> Result<ProvingKey<Bn254>> {
    Ok(ProvingKey::<Bn254>::deserialize_compressed(bytes)?)
}

pub fn amount_fr(amount: u128) -> Fr {
    Fr::from(amount)
}

#[cfg(test)]
mod solana_layout_tests {
    use super::*;
    use crate::circuit::DepositCircuit;
    use crate::note::Note;
    use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

    #[test]
    fn groth16_solana_accepts_deposit_proof() {
        let spend_sk = Fr::from(7u64);
        let note = Note::from_spend_key(spend_sk, Fr::from(8u64), Fr::from(500u64));
        let cm = note.commitment();
        let (pk, vk) = setup(DepositCircuit::empty(), &mut insecure_dev_rng(3)).unwrap();
        let proof = prove(
            &pk,
            DepositCircuit {
                cm: Some(cm),
                amount: Some(note.v),
                owner_pk: Some(note.owner_pk),
                k: Some(note.k),
            },
            &mut insecure_dev_rng(3),
        )
        .unwrap();
        assert!(verify(&vk, &[cm, note.v], &proof));

        let bytes = proof_solana_bytes(&proof);
        let proof_a: [u8; 64] = bytes[0..64].try_into().unwrap();
        let proof_b: [u8; 128] = bytes[64..192].try_into().unwrap();
        let proof_c: [u8; 64] = bytes[192..256].try_into().unwrap();
        let inputs = [fr_be32(&cm), fr_be32(&note.v)];

        let ic: Vec<[u8; 64]> = vk.gamma_abc_g1.iter().map(g1_be).collect();
        let verifyingkey = Groth16Verifyingkey {
            nr_pubinputs: 2,
            vk_alpha_g1: g1_be(&vk.alpha_g1),
            vk_beta_g2: g2_be(&vk.beta_g2),
            vk_gamme_g2: g2_be(&vk.gamma_g2),
            vk_delta_g2: g2_be(&vk.delta_g2),
            vk_ic: &ic,
        };
        let mut verifier =
            Groth16Verifier::new(&proof_a, &proof_b, &proof_c, &inputs, &verifyingkey).unwrap();
        verifier.verify().expect("solana groth16 verify");
    }
}
