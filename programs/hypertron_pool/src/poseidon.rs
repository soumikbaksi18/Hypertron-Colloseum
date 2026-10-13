use crate::error::PoolError;
use anchor_lang::prelude::*;

pub fn hash2(left: &[u8; 32], right: &[u8; 32]) -> Result<[u8; 32]> {
    #[cfg(target_os = "solana")]
    {
        use solana_poseidon::{hashv, Endianness, Parameters};
        let h = hashv(
            Parameters::Bn254X5,
            Endianness::BigEndian,
            &[left.as_slice(), right.as_slice()],
        )
        .map_err(|_| PoolError::Poseidon)?;
        Ok(h.to_bytes())
    }
    #[cfg(not(target_os = "solana"))]
    {
        use ark_bn254::Fr;
        use ark_ff::{BigInteger, PrimeField};
        use light_poseidon::{Poseidon, PoseidonHasher};
        let a = Fr::from_be_bytes_mod_order(left);
        let b = Fr::from_be_bytes_mod_order(right);
        let mut h = Poseidon::<Fr>::new_circom(2).map_err(|_| PoolError::Poseidon)?;
        let out = h.hash(&[a, b]).map_err(|_| PoolError::Poseidon)?;
        let be = out.into_bigint().to_bytes_be();
        let mut buf = [0u8; 32];
        buf[32 - be.len()..].copy_from_slice(&be);
        Ok(buf)
    }
}

#[cfg(test)]
mod tests {
    use super::hash2;

    #[test]
    fn matches_light_poseidon_circom() {
        let a = [1u8; 32];
        let b = [2u8; 32];
        let got = hash2(&a, &b).unwrap();
        let expected: [u8; 32] = [
            13, 84, 225, 147, 143, 138, 140, 28, 125, 235, 94, 3, 85, 242, 99, 25, 32, 123, 132,
            254, 156, 162, 206, 27, 38, 231, 53, 200, 41, 130, 25, 144,
        ];
        assert_eq!(got, expected);
    }
}
