import React, { useState } from 'react'
import SwapperSDK, { TOKENS, NetworkId } from '@phantom/swapper-sdk'
import { usePhantom, AddressType } from '@phantom/react-sdk'
import type { WalletAddress, SwapperSolanaQuoteRepresentation, SwapperEvmQuoteRepresentation, SwapperXChainQuoteRepresentation } from '@phantom/react-sdk'

type Quote = SwapperSolanaQuoteRepresentation | SwapperEvmQuoteRepresentation | SwapperXChainQuoteRepresentation

interface SwapperControlsProps {
  addresses: WalletAddress[]
  onQuotesReceived: (quotes: Quote[], swapInfo: {
    sellToken: string
    buyToken: string  
    sellAmount: string
  }, quotesType?: string) => void
}

const swapperSDK = new SwapperSDK({
  apiUrl: 'https://api.phantom.app',
  options: { debug: true }
})

export const SwapperControls: React.FC<SwapperControlsProps> = ({ addresses, onQuotesReceived }) => {
  const { sdk } = usePhantom()
  const [usdcAmount, setUsdcAmount] = useState('10')
  const [solAmount, setSolAmount] = useState('0.1')
  const [isSwapping, setIsSwapping] = useState(false)
  const [bridgeAmount, setBridgeAmount] = useState('5')
  const [lastResult, setLastResult] = useState<string | null>(null)

  // Get addresses for specific networks (addresses prop is already safe from parent)
  const safeAddresses = addresses || []
  const solanaAddress = safeAddresses.find(addr => addr.addressType === AddressType.solana)?.address
  const ethereumAddress = safeAddresses.find(addr => addr.addressType === AddressType.ethereum)?.address

  const handleSwap = async (swapType: 'usdc-to-sol' | 'sol-to-usdc') => {
    if (!sdk || !solanaAddress) {
      setLastResult('Error: Solana address not found')
      return
    }

    setIsSwapping(true)
    setLastResult(null)

    try {
      let sellToken, buyToken, sellAmount, displayPair

      if (swapType === 'usdc-to-sol') {
        sellToken = TOKENS.SOLANA_MAINNET.USDC
        buyToken = TOKENS.SOLANA_MAINNET.SOL  
        sellAmount = String(parseFloat(usdcAmount) * 1_000_000) // USDC has 6 decimals
        displayPair = { sell: 'USDC', buy: 'SOL' }
      } else {
        sellToken = TOKENS.SOLANA_MAINNET.SOL
        buyToken = TOKENS.SOLANA_MAINNET.USDC
        sellAmount = String(parseFloat(solAmount) * 1_000_000_000) // SOL has 9 decimals
        displayPair = { sell: 'SOL', buy: 'USDC' }
      }

      // Get quotes
      const quotes = await swapperSDK.getQuotes({
        sellToken,
        buyToken,
        sellAmount,
        from: {
          address: solanaAddress,
          networkId: NetworkId.SOLANA_MAINNET,
        },
        slippageTolerance: 0.5,
      })

      console.log('Swap quotes:', quotes)
      
      if (quotes.quotes && quotes.quotes.length > 0) {
        // Pass quotes to main view
        onQuotesReceived(quotes.quotes as Quote[], {
          sellToken: displayPair.sell,
          buyToken: displayPair.buy,
          sellAmount: swapType === 'usdc-to-sol' ? usdcAmount + ' USDC' : solAmount + ' SOL'
        }, quotes.type)
        setLastResult(`✅ Got ${quotes.quotes.length} quotes - check main view`)
      } else {
        setLastResult(`❌ No quotes available for ${displayPair.sell} → ${displayPair.buy}`)
      }

    } catch (error: any) {
      console.error('Swap failed:', error)
      setLastResult(`❌ Swap failed: ${error.message}`)
    } finally {
      setIsSwapping(false)
    }
  }

  const handleBridge = async (bridgeType: 'eth-to-sol' | 'sol-to-eth') => {
    if (!sdk || !solanaAddress || !ethereumAddress) {
      setLastResult('Error: Both Solana and Ethereum addresses required for bridging')
      return
    }

    setIsSwapping(true)
    setLastResult(null)

    try {
      let sellToken, buyToken, sellAmount, fromAddress, fromNetwork, toAddress, toNetwork, displayPair

      if (bridgeType === 'eth-to-sol') {
        sellToken = TOKENS.ETHEREUM_MAINNET.USDC
        buyToken = TOKENS.SOLANA_MAINNET.USDC
        sellAmount = String(parseFloat(bridgeAmount) * 1_000_000) // USDC has 6 decimals
        fromAddress = ethereumAddress
        fromNetwork = NetworkId.ETHEREUM_MAINNET
        toAddress = solanaAddress
        toNetwork = NetworkId.SOLANA_MAINNET
        displayPair = { sell: 'ETH-USDC', buy: 'SOL-USDC' }
      } else {
        sellToken = TOKENS.SOLANA_MAINNET.USDC
        buyToken = TOKENS.ETHEREUM_MAINNET.USDC
        sellAmount = String(parseFloat(bridgeAmount) * 1_000_000) // USDC has 6 decimals
        fromAddress = solanaAddress
        fromNetwork = NetworkId.SOLANA_MAINNET
        toAddress = ethereumAddress
        toNetwork = NetworkId.ETHEREUM_MAINNET
        displayPair = { sell: 'SOL-USDC', buy: 'ETH-USDC' }
      }

      // Get bridge quotes
      const quotes = await swapperSDK.getQuotes({
        sellToken,
        buyToken,
        sellAmount,
        from: {
          address: fromAddress,
          networkId: fromNetwork,
        },
        to: {
          address: toAddress,
          networkId: toNetwork,
        },
        slippageTolerance: 1.0,
      })

      console.log('Bridge quotes:', quotes)
      
      if (quotes.quotes && quotes.quotes.length > 0) {
        // Pass bridge quotes to main view
        onQuotesReceived(quotes.quotes as Quote[], {
          sellToken: displayPair.sell,
          buyToken: displayPair.buy,
          sellAmount: bridgeAmount + ' USDC'
        }, quotes.type)
        setLastResult(`✅ Got ${quotes.quotes.length} bridge quotes - check main view`)
      } else {
        setLastResult(`❌ No bridge quotes available for ${displayPair.sell} → ${displayPair.buy}`)
      }

    } catch (error: any) {
      console.error('Bridge failed:', error)
      setLastResult(`❌ Bridge failed: ${error.message}`)
    } finally {
      setIsSwapping(false)
    }
  }

  return (
    <div className="swapper-section">
      <h3>Swap & Bridge</h3>
      
      {lastResult && (
        <div className={`card ${lastResult.startsWith('✅') ? 'success' : 'error'}`}>
          {lastResult}
        </div>
      )}

      <div className="swap-controls">
        <h4>Solana Swaps</h4>
        
        <div className="swap-input-group">
          <label>USDC Amount:</label>
          <input
            type="number"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            min="0"
            step="0.1"
            disabled={isSwapping}
          />
        </div>

        <div className="swap-input-group">
          <label>SOL Amount:</label>
          <input
            type="number"
            value={solAmount}
            onChange={(e) => setSolAmount(e.target.value)}
            min="0"
            step="0.01"
            disabled={isSwapping}
          />
        </div>

        <div className="swap-buttons">
          <button
            className="swap-button"
            onClick={() => handleSwap('usdc-to-sol')}
            disabled={isSwapping || !solanaAddress}
          >
            {isSwapping ? 'Getting Quotes...' : `Swap ${usdcAmount} USDC → SOL`}
          </button>
          <button
            className="swap-button"
            onClick={() => handleSwap('sol-to-usdc')}
            disabled={isSwapping || !solanaAddress}
          >
            {isSwapping ? 'Getting Quotes...' : `Swap ${solAmount} SOL → USDC`}
          </button>
        </div>
      </div>

      <div className="bridge-section">
        <h4>Cross-Chain Bridge</h4>
        
        <div className="swap-input-group">
          <label>USDC Bridge Amount:</label>
          <input
            type="number"
            value={bridgeAmount}
            onChange={(e) => setBridgeAmount(e.target.value)}
            min="0"
            step="0.1"
            disabled={isSwapping}
          />
        </div>

        <div className="bridge-buttons">
          <button
            className="bridge-button"
            onClick={() => handleBridge('eth-to-sol')}
            disabled={isSwapping || !ethereumAddress || !solanaAddress}
          >
            {isSwapping ? 'Getting Quotes...' : `Bridge ${bridgeAmount} USDC: ETH → SOL`}
          </button>
          <button
            className="bridge-button"
            onClick={() => handleBridge('sol-to-eth')}
            disabled={isSwapping || !ethereumAddress || !solanaAddress}
          >
            {isSwapping ? 'Getting Quotes...' : `Bridge ${bridgeAmount} USDC: SOL → ETH`}
          </button>
        </div>

        {(!ethereumAddress || !solanaAddress) && (
          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
            Bridge requires both Ethereum and Solana addresses
          </p>
        )}
      </div>
    </div>
  )
}