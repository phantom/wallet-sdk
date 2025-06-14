import * as React from "react";
import { usePhantom } from "../PhantomContext";

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
