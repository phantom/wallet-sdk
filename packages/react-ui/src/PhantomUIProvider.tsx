import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  useConnect as useBaseConnect,
  useSolana,
  useEthereum,
  usePhantom,
} from "@phantom/react-sdk";
import type { ParsedSignatureResult, ParsedTransactionResult } from "@phantom/parsers";

export interface PhantomUIProviderProps {
  children: ReactNode;
  theme?: "light" | "dark" | "auto";
  customTheme?: Record<string, string>;
}

// Generic transaction params for UI - supports both Solana and Ethereum
interface UITransactionParams {
  chain: 'solana' | 'ethereum';
  transaction: any; // Generic transaction object
  networkId?: string; // Optional network identifier for display purposes
}

// Generic message params for UI - supports both chains  
interface UIMessageParams {
  chain: 'solana' | 'ethereum';
  message: string | Uint8Array;
  address?: string; // Required for Ethereum, optional for Solana
}

interface ConnectionUIState {
  isVisible: boolean;
  isConnecting: boolean;
  error: Error | null;
  providerType: "injected" | "embedded" | null;
}

interface TransactionUIState {
  isVisible: boolean;
  transaction: UITransactionParams | null;
  isLoading: boolean;
  error: Error | null;
}

interface MessageUIState {
  isVisible: boolean;
  params: UIMessageParams | null;
  isLoading: boolean;
  error: Error | null;
}

interface PhantomUIContextValue {
  // Connection state
  connectionState: ConnectionUIState;
  showConnectionModal: () => void;
  hideConnectionModal: () => void;
  connectWithProvider: (
    providerType: "injected" | "embedded",
    embeddedWalletType?: "app-wallet" | "user-wallet",
  ) => Promise<void>;

  // Transaction state
  transactionState: TransactionUIState;
  showTransactionModal: (params: UITransactionParams) => void;
  signAndSendTransaction: (params: UITransactionParams) => Promise<ParsedTransactionResult>;

  // Message state
  messageState: MessageUIState;
  showMessageModal: (params: UIMessageParams) => void;
  signMessage: (params: UIMessageParams) => Promise<ParsedSignatureResult>;

  // Internal methods for modals
  _internal: {
    approveTransaction: () => void;
    rejectTransaction: () => void;
    approveMessage: () => void;
    rejectMessage: () => void;
  };
}

const PhantomUIContext = createContext<PhantomUIContextValue | null>(null);

