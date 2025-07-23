import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import type { PhantomClient } from '@phantom/client';
import type { Phantom} from '@phantom/browser-injected-sdk';
import { createPhantom } from '@phantom/browser-injected-sdk';
import { createSolanaPlugin } from '@phantom/browser-injected-sdk/solana';
import type { PhantomSDKConfig, WalletConnection } from './types';
import { getEmbeddedWalletClient } from './embedded';

interface PhantomContextValue {
  config: PhantomSDKConfig;
  injectedProvider?: Phantom;
  embeddedClient?: PhantomClient | null;
  connection: WalletConnection | null;
  setConnection: (connection: WalletConnection | null) => void;
  isReady: boolean;
}

const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
}

export function PhantomProvider({ children, config }: PhantomProviderProps) {
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [injectedProvider, setInjectedProvider] = useState<Phantom | undefined>();
  const [embeddedClient, setEmbeddedClient] = useState<PhantomClient | null | undefined>();

  useEffect(() => {
    const initialize = async () => {
      if (config.walletType === 'embedded') {
        // Try to restore existing session
        if (config.apiBaseUrl) {
          const client = await getEmbeddedWalletClient(config.apiBaseUrl);
          setEmbeddedClient(client);
        }
        setIsReady(true);
      } else {
        // Default to injected wallet
        const phantom = createPhantom({
          plugins: [createSolanaPlugin()],
        });
        setInjectedProvider(phantom);
        setIsReady(true);
      }
    };

    initialize();
  }, [config]);

  // Update embedded client when connection changes
  useEffect(() => {
    if (config.walletType === 'embedded' && connection && config.apiBaseUrl) {
      getEmbeddedWalletClient(config.apiBaseUrl).then(setEmbeddedClient);
    }
  }, [connection, config]);

  const value: PhantomContextValue = {
    config,
    injectedProvider,
    embeddedClient,
    connection,
    setConnection,
    isReady,
  };

  return <PhantomContext.Provider value={value}>{children}</PhantomContext.Provider>;
}

export function usePhantom() {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error('usePhantom must be used within a PhantomProvider');
  }
  return context;
}