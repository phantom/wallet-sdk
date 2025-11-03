import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConnect, useAccounts, usePhantom } from "@phantom/react-ui";

export function AuthCallback() {
  const navigate = useNavigate();
  const { isConnected } = usePhantom();
  const { isConnecting, error: connectError } = useConnect();
  const addresses = useAccounts();

  useEffect(() => {
    if (connectError) {
      console.error("Auth callback error:", connectError);
    }
  }, [connectError]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        padding: '2rem',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '1.5rem'
        }}>
          Authentication
        </h1>

        {/* Loading State */}
        {isConnecting && (
          <div>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem',
              border: '4px solid #f3f4f6',
              borderTopColor: '#ab9ff2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <h3 style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
              Connecting...
            </h3>
          </div>
        )}

        {/* Success State */}
        {isConnected && (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'white'
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#1f2937', marginBottom: '0.5rem' }}>
              Authentication Successful
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              You are now connected to your wallet.
            </p>
            {addresses && addresses.length > 0 && (
              <div style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Connected Addresses:
                </div>
                {addresses.map((addr, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    background: 'white',
                    borderRadius: '4px',
                    marginBottom: index < addresses.length - 1 ? '0.5rem' : 0,
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: '#6b7280', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {addr.addressType}
                    </span>
                    <span style={{ fontFamily: 'monospace', color: '#1f2937' }}>
                      {addr.address.slice(0, 4)}...{addr.address.slice(-4)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleGoHome}
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: 'white',
                background: 'linear-gradient(135deg, #ab9ff2 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              Go to App
            </button>
          </div>
        )}

        {/* Error State */}
        {connectError && (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'white'
            }}>
              ✗
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#1f2937', marginBottom: '0.5rem' }}>
              Authentication Failed
            </h3>
            <div style={{
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {connectError.message || "An unknown error occurred during authentication."}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleRetry}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
              <button
                onClick={handleGoHome}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'white',
                  background: 'linear-gradient(135deg, #ab9ff2 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Go to App
              </button>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
