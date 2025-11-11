import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { BrowserSDK } from "@phantom/browser-sdk";
import type {
  BrowserSDKConfig,
  WalletAddress,
  AuthOptions,
  DebugConfig,
  ConnectEventData,
  ConnectResult,
} from "@phantom/browser-sdk";
import { Modal } from "./components/Modal";
import { mergeTheme, type PhantomTheme, type CompletePhantomTheme } from "./themes";

export type PhantomSDKConfig = BrowserSDKConfig;

export interface PhantomDebugConfig extends DebugConfig {}

export interface ConnectOptions {
  providerType?: "injected" | "embedded";
  embeddedWalletType?: "app-wallet" | "user-wallet";
  authOptions?: AuthOptions;
}

interface PhantomContextValue {
  sdk: BrowserSDK | null;
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  connectError: Error | null;
  addresses: WalletAddress[];
  currentProviderType: "injected" | "embedded" | null;
  isClient: boolean;
  user: ConnectResult | null;
  theme?: CompletePhantomTheme;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const PhantomContext = createContext<PhantomContextValue | undefined>(undefined);

export interface PhantomProviderProps {
  children: ReactNode;
  config: PhantomSDKConfig;
  debugConfig?: PhantomDebugConfig;
  theme?: Partial<PhantomTheme>;
  appIcon?: string;
  appName?: string;
}

export function PhantomProvider({ children, config, debugConfig, theme, appIcon, appName }: PhantomProviderProps) {
  // Memoized config to avoid unnecessary SDK recreation
  const memoizedConfig: BrowserSDKConfig = useMemo(() => config, [config]);

  // Memoized theme
  const resolvedTheme = useMemo(() => (theme ? mergeTheme(theme) : undefined), [theme]);

  const [sdk, setSdk] = useState<BrowserSDK | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectError, setConnectError] = useState<Error | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [currentProviderType, setCurrentProviderType] = useState<"injected" | "embedded" | null>(
    (memoizedConfig.providerType as any) || null,
  );
  const [user, setUser] = useState<ConnectResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal control functions
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Initialize client flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create SDK only on client side
  useEffect(() => {
    if (!isClient) return;

    const sdkInstance = new BrowserSDK(memoizedConfig);
    setSdk(sdkInstance);

    // No cleanup - let the SDK persist across page navigations
    // The SDK manages its own state and should only disconnect when explicitly called
  }, [isClient, memoizedConfig]);

  // Event listener management - only when SDK exists
  useEffect(() => {
    if (!sdk) return;
    // Event handlers that need to be referenced for cleanup
    const handleConnectStart = () => {
      setIsConnecting(true);
      setConnectError(null);
    };

    const handleConnect = async (data: ConnectEventData) => {
      try {
        setIsConnected(true);
        setIsConnecting(false);

        // Store the full ConnectResult as user
        setUser(data);

        // Update current provider type from event data
        setCurrentProviderType(data.providerType || null);

        const addrs = await sdk.getAddresses();
        setAddresses(addrs);
      } catch (err) {
        console.error("Error connecting:", err);

        // Call disconnect to reset state if an error occurs
        try {
          await sdk.disconnect();
        } catch (err) {
          console.error("Error disconnecting:", err);
        }
      }
    };

    const handleConnectError = (errorData: any) => {
      setIsConnecting(false);
      setIsConnected(false);
      setConnectError(new Error(errorData.error || "Connection failed"));
      setAddresses([]);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectError(null);
      setAddresses([]);
      setUser(null);
    };

    // Add event listeners to SDK
    sdk.on("connect_start", handleConnectStart);
    sdk.on("connect", handleConnect);
    sdk.on("connect_error", handleConnectError);
    sdk.on("disconnect", handleDisconnect);

    // Cleanup function to remove event listeners when SDK changes or component unmounts
    return () => {
      sdk.off("connect_start", handleConnectStart);
      sdk.off("connect", handleConnect);
      sdk.off("connect_error", handleConnectError);
      sdk.off("disconnect", handleDisconnect);
    };
  }, [sdk]);

  // Handle debug configuration changes separately to avoid SDK reinstantiation
  useEffect(() => {
    if (!debugConfig || !sdk) return;

    sdk.configureDebug(debugConfig);
  }, [sdk, debugConfig]);

  // Initialize connection state and auto-connect - only on client side
  useEffect(() => {
    // Skip initialization if not on client or SDK not ready
    if (!isClient || !sdk) return;

    const initialize = async () => {
      // Attempt auto-connect (it handles extension detection internally)
      try {
        await sdk.autoConnect();
      } catch (error) {
        // Silent fail - auto-connect shouldn't break the app
        console.error("Auto-connect error:", error);
      }

      // Mark SDK as done loading after initialization complete
      setIsLoading(false);
    };

    initialize();
  }, [sdk, isClient]);

  // Memoize context value to prevent unnecessary re-renders
  const value: PhantomContextValue = useMemo(
    () => ({
      sdk,
      isConnected,
      isConnecting,
      isLoading,
      connectError,
      addresses,
      currentProviderType,
      isClient,
      user,
      theme: resolvedTheme,
      isModalOpen,
      openModal,
      closeModal,
    }),
    [
      sdk,
      isConnected,
      isConnecting,
      isLoading,
      connectError,
      addresses,
      currentProviderType,
      isClient,
      user,
      resolvedTheme,
      isModalOpen,
      openModal,
      closeModal,
    ],
  );

  return (
    <PhantomContext.Provider value={value}>
      {children}
      {resolvedTheme && <Modal isVisible={isModalOpen} onClose={closeModal} appIcon={appIcon} appName={appName} />}
    </PhantomContext.Provider>
  );
}

export function usePhantom() {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error("usePhantom must be used within a PhantomProvider");
  }
  return context;
}
