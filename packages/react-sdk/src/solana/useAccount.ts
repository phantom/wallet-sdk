import * as React from "react";
import { usePhantom } from "../PhantomContext";
import { assertSolanaConfigured } from "./assertions";
import { useProvider } from "./useProvider";

type UseAccountResult =
  | {
      status: "connected";
      publicKey: string;
    }
  | {
      status: "disconnected" | "loading";
      publicKey: null;
    };

/**
 * React hook that provides the current account connection status and public key.
 * Automatically updates when the account connects, disconnects, or changes.
 *
 * @returns Object containing status ('connected' | 'disconnected') and publicKey (string | null)
 */
export function useAccount(): UseAccountResult {
  const { phantom, isReady } = usePhantom();
  const { status: providerStatus, provider } = useProvider();

  const [account, setAccount] = React.useState<UseAccountResult>(() => {
    if (!isReady) return { status: "loading", publicKey: null };
    assertSolanaConfigured(phantom);
    return phantom.solana.getAccount();
  });

  React.useEffect(() => {
    if (!isReady) return;
    assertSolanaConfigured(phantom);

    if (providerStatus !== "success" || !provider) return;

    if (account.status === "loading") {
      setAccount(phantom.solana.getAccount());
    }

    const updateAccount = () => {
      setAccount(phantom.solana.getAccount());
    };

    provider.on("connect", updateAccount);
    provider.on("disconnect", updateAccount);
    provider.on("accountChanged", updateAccount);

    return () => {
      provider.off("connect", updateAccount);
      provider.off("disconnect", updateAccount);
      provider.off("accountChanged", updateAccount);
    };
  }, [provider, phantom, providerStatus, isReady, account.status]);

  return account;
}
