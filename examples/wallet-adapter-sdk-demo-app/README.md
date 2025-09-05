# Phantom SDK Wallet Adapter Demo

This demo application showcases how to integrate the Phantom SDK Wallet Adapter with a React application using the standard Solana wallet adapter interface.

## Features

- 🔌 Standard Solana wallet adapter integration
- 👻 Phantom's invisible wallet (no extension required)
- 💰 SOL balance display with refresh
- ✍️ Message signing
- 📝 Transaction signing
- 📤 Transaction sending
- 🎨 Clean, responsive UI

## Prerequisites

- Node.js 16+ and Yarn
- A Phantom App ID from [phantom.com/portal](https://phantom.com/portal)

## Setup

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Configure environment variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_PHANTOM_APP_ID=your-app-id-from-phantom-portal
   VITE_WALLET_TYPE=app-wallet  # or 'user-wallet'
   ```

3. Run the development server:
   ```bash
   yarn dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Configuration Options

### Environment Variables

- `VITE_PHANTOM_APP_ID`: Your app ID from Phantom Portal (required)
- `VITE_WALLET_TYPE`: Type of embedded wallet
  - `app-wallet`: Wallet scoped to your application (default)
  - `user-wallet`: User's universal Phantom wallet

## How It Works

This demo uses the `@phantom/sdk-wallet-adapter` package which implements the standard Solana wallet adapter interface. This means:

1. **Standard Integration**: Works with `@solana/wallet-adapter-react` and related packages
2. **No Extension Required**: Uses Phantom's embedded wallet technology
3. **Seamless UX**: Users don't need to install any browser extensions

## Key Components

### App.tsx
Sets up the wallet adapter providers and configures the PhantomSDKWalletAdapter.

### WalletInfo.tsx
Displays connected wallet information including address and SOL balance.

### WalletActions.tsx
Provides buttons for wallet operations:
- Sign Message
- Sign Transaction (without sending)
- Send Transaction (0.000001 SOL self-transfer)

### useBalance.ts
Custom hook for fetching and tracking SOL balance.

## Testing Transactions

The demo includes transaction functionality that requires a small amount of SOL for gas fees. The "Send Transaction" button performs a self-transfer of 0.000001 SOL to demonstrate transaction signing and sending.

## Troubleshooting

### Connection Issues
- Ensure cookies are enabled in your browser
- Verify your App ID is correct and active
- Check the browser console for error messages

### Transaction Failures
- Ensure you have sufficient SOL balance for gas fees
- The demo is configured for mainnet by default

## Learn More

- [Phantom SDK Documentation](https://docs.phantom.app)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

## Support

- [Discord](https://discord.gg/phantom)
- [GitHub Issues](https://github.com/phantom/wallet-sdk/issues)
