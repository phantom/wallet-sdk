import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { SignAndSendTransactionParams } from '../types';
import type { SignedTransaction } from '@phantom/client';

export function useSignAndSendTransaction() {
  const { config, injectedProvider, connection, embeddedClient } = usePhantom();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signAndSendTransaction = useCallback(async (
    params: SignAndSendTransactionParams
  ): Promise<SignedTransaction> => {
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

        const result = await embeddedClient.signAndSendTransaction(
          connection.walletId,
          params.transaction,
          params.networkId
        );

        return result;
      } else if (injectedProvider) {
        // Check network support for injected wallet
        const networkPrefix = params.networkId.split(':')[0].toLowerCase();
        
        if (networkPrefix !== 'solana') {
          throw new Error(`Network ${params.networkId} is not supported for injected wallets yet`);
        }

        // For injected wallets, we need to decode and handle transactions
        // This is not fully implemented yet
        throw new Error('Transaction signing for injected wallets is not yet implemented. Please use embedded wallets.');
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
    signAndSendTransaction,
    isSigning,
    error,
  };
}