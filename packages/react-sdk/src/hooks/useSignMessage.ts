import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { NetworkId } from '@phantom/browser-sdk';

export interface SignMessageParams {
  message: string; // base64url encoded
  networkId: NetworkId;
}

export function useSignMessage() {
  const { sdk, isConnected } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signMessage = useCallback(async (params: SignMessageParams): Promise<string> => {
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsSigning(true);
    setError(null);

    try {
      const signature = await sdk.signMessage(params.message, params.networkId);
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSigning(false);
    }
  }, [sdk, isConnected]);

  return {
    signMessage,
    isSigning,
    error,
  };
}