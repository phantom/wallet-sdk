import * as React from "react";
import { usePhantom } from "../PhantomContext";

/**
 * Hook that provides a connect function using the phantom.solana.connect method.
 * This is a simple passthrough with no complex logic involved.
 * @returns A function to connect to the Phantom wallet.
 */
export function useConnect() {
  const { phantom } = usePhantom();

  return React.useCallback(async () => {
    if (!phantom?.solana) {
      throw new Error("Phantom solana plugin not found.");
    }

    return await phantom.solana.connect();
  }, [phantom]);
}
