import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertSolanaConfigured } from "./assertions";

/**
 * React hook that provides the current account connection status and public key.
 * Automatically updates when the account connects, disconnects, or changes.
 *
 * @returns Object containing status ('connected' | 'disconnected') and address (string | null)
 */
export function useAccount(): string | undefined {
  const { phantom, isReady } = usePhantom();

  const [account, setAccount] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!isReady) return;
    assertSolanaConfigured(phantom);

    const updateAccount = async () => {
      setAccount(await phantom.solana.getAccount());
    };

    updateAccount();

    phantom.solana.addEventListener("connect", updateAccount);
    phantom.solana.addEventListener("disconnect", updateAccount);
    phantom.solana.addEventListener("accountChanged", updateAccount);

    return () => {
      phantom.solana.removeEventListener("connect", updateAccount);
      phantom.solana.removeEventListener("disconnect", updateAccount);
      phantom.solana.removeEventListener("accountChanged", updateAccount);
    };
  }, [phantom, isReady]);

  return account;
}
