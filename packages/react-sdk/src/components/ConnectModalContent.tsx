import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { isMobileDevice, getDeeplinkToPhantom, type AuthProviderType } from "@phantom/browser-sdk";
import { Button, LoginWithPhantomButton } from "./Button";
import { useTheme } from "../hooks/useTheme";
import { usePhantom } from "../PhantomProvider";
import { useIsExtensionInstalled } from "../hooks/useIsExtensionInstalled";
import { useIsPhantomLoginAvailable } from "../hooks/useIsPhantomLoginAvailable";
import { useConnect } from "../hooks/useConnect";

export interface ConnectModalContentProps {
  appIcon?: string;
  appName?: string;
  onClose: () => void;
}

export function ConnectModalContent({ appIcon, appName, onClose }: ConnectModalContentProps) {
  const theme = useTheme();
  const { sdk } = usePhantom();
  const baseConnect = useConnect();
  const isExtensionInstalled = useIsExtensionInstalled();
  const isPhantomLoginAvailable = useIsPhantomLoginAvailable();

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerType, setProviderType] = useState<AuthProviderType | "deeplink" | "injected" | null>(null);

  // Check if this is a mobile device
  const isMobile = useMemo(() => isMobileDevice(), []);

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
        setError(err as Error);
      } finally {
        setIsConnecting(false);
        setProviderType(null);
      }
    },
    [baseConnect, onClose],
  );

  // Connect with injected provider (when extension is installed)
  const connectWithInjected = useCallback(async () => {
    if (!sdk) {
      const err = new Error("SDK not initialized");
      setError(err);
      return;
    }

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
      setError(err as Error);
    } finally {
      setIsConnecting(false);
      setProviderType(null);
    }
  }, [sdk, baseConnect, onClose]);

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
      setError(err as Error);
      setIsConnecting(false);
      setProviderType(null);
    }
  }, [onClose]);

  const appIconStyle: CSSProperties = appIcon
    ? {
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        display: "block",
        margin: "0 auto 24px",
        objectFit: "cover" as const,
      }
    : {};

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

  return (
    <>
      {/* App Icon */}
      {appIcon && <img src={appIcon} alt={appName || "App"} style={appIconStyle} />}

      {/* Body */}
      <div>
        {/* Error Message */}
        {error && <div style={errorStyle}>{error.message}</div>}

        {/* Provider Options */}
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

          {!isMobile && (
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

          <Button
            onClick={() => connectWithAuthProvider("google")}
            disabled={isConnecting}
            isLoading={isConnecting && providerType === "google"}
          >
            Continue with Google
          </Button>

          <Button
            onClick={() => connectWithAuthProvider("apple")}
            disabled={isConnecting}
            isLoading={isConnecting && providerType === "apple"}
          >
            Continue with Apple
          </Button>

          {!isMobile && isExtensionInstalled.isInstalled && (
            <>
              <div style={dividerStyle}>
                <div style={dividerLineStyle} />
                <span style={dividerTextStyle}>OR</span>
                <div style={dividerLineStyle} />
              </div>

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
      </div>
    </>
  );
}
