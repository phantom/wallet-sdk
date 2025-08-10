import React from 'react'
import { usePhantom, useConnect, useAccounts, useDisconnect, AddressType } from '@phantom/react-sdk'
import { SwapperControls } from './SwapperControls'
import type { SwapperSolanaQuoteRepresentation, SwapperEvmQuoteRepresentation, SwapperXChainQuoteRepresentation } from '@phantom/react-sdk'

type Quote = SwapperSolanaQuoteRepresentation | SwapperEvmQuoteRepresentation | SwapperXChainQuoteRepresentation

interface WalletSidebarProps {
  onQuotesReceived: (quotes: Quote[], swapInfo: {
    sellToken: string
    buyToken: string  
    sellAmount: string
  }, quotesType?: string) => void
  clearQuotes: () => void
}

export const WalletSidebar: React.FC<WalletSidebarProps> = ({ onQuotesReceived, clearQuotes }) => {
  const { isConnected,  error } = usePhantom()
  const addresses = useAccounts() || []
  const { connect, isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
 console.log(isConnected, addresses, error)
  const formatAddress = (address: string, length: number = 8) => {
    if (!address) return ''
    return `${address.slice(0, length)}...${address.slice(-length)}`
  }

  const getNetworkName = (addressType: any) => {
    switch (addressType) {
      case AddressType.solana:
        return 'Solana'
      case AddressType.ethereum:
        return 'Ethereum'
      case AddressType.bitcoinSegwit:
        return 'Bitcoin (SegWit)'
      default:
        return String(addressType)
    }
  }

  return (
    <div className="sidebar">
      {!isConnected ? (
        <div className="connect-section">
          <h2>Connect Your Wallet</h2>
          <p>Connect to Phantom wallet to start swapping</p>
          <button 
            className="connect-button" 
            onClick={() => connect()}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Phantom'}
          </button>
          {error && (
            <div className="error-message">
              {error.message}
            </div>
          )}
        </div>
      ) : (
        <div className="wallet-info">
          <div className="wallet-header">
            <h3>Wallet Connected</h3>
            <button 
              onClick={disconnect}
              style={{ 
                fontSize: '0.8rem', 
                padding: '0.5rem 1rem',
                background: '#333',
                border: '1px solid #555'
              }}
            >
              Disconnect
            </button>
          </div>
          
          <div className="addresses-list">
            <h4>Your Addresses:</h4>
            {addresses.map((addr, index) => (
              <div key={index} className="address-item">
                <h4>{getNetworkName(addr.addressType)}</h4>
                <p title={addr.address}>{formatAddress(addr.address, 6)}</p>
              </div>
            ))}
          </div>

          <SwapperControls 
            addresses={addresses} 
            onQuotesReceived={onQuotesReceived}
          />
          
          <div style={{ marginTop: '1rem' }}>
            <button 
              onClick={clearQuotes}
              style={{ 
                width: '100%',
                padding: '0.5rem',
                background: '#333',
                border: '1px solid #555',
                color: '#ccc',
                fontSize: '0.9rem'
              }}
            >
              Clear Quotes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}