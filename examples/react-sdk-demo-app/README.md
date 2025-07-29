# Phantom React SDK Demo App

This demo application showcases the usage of the `@phantom/react-sdk` with dual provider support (both injected and embedded providers).

## Features

- **Dual Provider Support**: Choose between injected (Phantom extension) and embedded (server-based) providers
- **Provider Selection**: Dynamic provider switching with persistent preference
- **Embedded Wallet Types**: Support for both user-wallet (Google auth) and app-wallet (fresh wallet)
- Display connected wallet addresses (Solana and other supported chains)
- Sign messages with base64url encoding
- Sign and send Solana transactions
- Create user organizations (embedded provider)
- Disconnect from wallet

## Prerequisites

- **For Injected Provider**: [Phantom Wallet Browser Extension](https://phantom.app/download) installed
- **For Embedded Provider**: Backend server running at `http://localhost:3000/api`
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

1. **Provider Selection**: Choose between injected (Phantom extension) or embedded (server-based) provider
2. **Embedded Options**: If using embedded provider, select user-wallet (Google auth) or app-wallet (fresh wallet)
3. **Connect**: Click the "Connect" button to connect using your selected provider
4. **Sign Message**: Once connected, sign a demo message using base64url encoding
5. **Sign Transaction**: Create and sign a simple Solana transaction (requires SOL for fees)
6. **Create Organization**: Test organization creation (embedded provider only)
7. **Disconnect**: Disconnect from the wallet

## Architecture

This demo uses:

- `@phantom/react-sdk` - The React SDK with hooks for wallet interactions
- **Dual Provider Support**:
  - **Injected Provider**: Connects to the Phantom browser extension
  - **Embedded Provider**: Server-based wallet management with Google auth or fresh wallets
- **Provider Persistence**: Automatically remembers your provider choice across sessions
- Base64url encoding - All messages and transactions are encoded in base64url format

## Configuration

The app is configured in `App.tsx`:

```typescript
const config = {
  appName: "React SDK Demo App",
  serverUrl: "http://localhost:3000/api", // Required for embedded provider
  // Provider selection happens dynamically in the UI
};
```

Provider selection is handled in the UI, allowing users to choose between:

- **Injected Provider**: Phantom browser extension
- **Embedded Provider**: Server-based with options for:
  - User Wallet (Google authentication)
  - App Wallet (Fresh wallet creation)

## Network Support

- **Injected Provider**: Currently supports Solana network operations
- **Embedded Provider**: Supports multiple networks including Solana, Ethereum, and other chains

Both providers support transaction signing, message signing, and wallet management operations.

## Development

The demo app uses:

- React 19
- TypeScript
- Vite for bundling
- @solana/kit for transaction creation

## Troubleshooting

### Injected Provider Issues

1. **"Phantom wallet not found"**: Ensure the Phantom browser extension is installed
2. **Transaction errors**: Make sure you have SOL in your wallet for transaction fees
3. **Connection issues**: Try refreshing the page or restarting the browser

### Embedded Provider Issues

1. **Server connection errors**: Ensure your backend server is running at `http://localhost:3000/api`
2. **Google auth failures**: Check browser popup blockers and third-party cookie settings
3. **Organization creation errors**: Verify your server has the correct API endpoints

### General Issues

1. **Provider switching**: If having issues switching providers, clear your browser's local storage
2. **Build errors**: Make sure all SDK packages are built with `yarn build`

## Learn More

- [Phantom React SDK Documentation](../../packages/react-sdk/README.md)
- [Phantom Wallet](https://phantom.app)
- [Solana Documentation](https://docs.solana.com)
