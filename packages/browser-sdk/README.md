# @phantom/browser-sdk

Browser SDK for Phantom Wallet with a unified interface for both injected and embedded wallets.

## Installation

```bash
npm install @phantom/browser-sdk
# or
yarn add @phantom/browser-sdk
```

## Features

- Support for both injected (browser extension) and embedded (iframe) wallets
- Multi-network support (Solana, Ethereum, Polygon, etc.)
- Base64url encoding for all messages and transactions
- TypeScript support

## Usage

### Injected Wallet (Browser Extension)

```typescript
import { BrowserSDK, NetworkId, stringToBase64url } from '@phantom/browser-sdk';

// Initialize SDK with injected provider
const sdk = new BrowserSDK({
  providerType: 'injected',
  appName: 'My DApp',
});

// Connect to wallet
const { addresses } = await sdk.connect();
console.log('Connected addresses:', addresses);

// Sign a message
const message = stringToBase64url('Hello from Browser SDK!');
const signature = await sdk.signMessage(message, NetworkId.SOLANA_MAINNET);
console.log('Signature:', signature);

// Sign and send transaction
const transaction = base64urlEncode(transactionBytes);
const result = await sdk.signAndSendTransaction(transaction, NetworkId.SOLANA_MAINNET);
console.log('Transaction sent:', result.rawTransaction);

// Disconnect
await sdk.disconnect();
```

### Embedded Wallet

```typescript
import { BrowserSDK, NetworkId } from '@phantom/browser-sdk';

// Initialize SDK with embedded provider
const sdk = new BrowserSDK({
  providerType: 'embedded',
  appName: 'My DApp',
  apiBaseUrl: 'https://api.phantom.com',
  organizationId: 'your-org-id',
  authUrl: 'https://auth.phantom.com',
  embeddedWalletType: 'app-wallet', // or 'user-wallet'
});

// Connect creates or restores session
const { walletId, addresses } = await sdk.connect();
console.log('Wallet ID:', walletId);
console.log('Addresses:', addresses);

// Use the same methods as injected
const signature = await sdk.signMessage(message, NetworkId.ETHEREUM_MAINNET);
```

## API Reference

### Constructor

```typescript
new BrowserSDK(config: BrowserSDKConfig)
```

#### BrowserSDKConfig

```typescript
interface BrowserSDKConfig {
  providerType: 'injected' | 'embedded';
  appName?: string;
  // Required for embedded provider
  apiBaseUrl?: string;
  organizationId?: string;
  authUrl?: string;
  embeddedWalletType?: 'app-wallet' | 'user-wallet';
}
```

### Methods

#### connect()

Connect to the wallet. For embedded wallets, this creates or restores a session.

```typescript
const result = await sdk.connect();
// result.walletId - Only for embedded wallets
// result.addresses - Array of wallet addresses
```

#### disconnect()

Disconnect from the wallet. For embedded wallets, this clears the session.

```typescript
await sdk.disconnect();
```

#### signMessage(message, networkId)

Sign a base64url encoded message.

```typescript
const signature = await sdk.signMessage(
  stringToBase64url('Hello World'),
  NetworkId.SOLANA_MAINNET
);
```

#### signAndSendTransaction(transaction, networkId)

Sign and send a base64url encoded transaction.

```typescript
const result = await sdk.signAndSendTransaction(
  base64urlEncode(transactionBytes),
  NetworkId.ETHEREUM_MAINNET
);
```

#### getAddresses()

Get the connected wallet addresses.

```typescript
const addresses = await sdk.getAddresses();
// [{ addressType: 'Solana', address: '...' }]
```

#### isConnected()

Check if the wallet is connected.

```typescript
const connected = sdk.isConnected();
```

#### getWalletId()

Get the wallet ID (only for embedded wallets).

```typescript
const walletId = sdk.getWalletId();
```

## Network Support

### Injected Wallets
- **Solana**: Full support for all Solana networks
- **Ethereum**: Support for Ethereum and EVM-compatible chains
- **Other networks**: Will be added based on Phantom wallet support

### Embedded Wallets
- All networks supported by the Phantom API

## Base64URL Utilities

The SDK exports utility functions for base64url encoding/decoding:

```typescript
import { 
  stringToBase64url,
  base64urlEncode,
  base64urlDecode,
  base64urlDecodeToString 
} from '@phantom/browser-sdk';

// Convert string to base64url
const encoded = stringToBase64url('Hello World');

// Encode bytes to base64url
const encoded = base64urlEncode(new Uint8Array([1, 2, 3]));

// Decode base64url to bytes
const bytes = base64urlDecode(encoded);

// Decode base64url to string
const decoded = base64urlDecodeToString(encoded);
```

## Creating Transactions

### Solana with @solana/web3.js

```typescript
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { base64urlEncode } from '@phantom/browser-sdk';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(fromAddress),
    toPubkey: new PublicKey(toAddress),
    lamports: 0.001 * LAMPORTS_PER_SOL
  })
);

const serialized = transaction.serialize({
  requireAllSignatures: false,
  verifySignatures: false
});

const transactionBase64 = base64urlEncode(serialized);
```

### Solana with @solana/kit

```typescript
import { compileTransaction } from '@solana/kit';
import { base64urlEncode } from '@phantom/browser-sdk';

const transaction = compileTransaction(transactionMessage);
const transactionBase64 = base64urlEncode(transaction.messageBytes);
```

## Session Management (Embedded Wallets)

Embedded wallets automatically manage sessions using IndexedDB:

1. **First connect**: Creates new session with iframe authentication
2. **Subsequent connects**: Restores existing session
3. **Disconnect**: Clears session data

## Examples

See the [examples](../../examples) directory for complete working examples.