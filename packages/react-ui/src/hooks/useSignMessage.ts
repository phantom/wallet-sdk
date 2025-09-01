import { useCallback } from "react";
import { usePhantomUI } from "../PhantomUIProvider";
import type { ParsedSignatureResult } from "@phantom/parsers";

// Generic message params that support both Solana and Ethereum
interface SignMessageParams {
  chain: 'solana' | 'ethereum';
  message: string | Uint8Array;
  address?: string; // Required for Ethereum, optional for Solana
}

export interface UseSignMessageResult {
  signMessage: (params: SignMessageParams) => Promise<ParsedSignatureResult>;
  isLoading: boolean;
  error: Error | null;
}

export function useSignMessage(): UseSignMessageResult {
  const ui = usePhantomUI();

  const signMessage = useCallback(
    async (params: SignMessageParams): Promise<ParsedSignatureResult> => {
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
