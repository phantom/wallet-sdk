# @phantom/react-sdk

React SDK for integrating Phantom wallet functionality into React applications.

## Installation

```bash
npm install @phantom/react-sdk
# or
yarn add @phantom/react-sdk
```

## Usage

### Setup Provider

Wrap your application with the `PhantomProvider`:

```tsx
import { PhantomProvider } from '@phantom/react-sdk';

function App() {
  return (
    <PhantomProvider config={{
      walletType: 'injected', // or 'embedded'
      appName: 'My DApp',
      // For embedded wallets:
      apiBaseUrl: 'https://api.phantom.com',
      organizationId: 'your-org-id',
      authUrl: 'https://auth.phantom.com', // Required for embedded auth
      embeddedWalletType: 'app-wallet', // or 'user-wallet' (default: 'app-wallet')
    }}>
      <YourApp />
    </PhantomProvider>
  );
}
```

#### Example: Using Phantom Wallets (Pre-funded)

```tsx
<PhantomProvider config={{
  walletType: 'embedded',
  apiBaseUrl: 'https://api.phantom.com',
  organizationId: 'your-org-id',
  authUrl: 'https://auth.phantom.com',
  embeddedWalletType: 'user-wallet', // Use pre-funded Phantom user wallets
  appName: 'My Demo App',
}}>
  <YourApp />
</PhantomProvider>
```

### Available Hooks

#### useConnect

Connect to a wallet:

```tsx
import { useConnect } from '@phantom/react-sdk';

function ConnectButton() {
  const { connect, isConnecting, error } = useConnect();

  const handleConnect = async () => {
    try {
      await connect();
      // Connection will automatically handle:
      // - For injected: Opens Phantom extension
      // - For embedded: Creates/restores session with iframe auth
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
```

#### useAccounts

Get connected wallet addresses:

```tsx
import { useAccounts } from '@phantom/react-sdk';

function WalletAddresses() {
  const addresses = useAccounts();

  if (!addresses) {
    return <div>Not connected</div>;
  }

  return (
    <div>
      {addresses.map((addr, index) => (
        <div key={index}>
          <strong>{addr.addressType}:</strong> {addr.address}
        </div>
      ))}
    </div>
  );
}
```

#### useDisconnect

Disconnect from wallet:

```tsx
import { useDisconnect } from '@phantom/react-sdk';

function DisconnectButton() {
  const { disconnect, isDisconnecting } = useDisconnect();

  return (
    <button onClick={disconnect} disabled={isDisconnecting}>
      Disconnect
    </button>
  );
}
```

#### useSignMessage

Sign messages with base64url encoding:

```tsx
import { useSignMessage, NetworkId, stringToBase64url } from '@phantom/react-sdk';

function SignMessage() {
  const { signMessage, isSigning, error } = useSignMessage();

  const handleSign = async () => {
    // Convert message to base64url using the provided utility
    const message = stringToBase64url('Hello Phantom!');
    
    try {
      const signature = await signMessage({
        message,
        networkId: NetworkId.SOLANA_MAINNET,
      });
      console.log('Signature:', signature);
    } catch (err) {
      console.error('Failed to sign:', err);
    }
  };

  return (
    <button onClick={handleSign} disabled={isSigning}>
      Sign Message
    </button>
  );
}
```

#### useSignAndSendTransaction

Sign and send transactions with base64url encoding:

```tsx
import { useSignAndSendTransaction, NetworkId, base64urlEncode } from '@phantom/react-sdk';

function SendTransaction() {
  const { signAndSendTransaction, isSigning, error } = useSignAndSendTransaction();

  const handleSend = async () => {
    // Transaction should always be base64url encoded
    const transaction = base64urlEncode(transactionBytes);
    
    try {
      const result = await signAndSendTransaction({
        transaction,
        networkId: NetworkId.SOLANA_MAINNET,
      });
      console.log('Transaction sent:', result.rawTransaction);
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  return (
    <button onClick={handleSend} disabled={isSigning}>
      Send Transaction
    </button>
  );
}
```

### Accessing Context

Use the `usePhantom` hook to access the underlying context:

```tsx
import { usePhantom } from '@phantom/react-sdk';

function WalletInfo() {
  const { connection, isReady } = usePhantom();

  if (!isReady) return <div>Loading...</div>;
  
  if (!connection) return <div>Not connected</div>;

  return (
    <div>
      <p>Connected: {connection.connected ? 'Yes' : 'No'}</p>
      <p>Wallet ID: {connection.walletId || 'N/A (Injected)'}</p>
      <p>Addresses: {connection.addresses.length}</p>
    </div>
  );
}
```

