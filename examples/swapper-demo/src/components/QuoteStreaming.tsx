import React from 'react'
import { usePhantom, useAccounts, AddressType } from '@phantom/react-sdk'
import { QuotesList } from './QuotesList'
import type { SwapperSolanaQuoteRepresentation, SwapperEvmQuoteRepresentation, SwapperXChainQuoteRepresentation } from '@phantom/react-sdk'

type Quote = SwapperSolanaQuoteRepresentation | SwapperEvmQuoteRepresentation | SwapperXChainQuoteRepresentation

interface QuotesData {
  quotes: Quote[]
  swapInfo: {
    sellToken: string
    buyToken: string
    sellAmount: string
  }
  type?: string
}

interface QuoteStreamingProps {
  quotesData: QuotesData | null
  transactionStatus: {
    type: 'success' | 'error' | null
    message: string
  }
  onTransactionComplete: (txHash: string) => void
  onTransactionError: (error: string) => void
}

export const QuoteStreaming: React.FC<QuoteStreamingProps> = ({ 
  quotesData, 
  transactionStatus,
  onTransactionComplete,
  onTransactionError 
}) => {
  const { isConnected } = usePhantom()
  const addresses = useAccounts() || []

  const solanaAddress = addresses.find(addr => addr.addressType === AddressType.solana)?.address
  const ethereumAddress = addresses.find(addr => addr.addressType === AddressType.ethereum)?.address

  const formatAddress = (address: string) => {
    if (!address) return 'Not available'
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  return (
    <div className="quote-container">
      {/* Transaction Status */}
      {transactionStatus.type && (
        <div className={`card ${transactionStatus.type === 'success' ? 'success' : 'error'}`}>
          <h3>{transactionStatus.type === 'success' ? '✅ Transaction Successful' : '❌ Transaction Failed'}</h3>
          <p>{transactionStatus.message}</p>
        </div>
      )}

      {/* Quotes Display */}
      {quotesData ? (
        <QuotesList 
          quotes={quotesData.quotes}
          swapInfo={quotesData.swapInfo}
          quotesType={quotesData.type}
          onTransactionComplete={onTransactionComplete}
          onTransactionError={onTransactionError}
        />
      ) : (
        <>
          <h2>SwapperSDK Transaction Demo</h2>
          
          {!isConnected ? (
            <div className="loading">
              Connect your wallet to see quotes and execute swaps
            </div>
          ) : (
            <div className="card">
              <h3>Ready for Live Trading</h3>
              <p>Use the controls in the sidebar to:</p>
              <ul>
                <li><strong>Get Real Quotes</strong>: Fetch live prices from DEXs and aggregators</li>
                <li><strong>Execute Swaps</strong>: Sign and submit transactions directly from quotes</li>
                <li><strong>Cross-Chain Bridge</strong>: Bridge USDC between Ethereum ↔ Solana</li>
              </ul>
              
              <div style={{ marginTop: '2rem' }}>
                <h4>Your Connected Addresses:</h4>
                {solanaAddress && (
                  <p><strong>Solana:</strong> {formatAddress(solanaAddress)}</p>
                )}
                {ethereumAddress && (
                  <p><strong>Ethereum:</strong> {formatAddress(ethereumAddress)}</p>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <h3>SwapperSDK + React SDK Integration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <h4 style={{ color: '#4ecdc4', fontSize: '1rem' }}>Swap Features</h4>
                <ul style={{ fontSize: '0.9rem' }}>
                  <li>Live quote comparison</li>
                  <li>Multiple DEX aggregators</li>
                  <li>Price impact calculation</li>
                  <li>Slippage protection</li>
                  <li>Gas estimation</li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: '#ff7b7b', fontSize: '1rem' }}>Transaction Flow</h4>
                <ul style={{ fontSize: '0.9rem' }}>
                  <li>1. Click swap button</li>
                  <li>2. Review quotes here</li>
                  <li>3. Click "Execute Swap"</li>
                  <li>4. Sign with Phantom</li>
                  <li>5. Transaction complete!</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}