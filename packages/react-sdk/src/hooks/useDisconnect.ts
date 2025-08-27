import { useCallback, useState } from "react";
import { usePhantom } from "../PhantomProvider";

export function useDisconnect() {
  const { sdk } = usePhantom();
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
    } catch (err) {
      setError(err as Error);
      throw err;
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
