# Phantom SDK Wallet Standard Demo

This demo application showcases how to integrate the Phantom SDK with the Wallet Standard protocol, providing a universal wallet interface that works across different blockchains and wallet providers.

## Features

- 🌐 **Universal Wallet Standard** - Uses the cross-chain Wallet Standard protocol
- 👻 **Phantom's Invisible Wallet** - No extension required, wallet runs embedded in your app
- 💰 **SOL Balance Display** - Real-time balance with refresh capability
- ✍️ **Message Signing** - Sign arbitrary messages with your wallet
- 📝 **Transaction Signing** - Sign transactions without sending them
- 📤 **Transaction Sending** - Sign and send transactions to the network
- 🎨 **Clean, Responsive UI** - Modern interface with wallet adapter components

## Prerequisites

- Node.js 16+ and Yarn
- A Phantom App ID from [phantom.com/portal](https://phantom.com/portal)

## Setup

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Configure your app ID:
   Update the `appId` in `src/hooks/useInitWalletStandard.ts`:

   ```typescript
   const config: BrowserSDKConfig = {
     appId: "your-app-id-from-phantom-portal", // Replace with your actual App ID
     // ... other config options
   };
   ```

3. Run the development server:

   ```bash
   yarn dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Configuration Options

### BrowserSDKConfig

The wallet is configured in `src/hooks/useInitWalletStandard.ts`:

| Option               | Type                            | Description                            |
| -------------------- | ------------------------------- | -------------------------------------- |
| `appId`              | `string`                        | Your app ID from Phantom Portal        |
| `embeddedWalletType` | `'app-wallet' \| 'user-wallet'` | Type of embedded wallet to use         |
| `apiBaseUrl`         | `string`                        | API base URL for the embedded provider |
| `autoConnect`        | `boolean`                       | Automatically connect returning users  |

### Wallet Types

- **`app-wallet`**: A wallet scoped to your application. Each app has its own wallet instance.
- **`user-wallet`**: A user's universal Phantom wallet that works across all apps.

## How It Works

This demo uses the `@phantom/sdk-wallet-standard` package which implements the universal Wallet Standard protocol. Key differences from wallet adapters:

1. **Universal Protocol**: Works across different blockchains, not just Solana
2. **Standard Interface**: Follows the Wallet Standard specification for cross-wallet compatibility
3. **Future-Proof**: Built on emerging standards adopted by multiple wallet providers
4. **Automatic Discovery**: Wallets are automatically discovered and registered with the application

## Architecture

### Wallet Standard Integration

The app initializes the Phantom SDK Wallet Standard implementation:

```typescript
// Initialize wallet standard
initialize(config);

// Wallet automatically registers itself and becomes available
// in the wallet adapter UI components
```

### Key Components

#### App.tsx

Sets up the standard wallet adapter providers. The Phantom wallet appears automatically in the wallet selection UI once initialized.

#### useInitWalletStandard.ts

Custom hook that initializes the Phantom SDK Wallet Standard with your app configuration.

#### WalletInfo.tsx

Displays connected wallet information including address and SOL balance.

#### WalletActions.tsx

Provides buttons for wallet operations:

- Sign Message
- Sign Transaction (without sending)
- Send Transaction (0.000001 SOL self-transfer)

#### useBalance.ts

Custom hook for fetching and tracking SOL balance.

## Wallet Standard vs Wallet Adapter

| Feature             | Wallet Standard        | Wallet Adapter     |
| ------------------- | ---------------------- | ------------------ |
| **Protocol**        | Universal cross-chain  | Solana-specific    |
| **Discovery**       | Automatic registration | Manual wallet list |
| **Future Support**  | Multi-chain ready      | Solana only        |
| **Standardization** | Industry standard      | Solana ecosystem   |

## Testing Transactions

The demo includes transaction functionality that requires a small amount of SOL for gas fees. The "Send Transaction" button performs a self-transfer of 0.000001 SOL to demonstrate transaction signing and sending.

## Troubleshooting

### Connection Issues

- Ensure cookies are enabled in your browser
- Verify your App ID is correct and active in Phantom Portal
- Check the browser console for error messages
- Make sure the staging URLs are accessible

### Wallet Not Appearing

- Check that `initialize()` is called before the wallet selection UI renders
- Verify the BrowserSDKConfig is properly configured
- Ensure the app ID matches your Phantom Portal configuration

### Transaction Failures

- Ensure you have sufficient SOL balance for gas fees
- The demo is configured for staging/testnet by default
- Check network connectivity and try again

## Development Environment

This demo is configured for Phantom's staging environment:

- API Base URL: `https://staging-api.phantom.app/v1/wallets`
- Auth URL: `https://staging-connect.phantom.app/login`

For production, update the URLs in `useInitWalletStandard.ts` to use production endpoints.

## Learn More

- [Phantom SDK Documentation](https://docs.phantom.app)
- [Wallet Standard Specification](https://github.com/wallet-standard/wallet-standard)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

## Support

- [Discord](https://discord.gg/phantom)
- [GitHub Issues](https://github.com/phantom/wallet-sdk/issues)
- [Phantom Developer Portal](https://phantom.com/portal)
