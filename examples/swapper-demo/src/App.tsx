import { useState } from 'react'
import { PhantomProvider, AddressType, type PhantomSDKConfig } from '@phantom/react-sdk'
import { WalletSidebar } from './components/WalletSidebar'
import { QuoteStreaming } from './components/QuoteStreaming'
import type { SwapperSolanaQuoteRepresentation, SwapperEvmQuoteRepresentation, SwapperXChainQuoteRepresentation } from '@phantom/swapper-sdk'
import './App.css'

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

// Configuration for injected provider (Phantom extension)
const config: PhantomSDKConfig = {
  appName: "SwapperSDK Demo",
  providerType: "injected", // Use injected mode only as requested
  addressTypes: [AddressType.solana, AddressType.ethereum, AddressType.bitcoinSegwit],
  
  // Enable debug for development
  debug: {
    enabled: true,
  },
}

function App() {
  const [quotesData, setQuotesData] = useState<QuotesData | null>(null)
  const [transactionStatus, setTransactionStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleQuotesReceived = (quotes: Quote[], swapInfo: QuotesData['swapInfo'], quotesType?: string) => {
    setQuotesData({ quotes, swapInfo, type: quotesType })
    setTransactionStatus({ type: null, message: '' }) // Clear previous status
  }

  const handleTransactionComplete = (txHash: string) => {
    setTransactionStatus({
      type: 'success',
      message: `Transaction successful! Hash: ${txHash.substring(0, 10)}...`
    })
  }

  const handleTransactionError = (error: string) => {
    setTransactionStatus({
      type: 'error',
      message: error
    })
  }

  const clearQuotes = () => {
    setQuotesData(null)
    setTransactionStatus({ type: null, message: '' })
  }

  return (
    <PhantomProvider config={config}>
      <div className="app">
        <WalletSidebar 
          onQuotesReceived={handleQuotesReceived}
          clearQuotes={clearQuotes}
        />
        <main className="main-content">
          <div className="header">
            <h1>SwapperSDK Demo</h1>
            <p>Get quotes and execute swaps with transaction signing</p>
          </div>
          <QuoteStreaming 
            quotesData={quotesData}
            transactionStatus={transactionStatus}
            onTransactionComplete={handleTransactionComplete}
            onTransactionError={handleTransactionError}
          />
        </main>
      </div>
    </PhantomProvider>
  )
}

export default App