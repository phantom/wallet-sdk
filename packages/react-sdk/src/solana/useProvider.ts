import type { PhantomSolanaProvider } from "@phantom/browser-sdk/solana";
import * as React from "react";
import { usePhantom } from "../PhantomContext";

const MAX_RETRIES = 10;
const BASE_DELAY = 100;

type ProviderState =
  | { status: "loading"; provider: null }
  | { status: "success"; provider: PhantomSolanaProvider }
  | { status: "error"; provider: null };

/**
 * Retrieves the Phantom injected provider. If for some reason the provider is not available, it will retry up to 10 times with exponential backoff.
 * @returns Object containing the provider status, provider instance, and any error.
 */
export function useProvider() {
  const { phantom, isReady } = usePhantom();
  const [state, setState] = React.useState<ProviderState>({
    status: "loading",
    provider: null,
  });

  const tryResolvingProvider = React.useCallback(() => {
    if (!phantom) {
      setState({
        status: "error",
        provider: null,
      });
      return false;
    }

    if (!phantom.solana) {
      setState({
        status: "error",
        provider: null,
      });
      return false;
    }

    try {
      const provider = phantom.solana.getProvider();
      if (provider != null) {
        setState({ status: "success", provider });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }, [phantom]);

  React.useEffect(() => {
    if (!isReady) {
      setState({ status: "loading", provider: null });
      return;
    }

    if (tryResolvingProvider()) {
      return;
    }

    let retryCount = 0;
    const scheduleRetry = () => {
      const delay = BASE_DELAY * Math.pow(2, Math.min(retryCount, 5));

      setTimeout(() => {
        if (tryResolvingProvider()) {
          return;
        }

        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          setState({
            status: "error",
            provider: null,
          });
        } else {
          scheduleRetry();
        }
      }, delay);
    };

    scheduleRetry();
  }, [isReady, tryResolvingProvider]);

  return state;
}
