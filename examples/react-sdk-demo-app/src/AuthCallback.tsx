import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useConnect, 
  useAccounts, 
  usePhantom,
  debug,
  DebugLevel,
  type DebugMessage
} from '@phantom/react-sdk';
import './AuthCallback.css';

interface AuthState {
  status: 'loading' | 'success' | 'error';
  message: string;
  title: string;
}

export function AuthCallback() {
  const navigate = useNavigate();
  const { connect, isConnecting, error: connectError } = useConnect();
  const { isConnected, walletId } = usePhantom();
  const addresses = useAccounts();
  
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    title: 'Processing authentication...',
    message: 'Please wait while we complete your authentication.'
  });
  
  // Debug state
  const [debugMessages, setDebugMessages] = useState<DebugMessage[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [debugLevel, setDebugLevel] = useState<DebugLevel>(DebugLevel.INFO);
  const hasStartedAuth = useRef(false);

  // Debug callback function
  const handleDebugMessage = useCallback((message: DebugMessage) => {
    setDebugMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only last 100 messages to prevent memory issues
      return newMessages.slice(-100);
    });
  }, []);

  // Initialize debug system
  useEffect(() => {
    debug.setCallback(handleDebugMessage);
    debug.setLevel(debugLevel);
    debug.enable();
  }, [handleDebugMessage, debugLevel]);

  // Handle authentication callback
  useEffect(() => {
    if (!hasStartedAuth.current) {
      hasStartedAuth.current = true;
      handleAuthCallback();
    }
  }, []);

  // Monitor connection status
  useEffect(() => {
    if (isConnected && walletId && addresses && addresses.length > 0) {
      setAuthState({
        status: 'success',
        title: 'Authentication Successful!',
        message: 'You have been successfully authenticated and connected to your wallet.'
      });
    }
  }, [isConnected, walletId, addresses]);

  // Monitor connect error
  useEffect(() => {
    if (connectError) {
      console.error('Auth callback error:', connectError);
      debug.error('AUTH_CALLBACK', 'Authentication failed', { error: connectError.message });
      setAuthState({
        status: 'error',
        title: 'Authentication Failed',
        message: connectError.message || 'An unknown error occurred during authentication.'
      });
    }
  }, [connectError]);

  async function handleAuthCallback() {
    try {
      debug.info('AUTH_CALLBACK', 'Starting auth callback handling');
      
      setAuthState({
        status: 'loading',
        title: 'Connecting to wallet...',
        message: 'Establishing connection with your authenticated wallet.'
      });

      debug.info('AUTH_CALLBACK', 'Attempting to connect');

      // Connect - this should resume from the redirect
      // The React SDK should automatically handle the callback URL params
      await connect({ providerType: 'embedded' });

      debug.info('AUTH_CALLBACK', 'Connection initiated');

    } catch (error) {
      console.error('Auth callback error:', error);
      debug.error('AUTH_CALLBACK', 'Authentication failed', { error: (error as Error).message });
      setAuthState({
        status: 'error',
        title: 'Authentication Failed',
        message: (error as Error).message || 'An unknown error occurred during authentication.'
      });
    }
  }

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const clearDebugMessages = () => {
    setDebugMessages([]);
  };

  return (
    <div id="app">
      <h1>Phantom Authentication</h1>

      <div className="main-layout">
        <div className="left-panel">
          <div className="section">
            {/* Loading State */}
            {authState.status === 'loading' && (
              <div className="auth-status">
                <div className="loading-spinner"></div>
                <h3>{authState.title}</h3>
                <p>{authState.message}</p>
                {isConnecting && <p className="connecting-text">Connecting...</p>}
              </div>
            )}

            {/* Success State */}
            {authState.status === 'success' && (
              <div className="auth-success">
                <div className="success-icon">✓</div>
                <h3>{authState.title}</h3>
                <p>{authState.message}</p>
                <div className="wallet-info">
                  <div className="info-row">
                    <span className="label">Wallet ID:</span>
                    <span className="value">{walletId || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Addresses:</span>
                    <div className="addresses">
                      {addresses && addresses.length > 0 ? (
                        addresses.map((addr, index) => (
                          <div key={index} className="address-item">
                            <span className="address-type">{addr.addressType}:</span>
                            <span className="address-value">{addr.address}</span>
                          </div>
                        ))
                      ) : (
                        <div className="address-item">No addresses available</div>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={handleGoHome} className="primary">
                  Go to Main App
                </button>
              </div>
            )}

            {/* Error State */}
            {authState.status === 'error' && (
              <div className="auth-error">
                <div className="error-icon">✗</div>
                <h3>{authState.title}</h3>
                <div className="error-message">{authState.message}</div>
                <div className="button-group">
                  <button onClick={handleRetry}>Retry Authentication</button>
                  <button onClick={handleGoHome} className="primary">
                    Go to Main App
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="section">
            <h3>Debug Console</h3>
            <div className="debug-controls">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={showDebug} 
                  onChange={e => setShowDebug(e.target.checked)} 
                />
                <span>Show Debug Messages</span>
              </label>

              <div className="form-group inline">
                <label>Level:</label>
                <select 
                  value={debugLevel} 
                  onChange={e => setDebugLevel(parseInt(e.target.value) as DebugLevel)}
                >
                  <option value={DebugLevel.ERROR}>ERROR</option>
                  <option value={DebugLevel.WARN}>WARN</option>
                  <option value={DebugLevel.INFO}>INFO</option>
                  <option value={DebugLevel.DEBUG}>DEBUG</option>
                </select>
              </div>

              <button className="small" onClick={clearDebugMessages}>
                Clear
              </button>
            </div>

            <div 
              className="debug-container" 
              style={{ display: showDebug ? 'block' : 'none' }}
            >
              {debugMessages.slice(-30).map((msg, index) => {
                const levelClass = DebugLevel[msg.level].toLowerCase();
                const timestamp = new Date(msg.timestamp).toLocaleTimeString();
                const dataStr = msg.data ? JSON.stringify(msg.data, null, 2) : '';

                return (
                  <div key={index} className={`debug-message debug-${levelClass}`}>
                    <div className="debug-header">
                      <span className="debug-timestamp">{timestamp}</span>
                      <span className="debug-level">{DebugLevel[msg.level]}</span>
                      <span className="debug-category">{msg.category}</span>
                    </div>
                    <div className="debug-content">{msg.message}</div>
                    {dataStr && <pre className="debug-data">{dataStr}</pre>}
                  </div>
                );
              })}
              {debugMessages.length === 0 && (
                <div className="debug-empty">Initializing debug system...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}