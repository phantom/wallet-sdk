# @phantom/sdk-wallet-standard

A Wallet Standard implementation for Phantom's Browser SDK, enabling seamless integration of Phantom's invisible wallet with any application using the universal Wallet Standard protocol.

## Features

- 🌐 **Universal Wallet Standard** - Implements the cross-chain Wallet Standard specification
- 👻 **Invisible Wallet** - No extension required, wallet runs embedded in your app
- 🔐 **Secure** - Uses Phantom's secure embedded wallet infrastructure
- 🔄 **Auto-Connect** - Automatically reconnects returning users with existing sessions
- 📱 **Cross-Platform** - Works on any browser, no extension needed
- 🔗 **Chain Agnostic** - Built for future multi-chain support

## Installation

```bash
yarn add @phantom/sdk-wallet-standard @phantom/browser-sdk @solana/web3.js
```

or

```bash
npm install @phantom/sdk-wallet-standard @phantom/browser-sdk @solana/web3.js
```

## Quick Start

### Basic Usage

```typescript
import { initialize } from "@phantom/sdk-wallet-standard";
import { AddressType } from "@phantom/browser-sdk";

// Initialize the Phantom wallet with Wallet Standard
initialize({
  providerType: "embedded",
  addressTypes: [AddressType.solana],
  appId: "your-app-id-from-phantom-portal",
  embeddedWalletType: "app-wallet", // or 'user-wallet'
});

// The Phantom wallet will now be automatically available
// in any Wallet Standard compatible interface
```

### With React and Wallet Adapter

```typescript
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { initialize } from '@phantom/sdk-wallet-standard';
import { AddressType } from '@phantom/browser-sdk';
import { clusterApiUrl } from '@solana/web3.js';

// Import default styles
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Initialize Phantom wallet standard
  useEffect(() => {
    initialize({
      providerType: 'embedded',
      addressTypes: [AddressType.solana],
      appId: 'your-app-id-from-phantom-portal',
      embeddedWalletType: 'app-wallet',
    });
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          {/* Your app here - Phantom wallet will appear in wallet selection */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### Direct Wallet Standard Usage

```typescript
import { getWallets } from "@wallet-standard/core";
import type { Wallet } from "@wallet-standard/core";

// Get all available wallets (including Phantom after initialization)
const wallets = getWallets().get();

// Find Phantom wallet
const phantomWallet = wallets.find(wallet => wallet.name === "Embedded Wallet");

if (phantomWallet) {
  // Connect to the wallet
  await phantomWallet.features["standard:connect"].connect();

  // Sign a message
  const message = new TextEncoder().encode("Hello Phantom!");
  const result = await phantomWallet.features["solana:signMessage"].signMessage({
    account: phantomWallet.accounts[0],
    message,
  });
}
```

## Configuration

### BrowserSDKConfig

| Option               | Type                            | Required | Default            | Description                                                       |
| -------------------- | ------------------------------- | -------- | ------------------ | ----------------------------------------------------------------- |
| `appId`              | `string`                        | Yes      | -                  | Your app ID from [phantom.com/portal](https://phantom.com/portal) |
| `providerType`       | `'embedded'`                    | Yes      | -                  | Must be 'embedded' for wallet standard                            |
| `addressTypes`       | `AddressType[]`                 | Yes      | -                  | Array of address types (currently `[AddressType.solana]`)         |
| `embeddedWalletType` | `'app-wallet' \| 'user-wallet'` | No       | `'app-wallet'`     | Type of embedded wallet to use                                    |
| `apiBaseUrl`         | `string`                        | No       | Production API URL | API base URL for the embedded provider                            |
| `authOptions`        | `object`                        | No       | -                  | Authentication configuration options                              |
| `autoConnect`        | `boolean`                       | No       | `false`            | Automatically connect returning users                             |

### Wallet Types

- **`app-wallet`**: A wallet scoped to your application. Each app has its own wallet instance.
- **`user-wallet`**: A user's universal Phantom wallet that works across all apps.

## Wallet Standard Features

This implementation supports the following Wallet Standard features:

### Core Features

- `standard:connect` - Connect to the wallet
- `standard:disconnect` - Disconnect from the wallet
- `standard:events` - Listen for wallet events

### Solana Features

- `solana:signAndSendTransaction` - Sign and send transactions
- `solana:signTransaction` - Sign transactions without sending
- `solana:signMessage` - Sign arbitrary messages

### Supported Transaction Versions

- Legacy transactions
- Version 0 transactions (Address Lookup Tables)

## Events

The wallet emits standard Wallet Standard events:

```typescript
import { getWallets } from "@wallet-standard/core";

const wallets = getWallets();

// Listen for new wallets being registered
wallets.on("register", wallet => {
  if (wallet.name === "Embedded Wallet") {
    console.log("Phantom wallet registered");
  }
});

