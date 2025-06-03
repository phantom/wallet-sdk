import { usePhantom } from "../PhantomContext"; // Assuming this provides the SDK instance
import { useCallback } from "react";

interface UseSignMessageResult {
  signMessage: (message: Uint8Array, display?: "utf8" | "hex") => Promise<{ signature: Uint8Array; address: string }>;
}

export function useSignMessage(): UseSignMessageResult {
  const { phantom } = usePhantom();

  const signMessage = useCallback(
    async (message: Uint8Array, display?: "utf8" | "hex") => {
      if (!phantom?.solana) {
        throw new Error("Phantom Solana provider not available.");
      }
      const result = await phantom.solana.signMessage(message, display);
      return result;
    },
    [phantom],
  );

  return { signMessage };
}
