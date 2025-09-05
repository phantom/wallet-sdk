import { useWallet } from '@solana/wallet-adapter-react';
import { useBalance } from '../hooks/useBalance';

/**
 * Component to display connected wallet information and balance
 */
export function WalletInfo() {
  const { publicKey, connected, wallet } = useWallet();
  const address = publicKey?.toBase58() || null;
  const { balance, loading, error, refetch } = useBalance(address);

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <section className="section">
      <h2>Wallet Information</h2>
      
      <div className="status-card">
        <div className="status-row">
          <span className="status-label">Wallet:</span>
          <span className="status-value">{wallet?.adapter.name}</span>
        </div>
        
        <div className="status-row">
          <span className="status-label">Status:</span>
          <span className="status-value connected">Connected</span>
        </div>
        
        <div className="status-row">
          <span className="status-label">Address:</span>
          <span className="status-value address">{address}</span>
        </div>
        
        <div className="balance-row">
          <div className="balance-info">
            <span className="balance-label">Balance:</span>
            <span className="balance-value">
              {loading 
                ? 'Loading...' 
                : error 
                  ? 'Error' 
                  : balance !== null 
                    ? `${balance.toFixed(4)} SOL` 
                    : '--'}
            </span>
          </div>
          <button 
            className="small" 
            onClick={() => refetch()} 
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {error && (
          <div className="error-text">
            Balance error: {error}
          </div>
        )}
      </div>
    </section>
  );
}
