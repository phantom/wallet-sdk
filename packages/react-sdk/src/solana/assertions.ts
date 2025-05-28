import type { Phantom } from "@phantom/browser-sdk";
import type { PhantomSolanaProvider } from "@phantom/browser-sdk/solana";

/**
 * Asserts that the Phantom instance has Solana configured and narrows the type.
 * After calling this function, TypeScript will know that phantom.solana is defined.
 */
export function assertSolanaConfigured(
  phantom: Phantom | undefined,
): asserts phantom is Phantom & { solana: NonNullable<Phantom["solana"]> } {
  if (!phantom?.solana) {
    throw new Error(
      "Phantom solana chain plugin not found. Please ensure the solana chain plugin is installed and configured properly.",
    );
  }
}

export function assertProviderAvailable(
  provider: PhantomSolanaProvider | null,
): asserts provider is PhantomSolanaProvider {
  if (!provider) {
    throw new Error(
      "Phantom solana provider is not available. Please ensure the solana chain plugin is installed and configured properly.",
    );
  }
}
