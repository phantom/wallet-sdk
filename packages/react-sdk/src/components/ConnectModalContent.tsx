import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { isMobileDevice, getDeeplinkToPhantom, type AuthProviderType } from "@phantom/browser-sdk";
import { Button, LoginWithPhantomButton } from "./Button";
import { useTheme } from "../hooks/useTheme";
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

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerType, setProviderType] = useState<AuthProviderType | "deeplink" | "injected" | null>(null);

  const isMobile = useMemo(() => isMobileDevice(), []);

  const showDivider = !(allowedProviders.length === 1 && allowedProviders.includes("injected"));

  // Connect with specific auth provider
  const connectWithAuthProvider = useCallback(
    async (provider: AuthProviderType) => {
      try {
        setIsConnecting(true);
        setError(null);
        setProviderType(provider);

        await baseConnect.connect({ provider });

        // Hide modal on successful connection
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

  // Connect with injected provider (when extension is installed)
  const connectWithInjected = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setProviderType("injected");

      await baseConnect.connect({
        provider: "injected",
      });

      // Hide modal on successful connection
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsConnecting(false);
      setProviderType(null);
    }
  }, [baseConnect, onClose]);

  // Connect with deeplink (redirect to Phantom mobile app)
  const connectWithDeeplink = useCallback(() => {
    try {
      setIsConnecting(true);
      setError(null);
      setProviderType("deeplink");

      // Generate and redirect to deeplink URL
      const deeplinkUrl = getDeeplinkToPhantom();
      window.location.href = deeplinkUrl;

      // This code will likely never be reached due to the redirect
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
    margin: "0 auto 24px",
    objectFit: "cover" as const,
  };
  const buttonContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  };

  const dividerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    margin: "24px 0",
    ...theme.typography.caption,
    color: theme.secondary,
    textTransform: "uppercase" as const,
  };

  const dividerLineStyle: CSSProperties = {
    flex: 1,
    height: "1px",
    backgroundColor: theme.secondary,
  };

  const dividerTextStyle: CSSProperties = {
    padding: "0 12px",
  };

  const errorStyle: CSSProperties = {
    backgroundColor: "rgba(220, 53, 69, 0.1)",
    color: "#ff6b6b",
    border: "1px solid rgba(220, 53, 69, 0.3)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px",
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

  const loadingTextStyle: CSSProperties = {
    ...theme.typography.caption,
    color: theme.secondary,
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

      <div>
        {error && <div style={errorStyle}>{error.message}</div>}

        {isLoading ? (
          <div style={loadingContainerStyle}>
            <div style={spinnerStyle} />
            <div style={loadingTextStyle}>Loading...</div>
          </div>
        ) : (
          <div style={buttonContainerStyle}>
            {/* Mobile device with no Phantom extension - show deeplink button */}
            {isMobile && !isExtensionInstalled.isInstalled && (
              <Button
                onClick={connectWithDeeplink}
                disabled={isConnecting}
                isLoading={isConnecting && providerType === "deeplink"}
              >
                {isConnecting && providerType === "deeplink" ? "Opening Phantom..." : "Open in Phantom App"}
              </Button>
            )}

            {/* Desktop Phantom Login button - only show if allowed */}
            {!isMobile && allowedProviders.includes("phantom") && (
              <>
                {isPhantomLoginAvailable.isAvailable && (
                  <LoginWithPhantomButton
                    onClick={() => connectWithAuthProvider("phantom")}
                    disabled={isConnecting}
                    isLoading={isConnecting && providerType === "phantom"}
                  />
                )}
              </>
            )}

            {/* Google button - only show if allowed */}
            {allowedProviders.includes("google") && (
              <Button
                onClick={() => connectWithAuthProvider("google")}
                disabled={isConnecting}
                isLoading={isConnecting && providerType === "google"}
              >
                Continue with Google
              </Button>
            )}

            {/* Apple button - only show if allowed */}
            {allowedProviders.includes("apple") && (
              <Button
                onClick={() => connectWithAuthProvider("apple")}
                disabled={isConnecting}
                isLoading={isConnecting && providerType === "apple"}
              >
                Continue with Apple
              </Button>
            )}

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
                  variant="secondary"
                  onClick={connectWithInjected}
                  disabled={isConnecting}
                  isLoading={isConnecting && providerType === "injected"}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>Phantom</span>
                  </span>
                  <span style={{ color: theme.secondary }}>Detected</span>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
