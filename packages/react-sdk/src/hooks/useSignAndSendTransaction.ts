import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';
import type { SignAndSendTransactionParams } from '../types';
import type { SignedTransaction } from '@phantom/client';
import { base64urlDecode } from '../utils/base64url';

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

        // For injected wallets, decode the base64url transaction
        const solanaProvider = injectedProvider.solana;
        if (!solanaProvider) {
          throw new Error('Phantom wallet not found');
        }

        // Decode the base64url encoded transaction bytes
        const transactionBytes = base64urlDecode(params.transaction);
        
        let transaction: any;
        try {
          // First, try to deserialize as a VersionedTransaction from @solana/web3.js
          const { VersionedTransaction } = await import('@solana/web3.js');
          transaction = VersionedTransaction.deserialize(transactionBytes);
        } catch (versionedTxError) {
          // If that fails, create a @solana/kit Transaction object
          // This is just a plain object creation, so it shouldn't fail
          transaction = {
            messageBytes: transactionBytes,
            signatures: new Map(), // Empty signatures map as it will be signed by the wallet
          };
        }
        
        // Send the transaction using the Solana provider
        const result = await solanaProvider.signAndSendTransaction(transaction);
        
        // Return in the same format as embedded wallet
        // The signature from the provider is base58
        return {
          rawTransaction: result.signature,
        };
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