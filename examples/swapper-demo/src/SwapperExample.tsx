import { useState, useEffect } from 'react';
import { useConnect, useAccounts, useSolana, useDisconnect, usePhantom } from "@phantom/react-ui";
import { VersionedTransaction } from '@solana/web3.js';
import { useTokenBalance } from './hooks/useTokenBalance';

// Token addresses
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

const TOKEN_DECIMALS = {
  SOL: 9,
  USDC: 6,
};

interface Quote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
}

function SwapperExample() {
  const { connect, isConnecting } = useConnect();
  const addresses = useAccounts();
  const { isConnected } = usePhantom();
  const { solana } = useSolana();
  const { disconnect } = useDisconnect();

  const [fromToken, setFromToken] = useState<'SOL' | 'USDC'>('SOL');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const toToken = fromToken === 'SOL' ? 'USDC' : 'SOL';

  // Get wallet address
  const walletAddress = addresses && addresses[0] ? addresses[0].address : null;

  // Fetch token balances
  const {
    balance: solBalance,
    loading: solLoading,
    refetch: refetchSol
  } = useTokenBalance(walletAddress, TOKENS.SOL, TOKEN_DECIMALS.SOL);

  const {
    balance: usdcBalance,
    loading: usdcLoading,
    refetch: refetchUsdc
  } = useTokenBalance(walletAddress, TOKENS.USDC, TOKEN_DECIMALS.USDC);

  // Reset quote when amount or token changes
  useEffect(() => {
    setQuote(null);
    setError('');
    setSuccess('');
  }, [amount, fromToken]);

  const handleConnect = async () => {
    try {
      setError('');
      await connect();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    try {
      setError('');
      await disconnect();
      setQuote(null);
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const getQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setError('');
      setIsLoadingQuote(true);

      const inputMint = TOKENS[fromToken];
      const outputMint = TOKENS[toToken];
      const decimals = TOKEN_DECIMALS[fromToken];
      const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

      const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInSmallestUnit}&slippageBps=50`;

      const response = await fetch(quoteUrl);
      if (!response.ok) {
        throw new Error('Failed to get quote from Jupiter');
      }

      const quoteData = await response.json();
      setQuote(quoteData);
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const executeSwap = async () => {
    if (!quote || !solana || !addresses || !addresses[0]) {
      setError('Missing requirements for swap');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setIsSwapping(true);

      // Get serialized transaction from Jupiter
      const swapResponse = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: addresses[0].address,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      if (!swapResponse.ok) {
        throw new Error('Failed to get swap transaction');
      }

      const { swapTransaction } = await swapResponse.json();

      // Deserialize the transaction (convert base64 to Uint8Array)
      const binaryString = atob(swapTransaction);
      const swapTransactionBuf = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign and send transaction using Phantom
      const signature = await solana.signAndSendTransaction(transaction);

      setSuccess(`Swap successful! Signature: ${signature.signature.slice(0, 8)}...`);
      setQuote(null);
      setAmount('');

      // Refresh balances after successful swap
      setTimeout(() => {
        refetchSol();
        refetchUsdc();
      }, 2000);

      // Wait a bit then show explorer link
      setTimeout(() => {
        console.log('View transaction:', `https://solscan.io/tx/${signature.signature}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to execute swap');
    } finally {
      setIsSwapping(false);
    }
  };

  const flipTokens = () => {
    setFromToken(toToken);
    setAmount('');
    setQuote(null);
  };

  const formatAmount = (amountStr: string, decimals: number) => {
    const value = parseFloat(amountStr) / Math.pow(10, decimals);
    return value.toFixed(decimals === 6 ? 6 : 4);
  };

  if (!isConnected) {
    return (
      <div style={{
        width: '100%',
        padding: '2rem',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{
          color: '#6b7280',
          marginBottom: '1.5rem',
          fontSize: '1rem'
        }}>
          Connect your wallet to start swapping
        </p>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'white',
            background: 'linear-gradient(135deg, #ab9ff2 0%, #7c3aed 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            opacity: isConnecting ? 0.7 : 1,
            transition: 'all 0.2s'
          }}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {error && (
          <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.875rem' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Wallet Info */}
      <div style={{
        padding: '1rem',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.25rem 0' }}>
            Connected
          </p>
          <p style={{ color: '#1f2937', fontSize: '0.875rem', fontFamily: 'monospace', margin: 0 }}>
            {addresses && addresses[0] && `${addresses[0].address.slice(0, 4)}...${addresses[0].address.slice(-4)}`}
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            color: '#6b7280',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Disconnect
        </button>
      </div>

      {/* Swap Interface */}
      <div style={{
        padding: '2rem',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#1f2937', fontSize: '1.25rem' }}>
          Swap Tokens
        </h3>

        {/* From Token */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <label style={{
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              From
            </label>
            {isConnected && (
              <span style={{
                color: '#6b7280',
                fontSize: '0.75rem'
              }}>
                Balance: {fromToken === 'SOL'
                  ? (solLoading ? '...' : solBalance !== null ? solBalance.toFixed(4) : '0.0000')
                  : (usdcLoading ? '...' : usdcBalance !== null ? usdcBalance.toFixed(2) : '0.00')
                } {fromToken}
              </span>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              style={{
                flex: 1,
                fontSize: '1.25rem',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontWeight: 500
              }}
            />
            <div style={{
              padding: '0.5rem 1rem',
              background: 'white',
              borderRadius: '8px',
              fontWeight: 600,
              color: '#1f2937',
              border: '1px solid #e5e7eb'
            }}>
              {fromToken}
            </div>
          </div>
        </div>

        {/* Flip Button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
          <button
            onClick={flipTokens}
            style={{
              padding: '0.5rem',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.25rem',
              transition: 'all 0.2s'
            }}
          >
            ↕️
          </button>
        </div>

        {/* To Token */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <label style={{
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              To (estimated)
            </label>
            {isConnected && (
              <span style={{
                color: '#6b7280',
                fontSize: '0.75rem'
              }}>
                Balance: {toToken === 'SOL'
                  ? (solLoading ? '...' : solBalance !== null ? solBalance.toFixed(4) : '0.0000')
                  : (usdcLoading ? '...' : usdcBalance !== null ? usdcBalance.toFixed(2) : '0.00')
                } {toToken}
              </span>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <input
              type="text"
              value={quote ? formatAmount(quote.outAmount, TOKEN_DECIMALS[toToken]) : '0.0'}
              readOnly
              style={{
                flex: 1,
                fontSize: '1.25rem',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontWeight: 500,
                color: '#6b7280'
              }}
            />
            <div style={{
              padding: '0.5rem 1rem',
              background: 'white',
              borderRadius: '8px',
              fontWeight: 600,
              color: '#1f2937',
              border: '1px solid #e5e7eb'
            }}>
              {toToken}
            </div>
          </div>
        </div>

        {/* Quote Info */}
        {quote && (
          <div style={{
            padding: '1rem',
            background: '#f0fdf4',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#6b7280' }}>Rate:</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>
                1 {fromToken} = {(parseFloat(quote.outAmount) / parseFloat(quote.inAmount)).toFixed(6)} {toToken}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Price Impact:</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>
                {parseFloat(quote.priceImpactPct).toFixed(4)}%
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={getQuote}
            disabled={isLoadingQuote || !amount}
            style={{
              flex: 1,
              padding: '0.875rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: quote ? '#6b7280' : 'white',
              background: quote ? '#f3f4f6' : 'linear-gradient(135deg, #ab9ff2 0%, #7c3aed 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: (isLoadingQuote || !amount) ? 'not-allowed' : 'pointer',
              opacity: (isLoadingQuote || !amount) ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoadingQuote ? 'Getting Quote...' : quote ? 'Update Quote' : 'Get Quote'}
          </button>

          {quote && (
            <button
              onClick={executeSwap}
              disabled={isSwapping}
              style={{
                flex: 1,
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: isSwapping ? 'not-allowed' : 'pointer',
                opacity: isSwapping ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isSwapping ? 'Swapping...' : 'Swap'}
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.875rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            marginTop: '1rem',
            padding: '0.875rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#16a34a',
            fontSize: '0.875rem'
          }}>
            {success}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        fontSize: '0.875rem',
        color: '#6b7280',
        lineHeight: '1.6'
      }}>
        <p style={{ margin: 0 }}>
          Swap between SOL and USDC with live quotes.
          Slippage tolerance is set to 0.5%.
        </p>
      </div>
    </div>
  );
}

export default SwapperExample;
