# SwapperSDK Demo App

A React application demonstrating the SwapperSDK capabilities with cross-chain swaps and bridge functionality using the Phantom React SDK.

## Features

- **Phantom React SDK Integration**: Connect using injected wallet mode with React hooks
- **Multi-network Support**: View addresses for Solana, Ethereum, Bitcoin
- **Quote Results Display**: Shows successful quote retrievals from SwapperSDK
- **Preconfigured Swaps**: 
  - SOL ↔ USDC swaps on Solana
  - Customizable amounts
- **Cross-chain Bridges**: 
  - USDC bridging between Ethereum ↔ Solana
  - Real-time bridge quote fetching
- **Responsive UI**: Sidebar layout with live quote display

## Prerequisites

- Node.js (v16 or higher)
- Yarn workspace setup
- Phantom Browser Extension installed

## Installation

From the root of the wallet-sdk monorepo:

```bash
# Install dependencies
yarn install

# Navigate to the demo
cd packages/swapper-sdk/examples/swapper-demo

# Start development server
yarn dev
```

The app will be available at `http://localhost:5173`

## Usage

### 1. Connect Wallet
- Click "Connect Phantom" to connect your wallet
- The sidebar will show all your wallet addresses across different networks

### 2. Perform Swaps
- **USDC to SOL**: Enter USDC amount and click swap button
- **SOL to USDC**: Enter SOL amount and click swap button
- View real-time quotes in the main content area

### 3. Cross-chain Bridges
- Requires both Ethereum and Solana addresses
- **ETH → SOL**: Bridge USDC from Ethereum to Solana
- **SOL → ETH**: Bridge USDC from Solana to Ethereum

### 4. Live Quote Streaming
- Automatically streams USDC/SOL quotes when connected
- Shows provider, amounts, price impact, and slippage
- Updates in real-time with latest market data

## Architecture

```
src/
├── components/
│   ├── WalletSidebar.tsx       # Left sidebar with wallet info
│   ├── SwapperControls.tsx     # Swap & bridge controls  
│   └── QuoteStreaming.tsx      # Quote results display
├── App.tsx                     # Main layout & React SDK config
├── App.css                     # Component styling
└── main.tsx                    # React entry point
```

## Key Components

### React SDK Integration
- Uses @phantom/react-sdk PhantomProvider and hooks
- Configured for injected wallet mode only
- Handles wallet connection state automatically

### SwapperControls  
- Preconfigured swap buttons (SOL ↔ USDC)
- Bridge functionality (ETH ↔ SOL USDC)
- Integration with SwapperSDK for quotes

### QuoteStreaming
- Real-time quote streaming using SwapperSDK
- Displays live market data
- Shows quote history with timestamps

## Configuration

The app uses production API endpoints:
- **SwapperSDK**: `https://api.phantom.app`
- **Debug Mode**: Enabled for development

To modify:
```typescript
const swapperSDK = new SwapperSDK({
  apiUrl: 'https://api.phantom.app',
  options: { debug: true }
})
```

## Development

### Building
```bash
yarn build
```

### Linting
```bash  
yarn lint
```

### Preview Production Build
```bash
yarn preview
```

## Token Support

The demo includes preconfigured tokens from `@phantom/swapper-sdk`:
- **Solana**: SOL, USDC, USDT, WSOL
- **Ethereum**: ETH, USDC, USDT, WETH  
- **Base**: ETH, USDC, WETH
- **Polygon**: MATIC, USDC, USDT, WETH
- **Arbitrum**: ETH, USDC, USDT, WETH

## Troubleshooting

### Wallet Connection Issues
- Ensure Phantom extension is installed and unlocked
- Check browser console for connection errors
- Try refreshing the page

### Quote Streaming Problems  
- Verify wallet is connected with Solana address
- Check network connectivity
- Look for API errors in browser console

### Bridge Requirements
- Both Ethereum and Solana addresses needed
- Sufficient token balances required
- Network fees apply for cross-chain transactions

## Next Steps

This demo provides a foundation for:
- Custom swap interfaces
- Multi-chain DeFi applications  
- Real-time price monitoring
- Cross-chain bridge aggregation

Extend the codebase by adding more token pairs, custom slippage controls, transaction history, or additional network support.