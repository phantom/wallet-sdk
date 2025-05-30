import * as React from "react";
import { usePhantom } from "../PhantomContext";

/**
 * Hook that provides a disconnect function using the phantom.solana.disconnect method.
 * This is a simple passthrough with no complex logic involved.
 * @returns A function to disconnect from the Phantom wallet.
 */
export function useDisconnect() {
  const { phantom } = usePhantom();

  const disconnect = React.useCallback(async () => {
    if (!phantom?.solana) {
      throw new Error("Phantom solana disconnect method not found.");
    }

    return await phantom.solana.disconnect();
  }, [phantom]);

  return { disconnect };
}
