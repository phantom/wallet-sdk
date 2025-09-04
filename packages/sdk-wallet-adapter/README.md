# @phantom/sdk-wallet-adapter

A Solana Wallet Adapter implementation for Phantom's Browser SDK, enabling seamless integration of Phantom's invisible wallet with any Solana application using the standard wallet adapter interface.

## Features

- 🔌 **Standard Wallet Adapter Interface** - Drop-in replacement for any Solana wallet adapter
- 👻 **Invisible Wallet** - No extension required, wallet runs embedded in your app
- 🔐 **Secure** - Uses Phantom's secure embedded wallet infrastructure
- 🔄 **Auto-Connect** - Automatically reconnects returning users with existing sessions
- 📱 **Cross-Platform** - Works on any browser, no extension needed

## Installation

```bash
yarn add @phantom/sdk-wallet-adapter @solana/web3.js
```

or

```bash
npm install @phantom/sdk-wallet-adapter @solana/web3.js
```

## Quick Start

### Basic Usage

```typescript
import { PhantomSDKWalletAdapter } from '@phantom/sdk-wallet-adapter';

// Initialize the adapter with your app ID from phantom.com/portal
const phantomWallet = new PhantomSDKWalletAdapter({
  appId: 'your-app-id-from-phantom-portal',
});

// Connect to the wallet
await phantomWallet.connect();

// Get the public key
console.log('Connected:', phantomWallet.publicKey?.toString());

// Sign a message
const message = new TextEncoder().encode('Hello Phantom!');
const signature = await phantomWallet.signMessage(message);

// Disconnect
await phantomWallet.disconnect();
```

### With React and Wallet Adapter

```typescript
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomSDKWalletAdapter } from '@phantom/sdk-wallet-adapter';
import { clusterApiUrl } from '@solana/web3.js';

// Import default styles
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomSDKWalletAdapter({
        appId: 'your-app-id-from-phantom-portal',
        embeddedWalletType: 'app-wallet', // or 'user-wallet'
      }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* Your app here */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### With Next.js

```typescript
// app/providers.tsx
'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomSDKWalletAdapter } from '@phantom/sdk-wallet-adapter';
import { clusterApiUrl } from '@solana/web3.js';

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomSDKWalletAdapter({
        appId: process.env.NEXT_PUBLIC_PHANTOM_APP_ID!,
        embeddedWalletType: 'app-wallet',
      }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Configuration

### PhantomSDKWalletAdapterConfig

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `appId` | `string` | Yes | - | Your app ID from [phantom.com/portal](https://phantom.com/portal) |
| `embeddedWalletType` | `'app-wallet' \| 'user-wallet'` | No | `'app-wallet'` | Type of embedded wallet to use |
| `apiBaseUrl` | `string` | No | `'https://api.phantom.com'` | API base URL for the embedded provider |
| `network` | `'mainnet-beta' \| 'devnet' \| 'testnet'` | No | `'mainnet-beta'` | Network to connect to (currently mainnet only) |

### Wallet Types

- **`app-wallet`**: A wallet scoped to your application. Each app has its own wallet instance.
- **`user-wallet`**: A user's universal Phantom wallet that works across all apps.

## Auto-Connect

The adapter supports auto-connect for returning users with existing sessions:

```typescript
const wallets = useMemo(
  () => [
    new PhantomSDKWalletAdapter({
      appId: 'your-app-id',
    }),
  ],
  []
);

// Enable autoConnect in WalletProvider
<WalletProvider wallets={wallets} autoConnect>
  {/* Your app */}
</WalletProvider>
```

## Events

The adapter emits standard wallet adapter events:

```typescript
const wallet = new PhantomSDKWalletAdapter({ appId: 'your-app-id' });

// Listen for connection
wallet.on('connect', (publicKey) => {
  console.log('Connected to wallet:', publicKey.toString());
});

// Listen for disconnection
wallet.on('disconnect', () => {
  console.log('Disconnected from wallet');
});

// Listen for errors
wallet.on('error', (error) => {
  console.error('Wallet error:', error);
});
```

## Signing Transactions

### Sign and Send Transaction

```typescript
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey!,
    toPubkey: new PublicKey('recipient-address'),
    lamports: 1000000, // 0.001 SOL
  })
);

const signature = await wallet.sendTransaction(transaction, connection);
console.log('Transaction signature:', signature);
```

### Sign Transaction (without sending)

```typescript
const signedTransaction = await wallet.signTransaction(transaction);
// You can now send the signed transaction manually
```

### Sign Multiple Transactions

```typescript
const transactions = [transaction1, transaction2, transaction3];
const signedTransactions = await wallet.signAllTransactions(transactions);
```

### Sign Message

```typescript
const message = new TextEncoder().encode('Hello Phantom!');
const signature = await wallet.signMessage(message);
console.log('Message signature:', signature);
```

## Getting Your App ID

1. Visit [phantom.com/portal](https://phantom.com/portal)
2. Sign up or log in to your account
3. Create a new app
4. Copy your App ID from the dashboard
5. Use it to initialize the adapter

## Network Support

Currently, the adapter primarily supports `mainnet-beta`. Support for `devnet` and `testnet` will be added in future versions. The network configuration option is included for future compatibility.

## TypeScript

The adapter is fully typed with TypeScript. All types are exported from the main package:

```typescript
import type { PhantomSDKWalletAdapterConfig } from '@phantom/sdk-wallet-adapter';
```

## Browser Support

The adapter works in all modern browsers without requiring any extensions:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Security

- All private keys are managed securely by Phantom's infrastructure
- No sensitive data is stored in localStorage or cookies
- Communication with Phantom's servers is encrypted
- User authentication happens through secure OAuth flow

## Troubleshooting

### Connection Issues

If users cannot connect:

1. Ensure your `appId` is valid and active
2. Check that cookies are enabled (required for session management)
3. Verify the user's browser is supported
4. Check console for any error messages

### Auto-Connect Not Working

Auto-connect requires:
- An existing session from a previous connection
- Cookies to be enabled
- The same `appId` and `embeddedWalletType` as the original connection

### Transaction Failures

Common causes:
- Insufficient balance for transaction + fees
- Invalid transaction construction
- Network congestion (retry with higher priority fee)

## Example Apps

Check out the `examples/` directory in the monorepo for complete example applications:

- **React Example**: Full React app with wallet adapter integration
- **Next.js Example**: Server-side rendering compatible setup
- **Vanilla JS Example**: Plain JavaScript implementation

## Migration from Extension Wallet

If you're currently using Phantom's extension wallet adapter:

```typescript
// Before (extension)
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
const wallet = new PhantomWalletAdapter();

// After (SDK)
import { PhantomSDKWalletAdapter } from '@phantom/sdk-wallet-adapter';
const wallet = new PhantomSDKWalletAdapter({
  appId: 'your-app-id',
});
```

The API remains the same, only the initialization changes.

## Contributing

See the main repository's [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Support

- [Documentation](https://docs.phantom.app)
- [Discord](https://discord.gg/phantom)
- [Twitter](https://twitter.com/phantom)
- [GitHub Issues](https://github.com/phantom/wallet-sdk/issues)
