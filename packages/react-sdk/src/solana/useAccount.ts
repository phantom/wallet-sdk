import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertSolanaConfigured } from "./assertions";
import { useProvider } from "./useProvider";

type UseAccountResult =
  | {
      status: "connected";
      address: string;
    }
  | {
      status: "disconnected" | "loading";
      address: null;
    };

/**
 * React hook that provides the current account connection status and public key.
 * Automatically updates when the account connects, disconnects, or changes.
 *
 * @returns Object containing status ('connected' | 'disconnected') and address (string | null)
 */
export function useAccount(): UseAccountResult {
  const { phantom, isReady } = usePhantom();
  const { status: providerStatus, provider } = useProvider();

  const [account, setAccount] = React.useState<UseAccountResult>(() => {
    if (!isReady) return { status: "loading", address: null };
    assertSolanaConfigured(phantom);
    return phantom.solana.getAccount();
  });

  React.useEffect(() => {
    if (!isReady) return;
    assertSolanaConfigured(phantom);

    // TODO: this probably should be in the isReady check from usePhantom instead of useProvider
    if (providerStatus !== "success" || !provider) return;

    if (account.status === "loading") {
      setAccount(phantom.solana.getAccount());
    }

    const updateAccount = () => {
      setAccount(phantom.solana.getAccount());
    };

    phantom.solana.addEventListener("connect", updateAccount);
    phantom.solana.addEventListener("disconnect", updateAccount);
    phantom.solana.addEventListener("accountChanged", updateAccount);

    return () => {
      phantom.solana.removeEventListener("connect", updateAccount);
      phantom.solana.removeEventListener("disconnect", updateAccount);
      phantom.solana.removeEventListener("accountChanged", updateAccount);
    };
  }, [provider, phantom, providerStatus, isReady, account.status]);

  return account;
}
