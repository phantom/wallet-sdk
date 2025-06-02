import type { Address } from "@solana/addresses";
import type { PublicKey } from "@solana/web3.js";

/**
 * Convert a `@solana/addresses` `Address` into an object that satisfies the
 * (minimal) `@solana/web3.js` `PublicKey` interface expected by legacy wallet
 * providers like Phantom.
 *
 * Wallets typically call either `toBase58()` or `toString()` on the `PublicKey`
 * instance. We implement both, returning the original address string. If a
 * provider eventually relies on more `PublicKey` methods, extend this object
 * accordingly.
 *
 * No runtime code from `@solana/web3.js` is imported; we only reference its
 * `PublicKey` type for compile-time compatibility.
 */
export function addressToPublicKey(address: Address): PublicKey {
  const fakePublicKey = {
    toBase58() {
      return address;
    },
    toString() {
      return address;
    },
  } as unknown as PublicKey;

  return fakePublicKey;
}
