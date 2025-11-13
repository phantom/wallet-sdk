import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { isMobileDevice, getDeeplinkToPhantom, type AuthProviderType } from "@phantom/browser-sdk";
import { Button, LoginWithPhantomButton, Icon, BoundedIcon, Text, hexToRgba, useTheme } from "@phantom/wallet-sdk-ui";
import { usePhantom } from "../PhantomContext";
import { useIsExtensionInstalled } from "../hooks/useIsExtensionInstalled";
import { useIsPhantomLoginAvailable } from "../hooks/useIsPhantomLoginAvailable";
import { useConnect } from "../hooks/useConnect";

export interface ConnectModalContentProps {
  appIcon?: string;
  appName?: string;
  onClose: () => void;
}

export function ConnectModalContent({ appIcon, appName = "App Name", onClose }: ConnectModalContentProps) {
  const theme = useTheme();
  const { isLoading, allowedProviders } = usePhantom();
  const baseConnect = useConnect();
  const isExtensionInstalled = useIsExtensionInstalled();
  const isPhantomLoginAvailable = useIsPhantomLoginAvailable();
  const isMobile = useMemo(() => isMobileDevice(), []);

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerType, setProviderType] = useState<AuthProviderType | "deeplink" | null>(null);

  const showDivider = !(allowedProviders.length === 1 && allowedProviders.includes("injected"));

  const connectWithAuthProvider = useCallback(
    async (provider: AuthProviderType) => {
      try {
        setIsConnecting(true);
        setError(null);
        setProviderType(provider);

        await baseConnect.connect({ provider });

        onClose();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setIsConnecting(false);
        setProviderType(null);
      }
    },
    [baseConnect, onClose],
  );

  const connectWithDeeplink = useCallback(() => {
    try {
      setIsConnecting(true);
      setError(null);
      setProviderType("deeplink");

      const deeplinkUrl = getDeeplinkToPhantom();
      window.location.href = deeplinkUrl;

      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsConnecting(false);
      setProviderType(null);
    }
  }, [onClose]);

  const appIconStyle: CSSProperties = {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    display: "block",
    objectFit: "cover" as const,
  };

  const buttonContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "12px",
    width: "100%",
  };

  const socialButtonRowStyle: CSSProperties = {
    display: "flex",
    gap: "12px",
    width: "100%",
  };

  const dividerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    margin: "24px 0",
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

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {appIcon && <img src={appIcon} alt={appName} style={appIconStyle} />}

      {error && <div style={errorStyle}>{error.message}</div>}

      {isLoading ? (
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle} />
          <Text variant="label" color={theme.secondary}>
            Loading...
          </Text>
        </div>
      ) : (
        <div style={buttonContainerStyle}>
          {/* Mobile device with no Phantom extension - show deeplink button */}
          {isMobile && !isExtensionInstalled.isInstalled && (
            <Button
              onClick={connectWithDeeplink}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "deeplink"}
              fullWidth={true}
            >
              {isConnecting && providerType === "deeplink" ? "Opening Phantom..." : "Open in Phantom App"}
            </Button>
          )}

          {/* Desktop Phantom Login button */}
          {!isMobile && allowedProviders.includes("phantom") && isPhantomLoginAvailable.isAvailable && (
            <LoginWithPhantomButton
              onClick={() => connectWithAuthProvider("phantom")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "phantom"}
            />
          )}

          {/* Google and Apple in a row */}
          {(allowedProviders.includes("google") || allowedProviders.includes("apple")) && (
            <div style={socialButtonRowStyle}>
              {allowedProviders.includes("google") && (
                <Button
                  onClick={() => connectWithAuthProvider("google")}
                  disabled={isConnecting}
                  isLoading={isConnecting && providerType === "google"}
                  fullWidth={true}
                  centered={allowedProviders.includes("apple")}
                >
                  <Icon type="google" size={20} />
                  {!allowedProviders.includes("apple") && <Text variant="captionBold">Continue with Google</Text>}
                </Button>
              )}

              {allowedProviders.includes("apple") && (
                <Button
                  onClick={() => connectWithAuthProvider("apple")}
                  disabled={isConnecting}
                  isLoading={isConnecting && providerType === "apple"}
                  fullWidth={true}
                  centered={allowedProviders.includes("google")}
                >
                  <Icon type="apple" size={20} />
                  {!allowedProviders.includes("google") && <Text variant="captionBold">Continue with Apple</Text>}
                </Button>
              )}
            </div>
          )}

          {/* Injected provider button */}
          {!isMobile && allowedProviders.includes("injected") && isExtensionInstalled.isInstalled && (
            <>
              {showDivider && (
                <div style={dividerStyle}>
                  <div style={dividerLineStyle} />
                  <span style={dividerTextStyle}>OR</span>
                  <div style={dividerLineStyle} />
                </div>
              )}

              <Button
                onClick={() => connectWithAuthProvider("injected")}
                disabled={isConnecting}
                isLoading={isConnecting && providerType === "injected"}
                fullWidth={true}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <BoundedIcon type="phantom" size={20} background="#AB9FF2" color="white" />
                    <Text variant="captionBold">Phantom</Text>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Text variant="label" color={theme.secondary}>
                      Detected
                    </Text>
                    <Icon type="chevron-right" size={16} />
                  </span>
                </span>
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