## Architecture

The SDK supports two wallet types:

### Injected Wallets
- Uses the Phantom browser extension
- Currently only supports Solana network
- Direct connection through browser provider

### Embedded Wallets
- Uses iframe authentication flow
- Stores session in IndexedDB
- Supports all networks via server-side signing
- Automatically manages keypairs and sessions

#### Embedded Wallet Types

When using embedded wallets, you can choose between two wallet types:

**`app-wallet`** (default)
- Creates a completely new, empty wallet
- Non-custodial - user has full control
- User needs to fund the wallet before use
- Ideal for new users starting fresh

**`user-wallet`**
- Provides access to Phantom user wallets
- Wallets may be pre-funded by users
- Ideal for demos, testing, or onboarding flows
- Phantom users with existing funded wallets

## Configuration Options

```typescript
interface PhantomSDKConfig {
  walletType?: 'injected' | 'embedded'; // Default: 'injected'
  appName?: string;                      // Your app name
  apiBaseUrl?: string;                   // Required for embedded wallets
  organizationId?: string;               // Required for embedded wallets
  authUrl?: string;                      // Required for embedded wallet auth
  embeddedWalletType?: 'app-wallet' | 'user-wallet'; // Default: 'app-wallet'
}
```

## Network Support

### Injected Wallets
- Currently only supports Solana networks
- Other networks will throw "not implemented" error

### Embedded Wallets
- Supports all networks available in `@phantom/client`:
  - Solana: `SOLANA_MAINNET`, `SOLANA_DEVNET`, `SOLANA_TESTNET`
  - Ethereum: `ETHEREUM_MAINNET`, `ETHEREUM_SEPOLIA`
  - Polygon: `POLYGON_MAINNET`, `POLYGON_MUMBAI`
  - And more...

## Data Encoding

All messages and transactions must be base64url encoded before passing to the SDK methods. The SDK provides utility functions for base64url encoding/decoding that work in browser environments:

```typescript
import { stringToBase64url, base64urlEncode } from '@phantom/react-sdk';

// Encoding a message from string
const message = stringToBase64url('Hello World');

// Encoding transaction bytes
const transaction = base64urlEncode(transactionBytes);
```

### Available Base64URL Utilities

```typescript
// Convert a string to base64url
stringToBase64url(str: string): string

// Encode bytes to base64url
base64urlEncode(data: string | Uint8Array | ArrayLike<number>): string

// Decode base64url to bytes
base64urlDecode(str: string): Uint8Array

// Decode base64url directly to string
base64urlDecodeToString(str: string): string
```

### Creating Transactions

#### Using @solana/web3.js

```typescript
import { 
  Transaction, 
  SystemProgram, 
  PublicKey, 
  Connection,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { base64urlEncode, NetworkId } from '@phantom/react-sdk';

// Create a transaction
const connection = new Connection('https://api.mainnet-beta.solana.com');
const { blockhash } = await connection.getLatestBlockhash();

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(fromAddress),
    toPubkey: new PublicKey(toAddress),
    lamports: 0.001 * LAMPORTS_PER_SOL
  })
);

transaction.recentBlockhash = blockhash;
transaction.feePayer = new PublicKey(fromAddress);

// Serialize and encode for the SDK
const serializedTransaction = transaction.serialize({
  requireAllSignatures: false,
  verifySignatures: false
});

const transactionBase64 = base64urlEncode(serializedTransaction);

// Use with the SDK
const result = await signAndSendTransaction({
  transaction: transactionBase64,
  networkId: NetworkId.SOLANA_MAINNET
});
```

#### Using @solana/kit

```typescript
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from '@solana/kit';
import { base64urlEncode, NetworkId } from '@phantom/react-sdk';

// Create a transaction
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayer(address(fromAddress), tx),
  tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  // Add your instructions here
);

const transaction = compileTransaction(transactionMessage);

// Serialize and encode for the SDK
// The transaction.messageBytes contains the serialized message
const transactionBase64 = base64urlEncode(transaction.messageBytes);

// Use with the SDK
const result = await signAndSendTransaction({
  transaction: transactionBase64,
  networkId: NetworkId.SOLANA_MAINNET
});
```

## Session Management (Embedded Wallets)

The SDK automatically manages sessions for embedded wallets:

1. On first connect:
   - Generates Ed25519 keypair
   - Creates organization (mock in current implementation)
   - Opens iframe for authentication
   - Stores session in IndexedDB

2. On subsequent connects:
   - Restores session from IndexedDB
   - No iframe authentication needed

3. On disconnect:
   - Clears session from IndexedDB
   - Removes client instance