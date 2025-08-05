import { useState, useCallback } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { SignMessageParams } from '../types';

export function useSignMessage() {
  const { sdk } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signMessage = useCallback(async (params: SignMessageParams): Promise<string> => {
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    setIsSigning(true);
    setError(null);

    try {
      const signature = await sdk.signMessage(params);
      return signature;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsSigning(false);
    }
  }, [sdk]);

  return {
    signMessage,
    isSigning,
    error,
  };
}