import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { isMobileDevice, type AuthProviderType, type InjectedWalletInfo } from "@phantom/browser-sdk";
import {
  Button,
  LoginWithPhantomButton,
  Icon,
  BoundedIcon,
  Text,
  hexToRgba,
  useTheme,
  ModalHeader,
} from "@phantom/wallet-sdk-ui";
import { getProviderName } from "@phantom/constants";
import { usePhantom } from "../PhantomContext";
import { useIsExtensionInstalled } from "../hooks/useIsExtensionInstalled";
import { useIsPhantomLoginAvailable } from "../hooks/useIsPhantomLoginAvailable";
import { useConnect } from "../hooks/useConnect";
import { useDiscoveredWallets } from "../hooks/useDiscoveredWallets";
import { ChainIcon } from "./ChainIcon";

export interface ConnectModalContentProps {
  appIcon?: string;
  appName?: string;
  onClose: () => void;
  hideCloseButton?: boolean;
}

export function ConnectModalContent({
  appIcon,
  appName = "App Name",
  onClose,
  hideCloseButton = false,
}: ConnectModalContentProps) {
  const theme = useTheme();
  const { isLoading, allowedProviders } = usePhantom();
  const baseConnect = useConnect();
  const isExtensionInstalled = useIsExtensionInstalled();
  const isPhantomLoginAvailable = useIsPhantomLoginAvailable();
  const isMobile = useMemo(() => isMobileDevice(), []);
  const { wallets: discoveredWallets } = useDiscoveredWallets();

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerType, setProviderType] = useState<AuthProviderType | "deeplink" | null>(null);
  const [showOtherWallets, setShowOtherWallets] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  // Handle auth callback states - prioritize baseConnect states for auth flow
  const isConnectingState = baseConnect.isConnecting || isConnecting;
  const errorState = baseConnect.error ? baseConnect.error.message : error;

  const showDivider = !(allowedProviders.length === 1 && allowedProviders.includes("injected"));

  const shouldShowOtherWalletsButton = discoveredWallets.length > 2;
  const walletsToShowInline = shouldShowOtherWalletsButton ? [] : discoveredWallets;

  const connectWithAuthProvider = useCallback(
    async (provider: AuthProviderType, walletId?: string) => {
      try {
        setIsConnecting(true);
        setError(null);
        setProviderType(provider);
        setSelectedWalletId(walletId || null);

        await baseConnect.connect({ provider, walletId });

        onClose();
      } catch {
        const wallet = discoveredWallets.find(w => w.id === walletId);
        const providerName = wallet?.name || getProviderName(provider);
        setError(`Failed to connect to ${providerName}`);
      } finally {
        setIsConnecting(false);
        setProviderType(null);
        setSelectedWalletId(null);
      }
    },
    [baseConnect, discoveredWallets, onClose],
  );

  const connectWithWallet = useCallback(
    async (wallet: InjectedWalletInfo) => {
      await connectWithAuthProvider("injected", wallet.id);
    },
    [connectWithAuthProvider],
  );

  const connectWithDeeplink = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setProviderType("deeplink");

      await baseConnect.connect({ provider: "deeplink" });

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to open deeplink";
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
      setProviderType(null);
    }
  }, [baseConnect, onClose]);

  const appIconStyle: CSSProperties = {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    display: "block",
    objectFit: "cover" as const,
    marginBottom: "12px",
  };

  const connectContentContainerStyle: CSSProperties = {
    transition: "opacity 0.15s ease-in-out, transform 0.15s ease-in-out",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "12px",
    padding: "0 32px",
  };

  const otherWalletsContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "12px",
    maxHeight: "480px",
    overflowY: "auto" as const,
    padding: "0 32px 32px 32px",
    transition: "opacity 0.15s ease-in-out, transform 0.15s ease-in-out",
  };

  const dividerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    margin: "12px 0",
    ...theme.typography.caption,
    color: theme.secondary,
    textTransform: "uppercase" as const,
  };

  const dividerLineStyle: CSSProperties = {
    flex: 1,
    height: "1px",
    backgroundColor: hexToRgba(theme.secondary, 0.1),
  };

  const dividerTextStyle: CSSProperties = {
    padding: "0 12px",
  };

  const errorStyle: CSSProperties = {
    backgroundColor: "rgba(220, 53, 69, 0.1)",
    color: "#ff6b6b",
    border: "1px solid rgba(220, 53, 69, 0.3)",
    borderRadius: theme.borderRadius,
    boxSizing: "border-box" as const,
    padding: "12px",
    width: "100%",
    fontSize: "14px",
  };

  const loadingContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    gap: "12px",
  };

  const spinnerStyle: CSSProperties = {
    width: "40px",
    height: "40px",
    border: `3px solid ${theme.secondary}`,
    borderTop: `3px solid ${theme.brand}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  const walletIconStyle: CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    objectFit: "cover" as const,
  };

  const walletButtonContentStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    width: "100%",
  };

  const walletButtonLeftStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
  };

  const walletNameContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
  };

  const chainIndicatorsStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const walletButtonRightStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: theme.secondary,
  };

  const footerStyle: CSSProperties = {
    display: "flex",
    padding: "16px",
    justifyContent: "center",
    alignItems: "center",
    gap: "4px",
    borderTop: "1px solid rgba(152, 151, 156, 0.10)",
    ...theme.typography.caption,
    color: theme.secondary,
  };

  const contentWrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "24px",
  };

  return (
    <div style={contentWrapperStyle}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {isLoading || baseConnect.isConnecting ? (
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle} />
          <Text variant="label" color={theme.secondary}>
            Loading...
          </Text>
        </div>
      ) : showOtherWallets ? (
        <>
          <ModalHeader
            goBack={true}
            onGoBack={() => {
              setError(null);
              setShowOtherWallets(false);
            }}
            title="Other Wallets"
            onClose={onClose}
            hideCloseButton={hideCloseButton}
          />

          <div style={otherWalletsContainerStyle}>
            {errorState && <div style={errorStyle}>{errorState}</div>}

            {discoveredWallets.map(wallet => (
              <Button
                key={wallet.id}
                onClick={() => connectWithWallet(wallet)}
                disabled={isConnectingState}
                isLoading={isConnectingState && providerType === "injected" && selectedWalletId === wallet.id}
                fullWidth={true}
              >
                <span style={walletButtonContentStyle}>
                  <span style={walletButtonLeftStyle}>
                    {wallet.id === "phantom" ? (
                      <BoundedIcon type="phantom" size={20} background={"#aba0f2"} color={"white"} />
                    ) : wallet.icon ? (
                      <img src={wallet.icon} alt={wallet.name} style={walletIconStyle} />
                    ) : (
                      <BoundedIcon type="wallet" size={20} background={theme.aux} color={theme.text} />
                    )}
                    <span style={walletNameContainerStyle}>
                      <Text variant="captionBold">{wallet.name}</Text>
                    </span>
                  </span>
                  <span style={walletButtonRightStyle}>
                    {wallet.addressTypes && wallet.addressTypes.length > 0 && (
                      <span style={chainIndicatorsStyle}>
                        {wallet.addressTypes.map(addressType => (
                          <span key={`${wallet.id}-chain-${addressType}`}>
                            <ChainIcon addressType={addressType} size={8} />
                          </span>
                        ))}
                      </span>
                    )}
                    <Icon type="chevron-right" size={16} color={theme.secondary} />
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <ModalHeader title="Login or Sign Up" onClose={onClose} hideCloseButton={hideCloseButton} />

          <div style={connectContentContainerStyle}>
            {appIcon && <img src={appIcon} alt={appName} style={appIconStyle} />}

            {errorState && <div style={errorStyle}>{errorState}</div>}

            {/* Mobile device with no Phantom extension - show deeplink button */}
            {isMobile && !isExtensionInstalled.isInstalled && allowedProviders.includes("deeplink") && (
              <LoginWithPhantomButton
                testId="deeplink-button"
                onClick={connectWithDeeplink}
                disabled={isConnectingState}
                isLoading={isConnectingState && providerType === "deeplink"}
                fullWidth={true}
              >
                {isConnecting && providerType === "deeplink" ? "Opening Phantom..." : "Open in Phantom App"}
              </LoginWithPhantomButton>
            )}

            {/* Desktop Phantom Login button */}
            {!isMobile && allowedProviders.includes("phantom") && isPhantomLoginAvailable.isAvailable && (
              <LoginWithPhantomButton
                testId="login-with-phantom-button"
                onClick={() => connectWithAuthProvider("phantom")}
                disabled={isConnectingState}
                isLoading={isConnectingState && providerType === "phantom"}
              />
            )}

            {/* Google and Apple buttons */}
            {/* Hide Google login on mobile when extension is detected (webview doesn't support it) */}
            {allowedProviders.includes("google") && !(isMobile && isExtensionInstalled.isInstalled) && (
              <Button
                onClick={() => connectWithAuthProvider("google")}
                disabled={isConnectingState}
                isLoading={isConnectingState && providerType === "google"}
                fullWidth={true}
              >
                <span style={walletButtonContentStyle}>
                  <span style={walletButtonLeftStyle}>
                    <Icon type="google" size={20} />
                    <Text variant="captionBold">Continue with Google</Text>
                  </span>
                  <span style={walletButtonRightStyle}>
                    <Icon type="chevron-right" size={16} color={theme.secondary} />
                  </span>
                </span>
              </Button>
            )}

            {allowedProviders.includes("apple") && (
              <Button
                onClick={() => connectWithAuthProvider("apple")}
                disabled={isConnectingState}
                isLoading={isConnectingState && providerType === "apple"}
                fullWidth={true}
              >
                <span style={walletButtonContentStyle}>
                  <span style={walletButtonLeftStyle}>
                    <Icon type="apple" size={20} />
                    <Text variant="captionBold">Continue with Apple</Text>
                  </span>
                  <span style={walletButtonRightStyle}>
                    <Icon type="chevron-right" size={16} color={theme.secondary} />
                  </span>
                </span>
              </Button>
            )}

            {/* Injected provider section */}
            {/* Show on desktop OR on mobile when extension is detected (Phantom app webview) */}
            {allowedProviders.includes("injected") &&
              (isExtensionInstalled.isInstalled || discoveredWallets.length > 0) &&
              (!isMobile || isExtensionInstalled.isInstalled) && (
                <>
                  {showDivider && (
                    <div style={dividerStyle}>
                      <div style={dividerLineStyle} />
                      <span style={dividerTextStyle}>OR</span>
                      <div style={dividerLineStyle} />
                    </div>
                  )}

                  {/* Inline wallets (2 or fewer) */}
                  {walletsToShowInline.map(wallet => (
                    <Button
                      key={wallet.id}
                      onClick={() => connectWithWallet(wallet)}
                      disabled={isConnectingState}
                      isLoading={isConnectingState && providerType === "injected" && selectedWalletId === wallet.id}
                      fullWidth={true}
                    >
                      <span style={walletButtonContentStyle}>
                        <span style={walletButtonLeftStyle}>
                          {wallet.id === "phantom" ? (
                            <BoundedIcon type="phantom" size={20} background={"#aba0f2"} color={"white"} />
                          ) : wallet.icon ? (
                            <img src={wallet.icon} alt={wallet.name} style={walletIconStyle} />
                          ) : (
                            <BoundedIcon type="wallet" size={10} background={theme.aux} color={theme.text} />
                          )}
                          <span style={walletNameContainerStyle}>
                            <Text variant="captionBold">{wallet.name}</Text>
                          </span>
                        </span>
                        <span style={walletButtonRightStyle}>
                          {wallet.addressTypes && wallet.addressTypes.length > 0 && (
                            <span style={chainIndicatorsStyle}>
                              {wallet.addressTypes.map(addressType => (
                                <span key={`${wallet.id}-chain-${addressType}`}>
                                  <ChainIcon addressType={addressType} size={8} />
                                </span>
                              ))}
                            </span>
                          )}
                          <Icon type="chevron-right" size={16} color={theme.secondary} />
                        </span>
                      </span>
                    </Button>
                  ))}

                  {/* Other Wallets button (if more than 2 wallets) */}
                  {shouldShowOtherWalletsButton && (
                    <Button onClick={() => setShowOtherWallets(true)} disabled={isConnectingState} fullWidth={true}>
                      <span style={walletButtonContentStyle}>
                        <span style={walletButtonLeftStyle}>
                          <BoundedIcon type="wallet" size={20} background={theme.aux} color={theme.text} />
                          <Text variant="captionBold">Other Wallets</Text>
                        </span>
                        <span style={walletButtonRightStyle}>
                          <Icon type="chevron-right" size={16} color={theme.secondary} />
                        </span>
                      </span>
                    </Button>
                  )}
                </>
              )}
          </div>

          {/* Footer - only on main connection screen */}
          <div style={footerStyle}>
            <Text variant="label" color={theme.secondary}>
              Powered by
            </Text>
            <Icon type="phantom" size={16} />
            <Text variant="label" color={theme.secondary}>
              Phantom
            </Text>
          </div>
        </>
      )}
    </div>
  );
}
