import { useCallback, useState } from "react";
import { usePhantom } from "../PhantomProvider";

export function useDisconnect() {
  const { sdk, updateConnectionState } = usePhantom();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const disconnect = useCallback(async () => {
    if (!sdk) {
      throw new Error("SDK not initialized");
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      await sdk.disconnect();
      await updateConnectionState();

      // The PhantomProvider will detect the disconnection
      // and update the context state
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsDisconnecting(false);
    }
  }, [sdk, updateConnectionState]);

  return {
    disconnect,
    isDisconnecting,
    error,
  };
}
