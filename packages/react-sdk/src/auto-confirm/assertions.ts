import type { Phantom } from "@phantom/browser-sdk";

/**
 * Asserts that the Phantom instance has auto-confirm configured and narrows the type.
 * After calling this function, TypeScript will know that phantom.autoConfirm is defined.
 */
export function assertAutoConfirmConfigured(
  phantom: Phantom | undefined,
): asserts phantom is Phantom & { autoConfirm: NonNullable<Phantom["autoConfirm"]> } {
  if (!phantom?.autoConfirm) {
    throw new Error(
      "Phantom auto-confirm plugin not found. Please ensure the auto-confirm plugin is installed and configured properly.",
    );
  }
}
