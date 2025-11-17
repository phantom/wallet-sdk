import { useState, useCallback } from "react";
import { usePhantom } from "../PhantomContext";

export function useDisconnect() {
  const { sdk } = usePhantom();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const disconnect = useCallback(async (): Promise<void> => {
    if (!sdk) {
      throw new Error("SDK not initialized");
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      await sdk.disconnect();
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  }, [sdk]);

  return {
    disconnect,
    isDisconnecting,
    error,
  };
}
