import React, { type CSSProperties } from "react";
import type { PhantomTheme } from "../themes";
import type { AuthOptions } from "@phantom/browser-sdk";
export interface ModalProps {
  isVisible: boolean;
  isConnecting: boolean;
  error: Error | null;
  providerType: "injected" | "embedded" | "deeplink" | null;
  theme: PhantomTheme;
  appIcon?: string;
  appName?: string;
  isMobile: boolean;
  isExtensionInstalled: boolean;
  isPhantomLoginAvailable: boolean;
  onClose: () => void;
  onConnectWithDeeplink: () => void;
  onConnectWithAuthProvider: (provider?: AuthOptions["provider"]) => void;
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

  // Helper function to convert hex color to rgba
  const hexToRgba = (hex: string, opacity: number): string => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Parse hex values
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Styles
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  };

  const modalStyle: CSSProperties = {
    backgroundColor: theme.background,
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    position: 'relative' as const,
  };

  const headerStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '24px',
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: '17px',
    letterSpacing: '-0.14px',
    color: theme.secondary,
    fontFeatureSettings: '"liga" off, "clig" off',
    textAlign: 'center' as const,
  };

  const closeButtonStyle: CSSProperties = {
    position: 'absolute' as const,
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: theme.text,
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
    transition: 'color 0.2s',
  };

  const appIconStyle: CSSProperties = appIcon ? {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'block',
    margin: '0 auto 24px',
    objectFit: 'cover' as const,
  } : {};

  const buttonStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: hexToRgba(theme.secondary, 0.10), // Secondary with 10% opacity
    color: theme.text,
    border: 'none',
    borderRadius: theme.borderRadius,
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const secondaryButtonStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: theme.text,
    border: `1px solid ${theme.secondary}`,
    borderRadius: theme.borderRadius,
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  };

  const buttonContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  };

  const dividerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    color: theme.secondary,
    fontSize: '14px',
    textTransform: 'uppercase' as const,
  };

  const dividerLineStyle: CSSProperties = {
    flex: 1,
    height: '1px',
    backgroundColor: theme.secondary,
  };

  const dividerTextStyle: CSSProperties = {
    padding: '0 12px',
  };

  const footerStyle: CSSProperties = {
    marginTop: '24px',
    textAlign: 'center' as const,
    color: theme.secondary,
    fontSize: '12px',
  };

  const errorStyle: CSSProperties = {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    color: '#ff6b6b',
    border: '1px solid rgba(220, 53, 69, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
    fontSize: '14px',
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
            onMouseEnter={(e) => e.currentTarget.style.color = theme.secondary}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.text}
          >
            ×
          </button>
        </div>

        {/* App Icon */}
        {appIcon && (
          <img
            src={appIcon}
            alt={appName || 'App'}
            style={appIconStyle}
          />
        )}

        {/* Body */}
        <div>
          {/* Error Message */}
          {error && (
            <div style={errorStyle}>
              {error.message}
            </div>
          )}

          {/* Provider Options */}
          <div style={buttonContainerStyle}>
            {/* Mobile device with no Phantom extension - show deeplink button */}
            {isMobile && !isExtensionInstalled && (
              <button
                style={buttonStyle}
                onClick={onConnectWithDeeplink}
                disabled={isConnecting}
                onMouseEnter={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.15);
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.10);
                }}
              >
                {isConnecting && providerType === "deeplink"
                  ? "Opening Phantom..."
                  : "Open in Phantom App"}
              </button>
            )}

            {!isMobile && (
              <>
                {isPhantomLoginAvailable && (
                  <button
                    style={buttonStyle}
                    onClick={() => onConnectWithAuthProvider("phantom")}
                    disabled={isConnecting}
                    onMouseEnter={(e) => {
                      if (!isConnecting) {
                        e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.15);
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.10);
                    }}
                  >
                    {isConnecting && providerType === "embedded"
                      ? "Connecting..."
                      : "Login with Phantom"}
                  </button>
                )}
              </>
            )}

            <button
              style={buttonStyle}
              onClick={() => onConnectWithAuthProvider("google")}
              disabled={isConnecting}
              onMouseEnter={(e) => {
                if (!isConnecting) {
                  e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.15);
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.10);
              }}
            >
              {isConnecting && providerType === "embedded"
                ? "Connecting..."
                : "Continue with Google"}
            </button>


            {!isMobile && isExtensionInstalled && (
              <>
                <div style={dividerStyle}>
                  <div style={dividerLineStyle} />
                  <span style={dividerTextStyle}>OR</span>
                  <div style={dividerLineStyle} />
                </div>

                <button
                  style={secondaryButtonStyle}
                  onClick={onConnectWithInjected}
                  disabled={isConnecting}
                  onMouseEnter={(e) => {
                    if (!isConnecting) {
                      e.currentTarget.style.backgroundColor = hexToRgba(theme.secondary, 0.10);
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Phantom logo placeholder - you can replace with actual SVG/image */}
                    <span style={{ fontSize: '20px' }}>👻</span>
                    <span>Phantom</span>
                  </span>
                  <span style={{ color: theme.secondary }}>Detected</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          Protected by Phantom
        </div>
      </div>
    </div>
  );
}
