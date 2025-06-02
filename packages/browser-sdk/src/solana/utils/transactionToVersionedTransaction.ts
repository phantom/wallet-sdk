import { getTransactionEncoder, type Transaction } from "@solana/transactions";
import type { VersionedTransaction } from "@solana/web3.js";

/**
 * Convert a `@solana/kit` `Transaction` into a `@solana/web3.js` `VersionedTransaction` like object.
 *
 * This is useful when interacting with libraries or wallet providers that still
 * expect the legacy web3.js types while the SDK internally works with the new
 * Kit transaction model.
 *
 * The conversion is a two-step process:
 * 1. Encode the Kit `Transaction` into its canonical byte representation.
 * 2. Re-hydrate those bytes into a `VersionedTransaction` understood by
 *    `@solana/web3.js`.
 *
 * @param transaction - The Kit transaction to convert.
 * @returns A `VersionedTransaction` equivalent of the provided Kit transaction.
 */
export function transactionToVersionedTransaction(transaction: Transaction): VersionedTransaction {
  // Encode the Kit transaction into its canonical wire format (Uint8Array).
  const serialized = getTransactionEncoder().encode(transaction);

  // Return a *shape-compatible* object that implements only the subset of the
  // `@solana/web3.js` `VersionedTransaction` API that wallet providers use —
  // typically just the `serialize` method.
  //
  // We cast the value to `unknown` first, then to `VersionedTransaction` so
  // that TypeScript treats the object as such at compile time without pulling
  // in the runtime implementation from `@solana/web3.js`.
  const fakeVersioned = {
    serialize() {
      // `serialize` should return a *new* `Uint8Array` each call to avoid
      // consumers mutating the internal representation.
      return new Uint8Array(serialized);
    },
  } as unknown as VersionedTransaction;

  return fakeVersioned;
}
