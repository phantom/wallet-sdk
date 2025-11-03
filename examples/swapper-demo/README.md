# Token Swapper Demo

A demonstration app showcasing token swaps on Solana using the Jupiter aggregator and Phantom's React UI SDK.

## Features

- 🔌 **Wallet Connection**: Uses `@phantom/react-ui` for seamless wallet connectivity
- 🔄 **Token Swaps**: Swap between SOL and USDC using Jupiter's best routes
- 💱 **Real-time Quotes**: Get live swap quotes with price impact information
- 💰 **Balance Display**: See your SOL and USDC balances in real-time
- ⚡ **Easy to Use**: Simple, intuitive UI for swapping tokens
- 🔄 **Auto Balance Refresh**: Balances automatically refresh after successful swaps

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Phantom wallet extension or access to Phantom embedded wallet

### Installation

```bash
# Install dependencies
yarn install

# Copy the environment variables (optional - default values are provided)
# If you want to use custom configuration, copy .env.example to .env and update the values
cp .env.example .env

# Start the development server
yarn dev
```

The app will be available at `http://localhost:5174`

### Environment Variables

The app uses environment variables for configuration. A `.env` file is included with default values for development. You can customize these values by editing the `.env` file:

- `VITE_APP_ID` - Your Phantom App ID from the developer dashboard
- `VITE_API_BASE_URL` - Phantom API base URL (staging or production)
- `VITE_AUTH_URL` - Authentication endpoint URL
- `VITE_REDIRECT_URL` - OAuth callback URL after authentication
- `VITE_SOLANA_RPC_URL_MAINNET` - Solana mainnet RPC endpoint
- `VITE_SOLANA_RPC_URL_DEVNET` - Solana devnet RPC endpoint

See `.env.example` for more details on each configuration option.

### Build for Production

```bash
yarn build
```

## How It Works

### 1. Connect Wallet
Click "Connect Wallet" to authenticate using Phantom's embedded wallet with OAuth providers (Google, Apple, etc.)

### 2. Get Quote
- Enter the amount you want to swap
- Click "Get Quote" to fetch the best swap route from Jupiter
- View the estimated output amount and price impact

### 3. Execute Swap
- Review the quote details
- Click "Swap" to execute the transaction
- Phantom will prompt you to approve the transaction

## Technical Details

### Jupiter API Integration

The app uses Jupiter's Swap API v1:

1. **Get Quote**: `GET https://lite-api.jup.ag/swap/v1/quote`
   - Input: token mints, amount, slippage
   - Output: best swap route with pricing

2. **Build Transaction**: `POST https://lite-api.jup.ag/swap/v1/swap`
   - Input: quote response, user public key
   - Output: serialized transaction ready to sign

3. **Execute**: Transaction is signed and sent via Phantom wallet

### Token Addresses

- **SOL** (Wrapped): `So11111111111111111111111111111111111111112`
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

### Configuration

- **Slippage**: 0.5% (50 basis points)
- **Dynamic Compute Units**: Enabled for optimal transaction performance
- **Auto Priority Fees**: Jupiter automatically calculates optimal priority fees

## Code Structure

```
src/
├── main.tsx           # App entry point
├── App.tsx            # Root component with PhantomProvider
└── SwapperExample.tsx # Main swap interface component
```

## Dependencies

- `@phantom/react-ui` - Phantom's React UI SDK
- `@solana/web3.js` - Solana web3 library for transaction handling
- `react` - React framework
- `vite` - Build tool

## Learn More

- [Phantom React UI SDK](../../packages/react-ui/README.md)
- [Jupiter Swap API Docs](https://dev.jup.ag/docs/swap/get-quote)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token](https://spl.solana.com/token)

## License

MIT
