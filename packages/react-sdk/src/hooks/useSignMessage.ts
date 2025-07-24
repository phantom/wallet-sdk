import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { SignMessageParams } from '../types';
import { base64urlDecodeToString, base64urlEncode } from '../utils/base64url';

export function useSignMessage() {
  const { config, injectedProvider, connection, embeddedClient } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signMessage = useCallback(async (params: SignMessageParams): Promise<string> => {
    setIsSigning(true);
    setError(null);

    try {
      if (!connection || !connection.connected) {
        throw new Error('Wallet not connected');
      }

      if (config.walletType === 'embedded') {
        // Use embedded client
        if (!embeddedClient) {
          throw new Error('Client not initialized');
        }

        if (!connection.walletId) {
          throw new Error('No wallet ID found');
        }

        const signature = await embeddedClient.signMessage(
          connection.walletId,
          params.message,
          params.networkId
        );

        return signature;
      } else if (injectedProvider) {
        // Check network support for injected wallet
        const networkPrefix = params.networkId.split(':')[0].toLowerCase();
        
        if (networkPrefix !== 'solana') {
          throw new Error(`Network ${params.networkId} is not supported for injected wallets yet`);
        }

        const solanaProvider = injectedProvider.solana;
        if (!solanaProvider) {
          throw new Error('Phantom wallet not found');
        }

        // Decode base64url message for injected wallet
        const decodedMessage = base64urlDecodeToString(params.message);

        // Sign with injected wallet
        const { signature } = await solanaProvider.signMessage(
          new TextEncoder().encode(decodedMessage)
        );

        // Return base64url encoded signature
        return base64urlEncode(signature);
      } else {
        throw new Error('No wallet provider available');
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSigning(false);
    }
  }, [config, injectedProvider, connection, embeddedClient]);

  return {
    signMessage,
    isSigning,
    error,
  };
}