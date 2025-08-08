import { useCallback } from "react";
// import { useSignMessage as useBaseSignMessage } from "@phantom/react-sdk";
import { usePhantomUI } from "../PhantomUIProvider";
import type { SignMessageParams, SignMessageResult } from "@phantom/react-sdk";

export interface UseSignMessageResult {
  signMessage: (params: SignMessageParams) => Promise<SignMessageResult>;
  isLoading: boolean;
  error: Error | null;
}

export function useSignMessage(): UseSignMessageResult {
  const ui = usePhantomUI();

  const signMessage = useCallback(
    async (params: SignMessageParams): Promise<SignMessageResult> => {
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
