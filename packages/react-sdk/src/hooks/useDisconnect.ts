import { useCallback, useState } from 'react';
import { usePhantom } from '../PhantomProvider';
import { disconnectEmbeddedWallet } from '../embedded';

export function useDisconnect() {
  const { config, injectedProvider, setConnection } = usePhantom();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      if (config.walletType === 'embedded') {
        await disconnectEmbeddedWallet();
        setConnection(null);
      } else if (injectedProvider) {
        // Use injected provider
        const solanaProvider = injectedProvider.solana;
        if (solanaProvider && solanaProvider.disconnect) {
          await solanaProvider.disconnect();
        }
        setConnection(null);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsDisconnecting(false);
    }
  }, [config, injectedProvider, setConnection]);

  return {
    disconnect,
    isDisconnecting,
    error,
  };
}