import { useCallback } from "react";
// import { useSignMessage as useBaseSignMessage } from "@phantom/react-sdk";
import { usePhantomUI } from "../PhantomUIProvider";
import type { SignMessageParams } from "@phantom/browser-sdk";

export interface UseSignMessageResult {
  signMessage: (params: SignMessageParams) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useSignMessage(): UseSignMessageResult {
  const ui = usePhantomUI();

  const signMessage = useCallback(
    async (params: SignMessageParams): Promise<string> => {
      return await ui.signMessage(params);
    },
    [ui],
  );

  return {
    signMessage,
    isLoading: ui.messageState.isLoading,
    error: ui.messageState.error,
  };
}
