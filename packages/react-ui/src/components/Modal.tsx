import React, { type CSSProperties } from "react";
import { type PhantomThemeWithAux } from "../themes";
import type { AuthProviderType } from "@phantom/browser-sdk";
import { Button } from "./Button";
import { LoginWithPhantomButton } from "./LoginWithPhantomButton";
export interface ModalProps {
  isVisible: boolean;
  isConnecting: boolean;
  error: Error | null;
  providerType: "injected" | "embedded" | "deeplink" | null;
  theme: PhantomThemeWithAux;
  appIcon?: string;
  appName?: string;
  isMobile: boolean;
  isExtensionInstalled: boolean;
  isPhantomLoginAvailable: boolean;
  onClose: () => void;
  onConnectWithDeeplink: () => void;
  onConnectWithAuthProvider: (provider: AuthProviderType) => void;
  onConnectWithInjected: () => void;
}

export function Modal({
  isVisible,
  isConnecting,
  error,
  providerType,
  theme,
  appIcon,
  appName,
  isMobile,
  isExtensionInstalled,
  isPhantomLoginAvailable,
  onClose,
  onConnectWithDeeplink,
  onConnectWithAuthProvider,
  onConnectWithInjected,
}: ModalProps) {
  if (!isVisible) return null;

  // Styles
  const overlayStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const modalStyle: CSSProperties = {
    backgroundColor: theme.background,
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "400px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    position: "relative" as const,
  };

  const headerStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "24px",
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: "400",
    lineHeight: "17px",
    letterSpacing: "-0.14px",
    color: theme.secondary,
    fontFeatureSettings: '"liga" off, "clig" off',
    textAlign: "center" as const,
  };

  const closeButtonStyle: CSSProperties = {
    position: "absolute" as const,
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: theme.text,
    fontSize: "24px",
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
    transition: "color 0.2s",
  };

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
    color: theme.secondary,
    fontSize: "14px",
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

  const footerStyle: CSSProperties = {
    marginTop: "24px",
    textAlign: "center" as const,
    color: theme.secondary,
    fontSize: "12px",
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
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={titleStyle}>Login or Sign Up</h3>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={e => (e.currentTarget.style.color = theme.secondary)}
            onMouseLeave={e => (e.currentTarget.style.color = theme.text)}
          >
            ×
          </button>
        </div>

        {/* App Icon */}
        {appIcon && <img src={appIcon} alt={appName || "App"} style={appIconStyle} />}

        {/* Body */}
        <div>
          {/* Error Message */}
          {error && <div style={errorStyle}>{error.message}</div>}

          {/* Provider Options */}
          <div style={buttonContainerStyle}>
            {/* Mobile device with no Phantom extension - show deeplink button */}
            {isMobile && !isExtensionInstalled && (
              <Button
                theme={theme}
                onClick={onConnectWithDeeplink}
                disabled={isConnecting}
                isLoading={isConnecting && providerType === "deeplink"}
              >
                {isConnecting && providerType === "deeplink" ? "Opening Phantom..." : "Open in Phantom App"}
              </Button>
            )}

            {!isMobile && (
              <>
                {isPhantomLoginAvailable && (
                  <LoginWithPhantomButton
                    theme={theme}
                    onClick={() => onConnectWithAuthProvider("phantom")}
                    disabled={isConnecting}
                    isLoading={isConnecting && providerType === "embedded"}
                  />
                )}
              </>
            )}

            <Button
              theme={theme}
              onClick={() => onConnectWithAuthProvider("google")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "embedded"}
            >
              Continue with Google
            </Button>

            <Button
              theme={theme}
              onClick={() => onConnectWithAuthProvider("apple")}
              disabled={isConnecting}
              isLoading={isConnecting && providerType === "embedded"}
            >
              Continue with Apple
            </Button>

            {!isMobile && isExtensionInstalled && (
              <>
                <div style={dividerStyle}>
                  <div style={dividerLineStyle} />
                  <span style={dividerTextStyle}>OR</span>
                  <div style={dividerLineStyle} />
                </div>

                <Button
                  theme={theme}
                  variant="secondary"
                  onClick={onConnectWithInjected}
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

        {/* Footer */}
        <div style={footerStyle}>Protected by Phantom</div>
      </div>
    </div>
  );
}
