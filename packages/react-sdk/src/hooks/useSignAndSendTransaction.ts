import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { NetworkId, SignedTransaction } from '@phantom/browser-sdk';

export interface SignAndSendTransactionParams {
  transaction: string; // base64url encoded
  networkId: NetworkId;
}

export function useSignAndSendTransaction() {
  const { sdk, isConnected } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signAndSendTransaction = useCallback(async (
    params: SignAndSendTransactionParams
  ): Promise<SignedTransaction> => {
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsSigning(true);
    setError(null);

    try {
      const result = await sdk.signAndSendTransaction(params.transaction, params.networkId);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSigning(false);
    }
  }, [sdk, isConnected]);

  return {
    signAndSendTransaction,
    isSigning,
    error,
  };
}