import { useState } from "react";
import { 
  useConnect, 
  useAccounts, 
  useDisconnect, 
  usePhantom,
  isMobileDevice
} from "@phantom/react-ui";

export default function ConnectExample() {
  const { connect, isConnecting, error } = useConnect();
  const accounts = useAccounts();
  const { disconnect } = useDisconnect();
  const { isConnected } = usePhantom();
  
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const isMobile = isMobileDevice();

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error("Error disconnecting:", err);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      padding: '2rem',
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}>
        Connection Test
      </h2>
      
      {/* Device Info Toggle */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <button
          onClick={() => setShowDeviceInfo(!showDeviceInfo)}
          style={{
            background: 'transparent',
            border: '1px solid #d1d5db',
            color: '#6b7280',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          {showDeviceInfo ? 'Hide' : 'Show'} Device Info
        </button>
        
        {showDeviceInfo && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <p><strong>Device Type:</strong> {isMobile ? 'Mobile' : 'Desktop'}</p>
            <p><strong>User Agent:</strong> {navigator.userAgent}</p>
            <p><strong>Screen Size:</strong> {window.screen.width} x {window.screen.height}</p>
            <p><strong>Touch Support:</strong> {'ontouchstart' in window ? 'Yes' : 'No'}</p>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div style={{
        padding: '1rem',
        background: isConnected ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${isConnected ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{
          margin: '0 0 0.5rem 0',
          color: isConnected ? '#16a34a' : '#dc2626',
          fontSize: '1rem'
        }}>
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </h3>
        
        {isConnecting && (
          <p style={{ margin: '0', color: '#6b7280' }}>
            Connecting... 
          </p>
        )}
        
        {error && (
          <p style={{ margin: '0', color: '#dc2626', fontSize: '0.875rem' }}>
            Error: {error.message}
          </p>
        )}
      </div>

      {/* Connect/Disconnect Button */}
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          style={{
            width: '100%',
            padding: '1rem',
            background: isConnecting ? '#9ca3af' : '#ab9ff2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            marginBottom: '1rem'
          }}
          onMouseOver={(e) => {
            if (!isConnecting) {
              e.currentTarget.style.background = '#9a8cf0';
            }
          }}
          onMouseOut={(e) => {
            if (!isConnecting) {
              e.currentTarget.style.background = '#ab9ff2';
            }
          }}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <button
          onClick={handleDisconnect}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginBottom: '1rem'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#dc2626';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#ef4444';
          }}
        >
          Disconnect
        </button>
      )}

      {/* Connected Accounts */}
      {isConnected && accounts && accounts.length > 0 && (
        <div>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '500',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            Connected Accounts:
          </h3>
          
          {accounts.map((account, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '0.5rem'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{
                  background: account.addressType === 'solana' ? '#8b5cf6' : '#3b82f6',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  textTransform: 'uppercase'
                }}>
                  {account.addressType}
                </span>
              </div>
              
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#6b7280',
                wordBreak: 'break-all',
                background: 'white',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #d1d5db'
              }}>
                {account.address}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Notice */}
      {isMobile && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#1e40af'
        }}>
          <strong>📱 Mobile Device Detected:</strong><br />
          When you click "Connect Wallet", you'll see an additional "Open in Phantom App" button 
          that will redirect to the Phantom mobile app.
        </div>
      )}
    </div>
  );
}