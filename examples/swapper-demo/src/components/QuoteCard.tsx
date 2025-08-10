import React from 'react'
import type { SwapperSolanaQuoteRepresentation, SwapperEvmQuoteRepresentation, SwapperXChainQuoteRepresentation } from '@phantom/swapper-sdk'

type Quote = SwapperSolanaQuoteRepresentation | SwapperEvmQuoteRepresentation | SwapperXChainQuoteRepresentation

interface QuoteCardProps {
  quote: Quote
  isFirst: boolean
  onSelect: (quote: Quote) => void
  isExecuting: boolean
  selectedQuoteId?: string
  swapInfo?: {
    sellToken: string
    buyToken: string
    sellAmount: string
  }
  quotesType?: string
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ 
  quote, 
  isFirst, 
  onSelect, 
  isExecuting, 
  selectedQuoteId,
  swapInfo,
  quotesType
}) => {
  const formatAmount = (amount: string, decimals: number, symbol: string) => {
    const value = parseFloat(amount) / Math.pow(10, decimals)
    return `${value.toFixed(decimals === 9 ? 4 : decimals === 6 ? 2 : 2)} ${symbol}`
  }

  // Determine token info based on swap direction
  const getTokenInfo = (tokenSymbol: string) => {
    switch (tokenSymbol.toUpperCase()) {
      case 'SOL':
        return { decimals: 9, symbol: 'SOL' }
      case 'USDC':
        return { decimals: 6, symbol: 'USDC' }
      default:
        // Default to 6 decimals for unknown tokens
        return { decimals: 6, symbol: tokenSymbol }
    }
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  const getQuoteType = () => {
    // Use the quotesType from the response
    if (quotesType) {
      switch (quotesType) {
        case 'solana':
          return 'Solana'
        case 'eip155':
          return 'EVM'
        case 'xchain':
          return 'Cross-Chain'
        case 'sui':
          return 'Sui'
        default:
          return 'Unknown'
      }
    }
    
    // Fallback to old logic
    if ('transactionData' in quote) {
      return Array.isArray(quote.transactionData) ? 'Solana' : 'EVM'
    } else if ('steps' in quote) {
      return 'Cross-Chain'
    }
    return 'Unknown'
  }

  const getProviderName = () => {
    return quote.baseProvider?.name || quote.baseProvider?.id || 'Unknown Provider'
  }

  const isSelected = selectedQuoteId === quote.baseProvider?.id

  return (
    <div className={`quote-card ${isFirst ? 'quote-card-best' : ''} ${isSelected ? 'quote-card-selected' : ''}`}>
      <div className="quote-header">
        <div className="quote-provider">
          <h4>{getProviderName()}</h4>
          <span className="quote-type">{getQuoteType()}</span>
          {isFirst && <span className="best-badge">Best Quote</span>}
        </div>
        <div className="quote-amounts">
          <div className="sell-amount">
            <span className="label">You Pay:</span>
            <span className="amount">
              {swapInfo ? (
                formatAmount(quote.sellAmount, getTokenInfo(swapInfo.sellToken).decimals, getTokenInfo(swapInfo.sellToken).symbol)
              ) : (
                formatAmount(quote.sellAmount, 6, 'USDC')
              )}
            </span>
          </div>
          <div className="buy-amount">
            <span className="label">You Get:</span>
            <span className="amount">
              {swapInfo ? (
                formatAmount(quote.buyAmount, getTokenInfo(swapInfo.buyToken).decimals, getTokenInfo(swapInfo.buyToken).symbol)
              ) : (
                formatAmount(quote.buyAmount, 9, 'SOL')
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="quote-details">
        {quote.priceImpact !== undefined && (
          <div className="detail-item">
            <span>Price Impact:</span>
            <span className={quote.priceImpact > 0.01 ? 'negative' : ''}>{formatPercentage(quote.priceImpact)}</span>
          </div>
        )}
        
        {quote.slippageTolerance !== undefined && (
          <div className="detail-item">
            <span>Slippage:</span>
            <span>{formatPercentage(quote.slippageTolerance)}</span>
          </div>
        )}

        {/* EVM specific details */}
        {'gas' in quote && (
          <div className="detail-item">
            <span>Gas:</span>
            <span>{quote.gas?.toLocaleString() || 'N/A'}</span>
          </div>
        )}

        {/* Cross-chain specific details */}
        {'executionDuration' in quote && quote.executionDuration && (
          <div className="detail-item">
            <span>Est. Time:</span>
            <span>{Math.round(quote.executionDuration / 60)} min</span>
          </div>
        )}

        {/* Fees information */}
        {quote.fees && quote.fees.length > 0 && (
          <div className="detail-item">
            <span>Fees:</span>
            <span>{quote.fees.length} fee(s)</span>
          </div>
        )}
      </div>

      <div className="quote-actions">
        <button 
          className={`swap-button ${isSelected ? 'selected' : ''}`}
          onClick={() => onSelect(quote)}
          disabled={isExecuting}
        >
          {isExecuting && isSelected ? 'Executing...' : 'Execute Swap'}
        </button>
      </div>

      {/* Debug information */}
      <div className="quote-debug">
        <details>
          <summary>Quote Details</summary>
          <pre>{JSON.stringify(quote, null, 2)}</pre>
        </details>
      </div>
    </div>
  )
}