import type { Phantom } from "@phantom/browser-sdk";

/**
 * Asserts that the Phantom instance has Solana configured and narrows the type.
 * After calling this function, TypeScript will know that phantom.solana is defined.
 */
export function assertExtensionConfigured(
  phantom: Phantom | undefined,
): asserts phantom is Phantom & { extension: NonNullable<Phantom["extension"]> } {
  if (!phantom?.extension) {
    throw new Error(
      "Phantom extension plugin not found. Please ensure the extension plugin is installed and configured properly.",
    );
  }
}
bd1d166dff7c53e5d5295aba03b8b3ac37090677
