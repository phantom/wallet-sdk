# Phantom React SDK Demo App

This demo application showcases the usage of the `@phantom/react-sdk` with the Phantom browser extension (injected provider).

## Features

- Connect to Phantom wallet browser extension
- Display connected wallet addresses (Solana and other chains if available)
- Sign messages with base64url encoding
- Sign and send Solana transactions
- Disconnect from wallet

## Prerequisites

- [Phantom Wallet Browser Extension](https://phantom.app/download) installed
- Node.js 16+ and Yarn

## Getting Started

1. From the monorepo root, install dependencies:
   ```bash
   yarn install
   ```

2. Build the SDK packages:
   ```bash
   yarn build
   ```

3. Start the demo app:
   ```bash
   yarn workspace @phantom/react-sdk-demo-app dev
   ```

4. Open your browser to http://localhost:5174

## Usage

1. **Connect**: Click the "Connect" button to connect to your Phantom wallet
2. **Sign Message**: Once connected, sign a demo message using base64url encoding
3. **Sign Transaction**: Create and sign a simple Solana transaction (requires SOL for fees)
4. **Disconnect**: Disconnect from the wallet

## Architecture

This demo uses:
- `@phantom/react-sdk` - The new React SDK with hooks for wallet interactions
- Injected provider mode - Connects to the Phantom browser extension
- Base64url encoding - All messages and transactions are encoded in base64url format

## Configuration

The app is configured in `App.tsx`:

```typescript
const config = {
  walletType: 'injected',  // Use Phantom browser extension
  appName: 'React SDK Demo App'
};
```

## Network Support

Currently, when using the injected provider (Phantom browser extension), only Solana network operations are supported. For multi-chain support, use the embedded wallet mode.

## Development

The demo app uses:
- React 19
- TypeScript
- Vite for bundling
- @solana/kit for transaction creation

## Troubleshooting

1. **"Phantom wallet not found"**: Ensure the Phantom browser extension is installed
2. **Transaction errors**: Make sure you have SOL in your wallet for transaction fees
3. **Connection issues**: Try refreshing the page or restarting the browser

## Learn More

- [Phantom React SDK Documentation](../../packages/react-sdk/README.md)
- [Phantom Wallet](https://phantom.app)
- [Solana Documentation](https://docs.solana.com)