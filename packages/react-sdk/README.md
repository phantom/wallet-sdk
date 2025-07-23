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
      embeddedWalletType: 'new-wallet', // or 'phantom-wallet' (default: 'new-wallet')
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
  embeddedWalletType: 'phantom-wallet', // Use pre-funded Phantom wallets
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
import { useSignMessage, NetworkId } from '@phantom/react-sdk';

function SignMessage() {
  const { signMessage, isSigning, error } = useSignMessage();

  const handleSign = async () => {
    // Convert message to base64url
    const message = Buffer.from('Hello Phantom!').toString('base64url');
    
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
import { useSignAndSendTransaction, NetworkId } from '@phantom/react-sdk';

function SendTransaction() {
  const { signAndSendTransaction, isSigning, error } = useSignAndSendTransaction();

  const handleSend = async () => {
    // Transaction should be base64url encoded
    const transaction = 'your-base64url-encoded-transaction';
    
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

**`new-wallet`** (default)
- Creates a completely new, empty wallet
- Non-custodial - user has full control
- User needs to fund the wallet before use
- Ideal for new users starting fresh

**`phantom-wallet`**
- Provides access to Phantom-managed wallets
- Wallets come pre-funded for testing/demo purposes
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
  embeddedWalletType?: 'new-wallet' | 'phantom-wallet'; // Default: 'new-wallet'
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

All messages and transactions must be base64url encoded before passing to the SDK methods:

```typescript
// Encoding a message
const message = Buffer.from('Hello World').toString('base64url');

// Encoding a transaction (example for Solana)
const transaction = Buffer.from(transactionBytes).toString('base64url');
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