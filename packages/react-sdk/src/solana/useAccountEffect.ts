import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertSolanaConfigured } from "./assertions";
import { useProvider } from "./useProvider";

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
  const { status: providerStatus, provider } = useProvider();

  React.useEffect(() => {
    if (!isReady || providerStatus !== "success" || !provider) return;
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

    phantom.solana.addEventListener("connect", handleConnect);
    phantom.solana.addEventListener("disconnect", handleDisconnect);
    phantom.solana.addEventListener("accountChanged", handleAccountChanged);

    return () => {
      phantom.solana.removeEventListener("connect", handleConnect);
      phantom.solana.removeEventListener("disconnect", handleDisconnect);
      phantom.solana.removeEventListener("accountChanged", handleAccountChanged);
    };
  }, [isReady, providerStatus, provider, phantom, onConnect, onDisconnect, onAccountChanged]);
}
