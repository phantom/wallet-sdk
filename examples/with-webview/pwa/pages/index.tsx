import { useState, useEffect } from 'react';
import { createDualModePhantom, DualModePhantom } from '../lib/phantom';
import { AddressType } from '@phantom/browser-sdk';

export default function Home() {
  const [phantom, setPhantom] = useState<DualModePhantom | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);
  const [signatureResult, setSignatureResult] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<string | null>(null);

  // Initialize dual-mode Phantom
  useEffect(() => {
    try {
      const dualPhantom = createDualModePhantom({
        appId: 'webview-example-app',
        addressTypes: [AddressType.solana],
        authOptions: {
          authUrl: 'https://connect.phantom.app/login',
          redirectUrl: typeof window !== 'undefined' ? window.location.origin : '',
        },
      });

      setPhantom(dualPhantom);
      setEnvironmentInfo(dualPhantom.getEnvironmentInfo());

      // Check if already connected (browser mode only)
      if (!dualPhantom.getEnvironmentInfo().isWebView && dualPhantom.getIsConnected()) {
        setIsConnected(true);
        setAddresses(dualPhantom.getAddresses());
        setWalletId(dualPhantom.getWalletId());
      }

      console.log('[App] Initialized dual-mode Phantom:', dualPhantom.getEnvironmentInfo());
    } catch (err) {
      console.error('Failed to initialize Phantom:', err);
      setError((err as Error).message);
    }
  }, []);

  const handleConnect = async (provider: 'google' | 'apple' = 'google') => {
    if (!phantom) return;

    setIsConnecting(true);
    setError(null);

    try {
      console.log(`[App] Connecting via ${environmentInfo?.mode} with ${provider}...`);

      const result = await phantom.connect({ provider });

      console.log('[App] Connection successful:', result);

      setIsConnected(true);
      setAddresses(result.addresses);
      setWalletId(result.walletId || null);
    } catch (err) {
      console.error('[App] Connection failed:', err);
      setError((err as Error).message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!phantom) return;

    try {
      await phantom.disconnect();
      setIsConnected(false);
      setAddresses([]);
      setWalletId(null);
      setSignatureResult(null);
      setTransactionResult(null);
    } catch (err) {
      console.error('[App] Disconnect failed:', err);
      setError((err as Error).message);
    }
  };

  const handleSignMessage = async () => {
    if (!phantom || !isConnected) return;

    try {
      setError(null);
      const message = `Hello from Phantom! Timestamp: ${Date.now()}`;

      console.log(`[App] Signing message via ${environmentInfo?.mode}:`, message);

      const result = await phantom.solana.signMessage(message);

      console.log('[App] Sign result:', result);
      setSignatureResult(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('[App] Sign failed:', err);
      setError((err as Error).message);
    }
  };

  const handleSignAndSendTransaction = async () => {
    if (!phantom || !isConnected) return;

    try {
      setError(null);

      // Create a simple transfer transaction example
      // Note: In a real app, you would build a proper Solana transaction
      const mockTransaction = {
        // This would be a real Solana transaction object
        type: 'transfer',
        recipient: '11111111111111111111111111111112',
        amount: 0.001 * 1e9, // 0.001 SOL in lamports
        timestamp: Date.now()
      };

      console.log(`[App] Signing and sending transaction via ${environmentInfo?.mode}:`, mockTransaction);

      const result = await phantom.solana.signAndSendTransaction(mockTransaction);

      console.log('[App] Transaction result:', result);
      setTransactionResult(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('[App] Transaction failed:', err);
      setError((err as Error).message);
    }
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1>Dual-Mode Phantom PWA</h1>
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          backgroundColor: environmentInfo?.isWebView ? '#10b981' : '#3b82f6',
          color: 'white',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          Mode: {environmentInfo?.mode || 'initializing'}
        </div>
        <p style={{ color: '#666', margin: 0 }}>
          This PWA works seamlessly in both browsers and React Native WebViews
        </p>
      </header>

      {/* Environment Info */}
      {environmentInfo && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          fontSize: '0.9rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Environment Detection</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li><strong>Environment:</strong> {environmentInfo.isWebView ? 'React Native WebView' : 'Web Browser'}</li>
            <li><strong>Auth Mode:</strong> {environmentInfo.mode}</li>
            <li><strong>Bridge Available:</strong> {environmentInfo.hasReactNativeBridge ? 'Yes' : 'No'}</li>
            <li><strong>Browser SDK:</strong> {environmentInfo.hasBrowserSDK ? 'Loaded' : 'Not loaded'}</li>
          </ul>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '0.5rem',
          marginBottom: '2rem'
        }}>
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '1rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: 'transparent',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Section */}
      {!isConnected ? (
        <div style={{ textAlign: 'center' }}>
          <h2>Connect Your Phantom Wallet</h2>

          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => handleConnect('google')}
              disabled={isConnecting || !phantom}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                backgroundColor: isConnecting ? '#94a3b8' : '#db4437',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                marginRight: '1rem'
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect with Google'}
            </button>

            <button
              onClick={() => handleConnect('apple')}
              disabled={isConnecting || !phantom}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                backgroundColor: isConnecting ? '#94a3b8' : '#000000',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: isConnecting ? 'not-allowed' : 'pointer'
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect with Apple'}
            </button>
          </div>

          {/* How It Works */}
          <div style={{ fontSize: '0.9rem', color: '#666', maxWidth: 600, margin: '0 auto' }}>
            <h3>How it works:</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: environmentInfo?.isWebView ? '1fr' : '1fr 1fr',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              {!environmentInfo?.isWebView && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#eff6ff',
                  borderRadius: '0.5rem',
                  textAlign: 'left'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1d4ed8' }}>🌐 Browser Mode</h4>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '1rem', margin: 0 }}>
                    <li>Uses @phantom/browser-sdk</li>
                    <li>OAuth opens in same window</li>
                    <li>Full wallet functionality</li>
                  </ul>
                </div>
              )}

              {environmentInfo?.isWebView && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '0.5rem',
                  textAlign: 'left'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#15803d' }}>📱 WebView Mode</h4>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '1rem', margin: 0 }}>
                    <li>Uses postMessage bridge</li>
                    <li>React Native handles OAuth</li>
                    <li>System browser for auth</li>
                    <li>Bypasses Google restrictions</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Connected State */
        <div>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '0.5rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#166534' }}>
              ✅ Connected to Phantom
            </h2>

            {/* Wallet Info */}
            <div style={{ marginBottom: '1rem' }}>
              {walletId && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Wallet ID:</strong>
                  <span style={{
                    marginLeft: '0.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    backgroundColor: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem'
                  }}>
                    {walletId}
                  </span>
                </div>
              )}

              <h3>Addresses:</h3>
              {addresses.map((addr, index) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  <strong>{addr.addressType}:</strong>
                  <br />
                  <span style={{ wordBreak: 'break-all' }}>{addr.address}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSignMessage}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Sign Message
              </button>

              <button
                onClick={handleSignAndSendTransaction}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Sign & Send Transaction
              </button>

              <button
                onClick={handleDisconnect}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            </div>

            {/* Mode-specific Info */}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: environmentInfo?.isWebView ? '#f0fdf4' : '#eff6ff',
              color: environmentInfo?.isWebView ? '#15803d' : '#1d4ed8',
              borderRadius: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <strong>
                {environmentInfo?.isWebView ? '📱 WebView Mode:' : '🌐 Browser Mode:'}
              </strong>{' '}
              {environmentInfo?.isWebView
                ? 'Signing requests are sent to React Native SDK via bridge'
                : 'Signing handled directly by browser-sdk'
              }
            </div>
          </div>

          {/* Signature Result */}
          {signatureResult && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem'
            }}>
              <h3>Signature Result:</h3>
              <pre style={{
                overflow: 'auto',
                fontSize: '0.8rem',
                padding: '1rem',
                backgroundColor: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '0.25rem'
              }}>
                {signatureResult}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '3rem',
        paddingTop: '2rem',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.9rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <strong>Test Instructions:</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: 600, margin: '0 auto' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>🌐 Browser Test</h4>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>
              Open this URL in a regular browser to test browser-sdk OAuth flow
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>📱 WebView Test</h4>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>
              Run the React Native wrapper to test bridge-based OAuth flow
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}