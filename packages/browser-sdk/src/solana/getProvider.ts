/**
 * Retrieves Phantom injected provider and returns it if it exists.
 * @returns Phantom injected provider or null if it doesn't exist.
 */
export function getProvider() {
  return ((window as any).phantom?.solana as NonNullable<unknown>) ?? null;
}