export function PhantomUIProvider({ children, theme = "light", customTheme }: PhantomUIProviderProps) {
  const baseConnect = useBaseConnect();
  const solana = useSolana();
  const ethereum = useEthereum();
  const { isPhantomAvailable: _isPhantomAvailable } = usePhantom();

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionUIState>({
    isVisible: false,
    isConnecting: false,
    error: null,
    providerType: null,
  });

  // Transaction state
  const [transactionState, setTransactionState] = useState<TransactionUIState>({
    isVisible: false,
    transaction: null,
    isLoading: false,
    error: null,
  });

  // Message state
  const [messageState, setMessageState] = useState<MessageUIState>({
    isVisible: false,
    params: null,
    isLoading: false,
    error: null,
  });

  // Transaction promise resolver
  const [transactionResolver, setTransactionResolver] = useState<{
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  // Message promise resolver
  const [messageResolver, setMessageResolver] = useState<{
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  // Show connection modal
  const showConnectionModal = useCallback(() => {
    setConnectionState({
      isVisible: true,
      isConnecting: false,
      error: null,
      providerType: null,
    });
  }, []);

  // Hide connection modal
  const hideConnectionModal = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      isVisible: false,
      isConnecting: false,
    }));
  }, []);

  // Connect with specific provider
  const connectWithProvider = useCallback(
    async (providerType: "injected" | "embedded", _embeddedWalletType?: "app-wallet" | "user-wallet") => {
      try {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: true,
          error: null,
          providerType,
        }));

        // Note: In the new architecture, provider type is configured at SDK level
        await baseConnect.connect();

        // Hide modal on successful connection
        hideConnectionModal();
      } catch (error) {
        setConnectionState(prev => ({
          ...prev,
          isConnecting: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [baseConnect, hideConnectionModal],
  );

  // Enhanced sign and send transaction with UI
  const signAndSendTransaction = useCallback(
    async (params: UITransactionParams): Promise<ParsedTransactionResult> => {
      // Show transaction modal
      setTransactionState({
        isVisible: true,
        transaction: params,
        isLoading: false,
        error: null,
      });

      try {
        // Wait for user confirmation
        const confirmed = await new Promise<boolean>((resolve, reject) => {
          setTransactionResolver({ resolve, reject });
        });

        if (!confirmed) {
          throw new Error("Transaction cancelled by user");
        }

        // Set loading state
        setTransactionState(prev => ({ ...prev, isLoading: true }));

        // Execute transaction using chain-specific hooks
        let result: ParsedTransactionResult;
        if (params.chain === 'solana') {
          result = await solana.signAndSendTransaction(params.transaction);
        } else {
          result = await ethereum.sendTransaction(params.transaction);
        }

        // Hide modal on success
        setTransactionState({
          isVisible: false,
          transaction: null,
          isLoading: false,
          error: null,
        });

        return result;
      } catch (error) {
        setTransactionState(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
        throw error;
      } finally {
        setTransactionResolver(null);
      }
    },
    [solana, ethereum],
  );

  // Enhanced sign message with UI
  const signMessage = useCallback(
    async (params: UIMessageParams): Promise<ParsedSignatureResult> => {
      // Show message modal
      setMessageState({
        isVisible: true,
        params,
        isLoading: false,
        error: null,
      });

      try {
        // Wait for user confirmation
        const confirmed = await new Promise<boolean>((resolve, reject) => {
          setMessageResolver({ resolve, reject });
        });

        if (!confirmed) {
          throw new Error("Message signing cancelled by user");
        }

        // Set loading state
        setMessageState(prev => ({ ...prev, isLoading: true }));

        // Execute signing using chain-specific hooks
        let result: ParsedSignatureResult;
        if (params.chain === 'solana') {
          result = await solana.signMessage(params.message);
        } else {
          // For Ethereum, we need an address
          if (!params.address) throw new Error('Address required for Ethereum signing');
          const signature = await ethereum.signPersonalMessage(params.message as string, params.address);
          // Format the raw hex signature into ParsedSignatureResult structure
          result = {
            signature,
            rawSignature: signature,
          };
        }

        // Hide modal on success
        setMessageState({
          isVisible: false,
          params: null,
          isLoading: false,
          error: null,
        });

        return result;
      } catch (error) {
        setMessageState(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
        throw error;
      } finally {
        setMessageResolver(null);
      }
    },
    [solana, ethereum],
  );

  // Internal methods for modals
  const approveTransaction = useCallback(() => {
    if (transactionResolver) {
      transactionResolver.resolve(true);
    }
  }, [transactionResolver]);

  const rejectTransaction = useCallback(() => {
    if (transactionResolver) {
      transactionResolver.resolve(false);
    }
    setTransactionState({
      isVisible: false,
      transaction: null,
      isLoading: false,
      error: null,
    });
  }, [transactionResolver]);

  const approveMessage = useCallback(() => {
    if (messageResolver) {
      messageResolver.resolve(true);
    }
  }, [messageResolver]);

  const rejectMessage = useCallback(() => {
    if (messageResolver) {
      messageResolver.resolve(false);
    }
    setMessageState({
      isVisible: false,
      params: null,
      isLoading: false,
      error: null,
    });
  }, [messageResolver]);

  // Show modal functions
  const showTransactionModal = useCallback((params: UITransactionParams) => {
    setTransactionState({
      isVisible: true,
      transaction: params,
      isLoading: false,
      error: null,
    });
  }, []);

  const showMessageModal = useCallback((params: UIMessageParams) => {
    setMessageState({
      isVisible: true,
      params,
      isLoading: false,
      error: null,
    });
  }, []);

  const contextValue: PhantomUIContextValue = {
    connectionState,
    showConnectionModal,
    hideConnectionModal,
    connectWithProvider,
    transactionState,
    showTransactionModal,
    signAndSendTransaction,
    messageState,
    showMessageModal,
    signMessage,
    _internal: {
      approveTransaction,
      rejectTransaction,
      approveMessage,
      rejectMessage,
    },
  };

  return (
    <PhantomUIContext.Provider value={contextValue}>
      <div data-theme={theme} style={customTheme}>
        {children}
      </div>
    </PhantomUIContext.Provider>
  );
}

export function usePhantomUI() {
  const context = useContext(PhantomUIContext);
  if (!context) {
    throw new Error("usePhantomUI must be used within a PhantomUIProvider");
  }
  return context;
}

// Internal hooks are exported from hooks directory instead to avoid naming conflicts
