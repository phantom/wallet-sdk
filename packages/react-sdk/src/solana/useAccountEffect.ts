import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertSolanaConfigured } from "./assertions";

type UseAccountEffectParameters = {
  onConnect?(data: { publicKey: string }): void;
  onDisconnect?(): void;
  onAccountChanged?(data: { publicKey: string }): void;
};

/**
 * Hook for listening to account lifecycle events.
 * Provides callbacks for connect, disconnect, and account change events.
 */
export function useAccountEffect(parameters: UseAccountEffectParameters = {}) {
  const { onConnect, onDisconnect, onAccountChanged } = parameters;
  const { phantom, isReady } = usePhantom();

  React.useEffect(() => {
    if (!isReady) return;
    assertSolanaConfigured(phantom);

    const handleConnect = (publicKey: string) => {
      onConnect?.({
        publicKey,
      });
    };

    const handleDisconnect = () => {
      onDisconnect?.();
    };

    const handleAccountChanged = (publicKey: string) => {
      onAccountChanged?.({
        publicKey,
      });
    };

    if (onConnect) {
      phantom.solana.addEventListener("connect", handleConnect);
    }
    if (onDisconnect) {
      phantom.solana.addEventListener("disconnect", handleDisconnect);
    }
    if (onAccountChanged) {
      phantom.solana.addEventListener("accountChanged", handleAccountChanged);
    }

    return () => {
      if (onConnect) {
        phantom.solana.removeEventListener("connect", handleConnect);
      }
      if (onDisconnect) {
        phantom.solana.removeEventListener("disconnect", handleDisconnect);
      }
      if (onAccountChanged) {
        phantom.solana.removeEventListener("accountChanged", handleAccountChanged);
      }
    };
  }, [isReady, phantom, onConnect, onDisconnect, onAccountChanged]);
}
