import { usePhantom } from "../PhantomContext"; // Assuming usePhantom provides the SDK instance
import type { SolanaSignInData } from "@phantom/browser-sdk/solana";
import { useCallback } from "react";

interface UseSignInResult {
  signIn: (
    signInData: SolanaSignInData,
  ) => Promise<{ address: string; signature: Uint8Array; signedMessage: Uint8Array }>;
}

/**
 * Hook to provide a sign-in function for Solana.
 * Leverages the `signIn` method from the Phantom Browser SDK.
 */
export function useSignIn(): UseSignInResult {
  const { phantom } = usePhantom(); // Assuming phantom instance is available via context

  const signIn = useCallback(
    async (signInData: SolanaSignInData) => {
      if (!phantom?.solana) {
        throw new Error("Phantom Solana provider not available.");
      }
      const result = await phantom.solana.signIn(signInData);
      return result;
    },
    [phantom],
  );

  return { signIn };
}
