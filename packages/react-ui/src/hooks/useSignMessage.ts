import { useCallback } from "react";
// import { useSignMessage as useBaseSignMessage } from "@phantom/react-sdk";
import { usePhantomUI } from "../PhantomUIProvider";
import type { NetworkId } from "@phantom/client";

export interface UseSignMessageResult {
  signMessage: (message: string, networkId: NetworkId) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useSignMessage(): UseSignMessageResult {
  const ui = usePhantomUI();

  const signMessage = useCallback(
    async (message: string, networkId: NetworkId): Promise<string> => {
      return await ui.signMessage(message, networkId);
    },
    [ui],
  );

  return {
    signMessage,
    isLoading: ui.messageState.isLoading,
    error: ui.messageState.error,
  };
}