// Listen for wallet changes
phantomWallet.features["standard:events"].on("change", ({ accounts, chains, features }) => {
  console.log("Wallet state changed", { accounts, chains, features });
});
```

## Auto-Connect

The wallet supports auto-connect for returning users with existing sessions:

```typescript
initialize({
  appId: "your-app-id",
  providerType: "embedded",
  addressTypes: [AddressType.solana],
  autoConnect: true, // Enable auto-connect
});
```

Auto-connect will:

1. Attempt to restore an existing session
2. Automatically connect the user if a valid session exists
3. Emit connection events when successful

## Signing Transactions

### Sign and Send Transaction

```typescript
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(phantomWallet.accounts[0].address),
    toPubkey: new PublicKey("recipient-address"),
    lamports: 1000000, // 0.001 SOL
  }),
);

const result = await phantomWallet.features["solana:signAndSendTransaction"].signAndSendTransaction({
  account: phantomWallet.accounts[0],
  chain: "solana:mainnet",
  transaction: transaction.serialize(),
});

console.log("Transaction signature:", result.signature);
```

### Sign Transaction (without sending)

```typescript
const result = await phantomWallet.features["solana:signTransaction"].signTransaction({
  account: phantomWallet.accounts[0],
  chain: "solana:mainnet",
  transaction: transaction.serialize(),
});

const signedTransaction = Transaction.from(result.signedTransaction);
```

### Sign Message

```typescript
const message = new TextEncoder().encode("Hello Phantom!");

const result = await phantomWallet.features["solana:signMessage"].signMessage({
  account: phantomWallet.accounts[0],
  message,
});

console.log("Message signature:", result.signature);
```

## Getting Your App ID

1. Visit [phantom.com/portal](https://phantom.com/portal)
2. Sign up or log in to your account
3. Create a new app
4. Copy your App ID from the dashboard
5. Use it to initialize the wallet standard

## Wallet Standard vs Wallet Adapter

| Feature                  | Wallet Standard        | Wallet Adapter       |
| ------------------------ | ---------------------- | -------------------- |
| **Protocol**             | Universal cross-chain  | Solana-specific      |
| **Discovery**            | Automatic registration | Manual wallet list   |
| **Standardization**      | W3C-incubated standard | Solana ecosystem     |
| **Future Compatibility** | Multi-chain ready      | Solana only          |
| **Wallet Detection**     | Event-driven           | Static configuration |

## Migration from Wallet Adapter

If you're using `@phantom/sdk-wallet-adapter`:

```typescript
// Before (Wallet Adapter)
import { PhantomSDKWalletAdapter } from "@phantom/sdk-wallet-adapter";
const wallet = new PhantomSDKWalletAdapter({
  appId: "your-app-id",
});

// After (Wallet Standard)
import { initialize } from "@phantom/sdk-wallet-standard";
initialize({
  appId: "your-app-id",
  providerType: "embedded",
  addressTypes: [AddressType.solana],
});
// Wallet automatically appears in wallet selection UI
```

## Network Support

Currently supports Solana mainnet, devnet, and testnet. The wallet will automatically use the network configured in your connection provider.

## TypeScript

The package is fully typed with TypeScript:

```typescript
import type { BrowserSDKConfig } from "@phantom/browser-sdk";
import type { Wallet, WalletEventsWindow } from "@wallet-standard/core";
```

## Browser Support

Works in all modern browsers without requiring any extensions:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Security

- Private keys are managed securely by Phantom's infrastructure
- No sensitive data stored in localStorage or cookies
- All communication with Phantom servers is encrypted
- User authentication via secure OAuth flow

## Troubleshooting

### Wallet Not Appearing

If the Phantom wallet doesn't appear in wallet selection:

1. Ensure `initialize()` is called before wallet UI renders
2. Verify your `appId` is valid and active
3. Check browser console for error messages
4. Confirm all required dependencies are installed

### Connection Issues

If users cannot connect:

1. Verify cookies are enabled (required for session management)
2. Check that your App ID is correct in Phantom Portal
3. Ensure the user's browser is supported
4. Look for network connectivity issues

### Auto-Connect Not Working

Auto-connect requires:

- An existing session from a previous connection
- Cookies enabled in the browser
- Same `appId` and `embeddedWalletType` configuration
- `autoConnect: true` in the configuration

### Transaction Failures

Common causes:

- Insufficient balance for transaction + fees
- Invalid transaction construction
- Network congestion (retry with higher priority fee)
- Unsupported transaction version

## Example Apps

Check out the `examples/` directory for complete example applications:

- **Wallet Standard Demo**: Full React app showing Wallet Standard integration
- **Wallet Adapter Demo**: Comparison with traditional wallet adapter approach

## Contributing

See the main repository's [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Support

- [Documentation](https://docs.phantom.app)
- [Discord](https://discord.gg/phantom)
- [Twitter](https://twitter.com/phantom)
- [GitHub Issues](https://github.com/phantom/wallet-sdk/issues)
- [Developer Portal](https://phantom.com/portal)
