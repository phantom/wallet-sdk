import * as React from "react";
import { usePhantom } from "../PhantomContext";

type UseConnectProps = {
  autoConnect?: boolean;
};

/**
 * Hook that provides a connect function using the phantom.solana.connect method.
 * This is a simple passthrough with no complex logic involved.
 * @returns A function to connect to the Phantom wallet.
 */
export function useConnect({ autoConnect = false }: UseConnectProps = {}) {
  const { phantom } = usePhantom();

  const connect = React.useCallback(async () => {
    if (!phantom?.solana) {
      throw new Error("Phantom solana plugin not found.");
    }

    return await phantom.solana.connect();
  }, [phantom]);

  // If autoConnect is true, connect to the wallet when the component mounts
  React.useEffect(() => {
    if (autoConnect && phantom?.solana) {
      connect();
    }
  }, [autoConnect, connect]);

  return { connect };
}
