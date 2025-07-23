import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';
import { connectEmbeddedWallet } from '../embedded';
import { AddressType } from '@phantom/client';

export interface UseConnectOptions {
  walletId?: string; // For reconnecting to existing embedded wallet
}

export function useConnect() {
  const { config, injectedProvider, setConnection } = usePhantom();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async (_options?: UseConnectOptions) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (config.walletType === 'embedded') {
        if (!config.apiBaseUrl || !config.organizationId || !config.authUrl) {
          throw new Error('apiBaseUrl, organizationId, and authUrl are required for embedded wallets');
        }

        const result = await connectEmbeddedWallet({
          apiBaseUrl: config.apiBaseUrl,
          organizationId: config.organizationId,
          authUrl: config.authUrl,
          embeddedWalletType: config.embeddedWalletType || 'new-wallet',
        });

        setConnection({
          addresses: result.addresses,
          walletId: result.walletId,
          connected: true,
        });
      } else if (injectedProvider) {
        // Use injected provider - only supports Solana for now
        const solanaProvider = injectedProvider.solana;
        if (!solanaProvider) {
          throw new Error('Phantom wallet not found');
        }

        const address = await solanaProvider.connect();
        if (!address) {
          throw new Error('Failed to connect');
        }

        setConnection({
          addresses: [{
            addressType: AddressType.solana,
            address: address,
          }],
          connected: true,
        });
      } else {
        throw new Error('No wallet provider available');
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [config, injectedProvider, setConnection]);

  return {
    connect,
    isConnecting,
    error,
  };
}