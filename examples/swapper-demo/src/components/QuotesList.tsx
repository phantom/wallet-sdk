import React, { useMemo, useState } from 'react'
import { useSignAndSendTransaction, usePhantom, AddressType } from '@phantom/react-sdk'
import { VersionedTransaction } from '@solana/web3.js'
import { getSolanaTransactionFromQuote, inspectSolanaTransaction } from '@phantom/swapper-sdk'
import { QuoteCard } from './QuoteCard'
import type { SwapperSolanaQuoteRepresentation, SwapperEvmQuoteRepresentation, SwapperXChainQuoteRepresentation } from '@phantom/swapper-sdk'

type Quote = SwapperSolanaQuoteRepresentation | SwapperEvmQuoteRepresentation | SwapperXChainQuoteRepresentation

interface QuotesListProps {
  quotes: Quote[]
  swapInfo: {
    sellToken: string
    buyToken: string
    sellAmount: string
  }
  quotesType?: string // Add the type from the quotes response
  onTransactionComplete: (txHash: string) => void
  onTransactionError: (error: string) => void
}

export const QuotesList: React.FC<QuotesListProps> = ({
  quotes,
  swapInfo,
  quotesType,
  onTransactionComplete,
  onTransactionError
}) => {
  const { addresses } = usePhantom()
  const { signAndSendTransaction, isSigning } = useSignAndSendTransaction()
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  const targetAddress = useMemo(() => {
    // Get the first address that matches the quotes type
    if (quotesType) {
      switch (quotesType) {
        case 'solana':
          return addresses.find(addr => addr.addressType === AddressType.solana)?.address
        case 'eip155':
          return addresses.find(addr => addr.addressType === AddressType.ethereum)?.address
        case 'xchain':
          // For cross-chain, we need to determine based on the first step
          // Default to Solana for now
          return addresses.find(addr => addr.addressType === AddressType.solana)?.address
        case 'sui':
          // Sui not supported in this demo
          return undefined
        default:
          return addresses.find(addr => addr.addressType === AddressType.solana)?.address
      }
    }
    return null;
  }, [addresses, quotesType])


  const executeSwap = async (quote: Quote) => {
    if (!targetAddress) {
      onTransactionError('No compatible address found for this quote')
      return
    }

    setSelectedQuoteId(quote.baseProvider?.id || 'unknown')

    try {
      let transactions: VersionedTransaction[]
      let networkId: string

      // Extract and parse transaction data based on quotes type
      if (!quotesType) {
        throw new Error('Quotes type not available')
      }

      switch (quotesType) {
        case 'solana':
          if (!('transactionData' in quote)) {
            throw new Error('Invalid Solana quote: missing transaction data')
          }

          console.log('Parsing Solana transaction with SwapperSDK utility...')

          // Use the SwapperSDK utility function to parse transactions
          transactions = getSolanaTransactionFromQuote(quote as SwapperSolanaQuoteRepresentation)
          
          // Inspect the first transaction for debugging
          if (transactions.length > 0) {
            inspectSolanaTransaction(transactions[0], 0)
          }

          networkId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' // Solana mainnet
          break

        case 'eip155':
          // EVM transactions are handled differently - they stay as string data
          throw new Error('EVM transactions not implemented in this demo')

        case 'xchain':
          throw new Error('Multi-step cross-chain transactions are not supported in this demo')

        case 'sui':
          throw new Error('Sui transactions are not supported in this demo')

        default:
          throw new Error(`Unsupported quotes type: ${quotesType}`)
      }

      console.log('Executing swap with parsed transactions:', {
        transactionCount: transactions.length,
        firstTransaction: 'VersionedTransaction with ' + transactions[0].message.compiledInstructions.length + ' instructions',
        networkId,
        quote: quote.baseProvider
      })

      // Execute the first transaction (most swaps only have one transaction)
      // For multi-step swaps, we'd need to execute all transactions in sequence
      const transactionToExecute = transactions[0]

      const result = await signAndSendTransaction({
        transaction: transactionToExecute,
        networkId: networkId as any,
      })

      console.log('Transaction completed:', result)
      onTransactionComplete(result.rawTransaction || 'Transaction completed')

    } catch (error: any) {
      console.error('Swap execution failed:', error)
      onTransactionError(`Swap failed: ${error.message || 'Unknown error'}`)
    } finally {
      setSelectedQuoteId(null)
    }
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="quotes-empty">
        <h3>No Quotes Available</h3>
        <p>Use the swap controls in the sidebar to get quotes.</p>
      </div>
    )
  }

  return (
    <div className="quotes-list-container">
      <div className="quotes-header">
        <h2>Available Quotes</h2>
        <div className="swap-summary">
          <p>
            <strong>{swapInfo.sellToken}</strong> → <strong>{swapInfo.buyToken}</strong>
          </p>
          <p className="swap-amount">Amount: {swapInfo.sellAmount}</p>
        </div>
      </div>

      <div className="quotes-list">
        {quotes.map((quote, index) => (
          <QuoteCard
            key={`${quote.baseProvider?.id || 'unknown'}-${index}`}
            quote={quote}
            isFirst={index === 0}
            onSelect={executeSwap}
            isExecuting={isSigning}
            selectedQuoteId={selectedQuoteId}
            swapInfo={swapInfo}
            quotesType={quotesType}
          />
        ))}
      </div>

      <div className="quotes-info">
        <p>
          <strong>{quotes.length}</strong> quote{quotes.length !== 1 ? 's' : ''} found •
          Best rate is highlighted •
          Click "Execute Swap" to proceed
        </p>
      </div>
    </div>
  )
}