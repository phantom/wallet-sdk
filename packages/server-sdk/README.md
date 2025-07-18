# Phantom Server SDK

The Phantom Server SDK provides a secure and straightforward way to create and manage wallets, sign transactions, and interact with multiple blockchains from your backend services. This SDK is designed for server-side applications that need programmatic access to Phantom's wallet infrastructure.

## Features

- 🔐 **Secure wallet creation and management** - Create wallets programmatically with enterprise-grade security
- ✍️ **Transaction signing** - Sign and optionally submit transactions across multiple blockchains
- 📝 **Message signing** - Sign arbitrary messages for authentication or verification
- 🌐 **Multi-chain support** - Works with Solana, Ethereum, Polygon, Sui, Bitcoin, Base and other major blockchains
- 🔑 **Ed25519 authentication** - Secure API authentication using cryptographic signatures
- 📊 **Wallet listing and pagination** - Efficiently manage large numbers of wallets

## Installation

Install the Server SDK using your preferred package manager:

```bash
npm install @phantom/server-sdk
```

```bash
yarn add @phantom/server-sdk
```

```bash
pnpm add @phantom/server-sdk
```

## Prerequisites

Before using the SDK, you need:

1. **Phantom Organization Credentials**
   - Organization ID
   - Organization Private Key (base58 encoded)
   - API Base URL
   
   These credentials are provided when you create an organization with Phantom.

2. **Node.js** version 16 or higher

## Security First

The private key for your organization is meant to be stored **ONLY on your server** in a secure environment.

- **NEVER expose this key in client-side code**
- **NEVER commit it to version control**
- **Always use environment variables or secret management systems**


## Quick Start

### 1. Set up Environment Variables

Create a `.env` file in your project root:

```env
PHANTOM_ORGANIZATION_ID=your-organization-id
PHANTOM_PRIVATE_KEY=your-base58-encoded-private-key
PHANTOM_API_URL=https://api.phantom.app/wallet
```

### 2. Initialize the SDK

```typescript
import { ServerSDK, NetworkId } from '@phantom/server-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the SDK
const sdk = new ServerSDK({
  organizationId: process.env.PHANTOM_ORGANIZATION_ID!,
  apiPrivateKey: process.env.PHANTOM_PRIVATE_KEY!,
  apiBaseUrl: process.env.PHANTOM_API_URL!
});

// Create a wallet
const wallet = await sdk.createWallet('My First Wallet');
console.log('Wallet ID:', wallet.walletId);
console.log('Addresses:', wallet.addresses);

// Sign a message
const signature = await sdk.signMessage(
  wallet.walletId,
  'Hello, Phantom!',
  NetworkId.SOLANA_MAINNET
);
console.log('Signature:', signature);
```

## Usage Examples

### Creating a Wallet

```typescript
// Create a wallet with a custom name
const wallet = await sdk.createWallet('User Wallet 123');

// Access addresses for different chains
const solanaAddress = wallet.addresses.find(
  addr => addr.addressType === 'Solana'
)?.address;

const ethereumAddress = wallet.addresses.find(
  addr => addr.addressType === 'Ethereum'
)?.address;

console.log('Solana address:', solanaAddress);
console.log('Ethereum address:', ethereumAddress);
```

### Signing and Sending Transactions

```typescript
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

// Create a Solana transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(solanaAddress),
    toPubkey: new PublicKey(recipientAddress),
    lamports: 1000000 // 0.001 SOL
  })
);

// Set transaction parameters
transaction.recentBlockhash = blockhash;
transaction.feePayer = new PublicKey(solanaAddress);

// Serialize the transaction
const serializedTx = transaction.serialize({
  requireAllSignatures: false,
  verifySignatures: false
});

// Sign and send the transaction
const signedTx = await sdk.signAndSendTransaction(
  wallet.walletId,
  serializedTx,
  NetworkId.SOLANA_MAINNET
);

console.log('Signed transaction:', signedTx.rawTransaction);
```

### Signing Messages

```typescript
// Sign a message for Solana
const solanaSignature = await sdk.signMessage(
  wallet.walletId,
  'Please sign this message to authenticate',
  NetworkId.SOLANA_MAINNET
);

// Sign a message for Ethereum
const ethSignature = await sdk.signMessage(
  wallet.walletId,
  'Sign in to our dApp',
  NetworkId.ETHEREUM_MAINNET
);
```

### Managing Wallets

```typescript
// Get all wallets for your organization with pagination
const result = await sdk.getWallets(20, 0); // limit: 20, offset: 0

console.log(`Total wallets: ${result.totalCount}`);
console.log('Wallets:', result.wallets);

// Get addresses for a specific wallet
const addresses = await sdk.getWalletAddresses(walletId);

// Get specific addresses by derivation path
const customAddresses = await sdk.getWalletAddresses(
  walletId,
  ["m/44'/501'/0'/0'", "m/44'/60'/0'/0/0"] // Solana and Ethereum
);
```

## Network Support

The SDK supports multiple blockchain networks through the `NetworkId` enum:

### Solana Networks
- `NetworkId.SOLANA_MAINNET` - Solana Mainnet-Beta
- `NetworkId.SOLANA_DEVNET` - Solana Devnet
- `NetworkId.SOLANA_TESTNET` - Solana Testnet

### Ethereum Networks
- `NetworkId.ETHEREUM_MAINNET` - Ethereum Mainnet
- `NetworkId.ETHEREUM_GOERLI` - Goerli Testnet
- `NetworkId.ETHEREUM_SEPOLIA` - Sepolia Testnet

### Other EVM Networks
- `NetworkId.POLYGON_MAINNET` - Polygon Mainnet
- `NetworkId.POLYGON_MUMBAI` - Mumbai Testnet
- `NetworkId.OPTIMISM_MAINNET` - Optimism Mainnet
- `NetworkId.ARBITRUM_ONE` - Arbitrum One
- `NetworkId.BASE_MAINNET` - Base Mainnet

### Future Support
- `NetworkId.BITCOIN_MAINNET` - Bitcoin Mainnet
- `NetworkId.SUI_MAINNET` - Sui Mainnet

## API Reference

### `new ServerSDK(config)`

Creates a new instance of the SDK.

**Parameters:**
- `config.organizationId` (string) - Your organization ID
- `config.apiPrivateKey` (string) - Your base58-encoded private key
- `config.apiBaseUrl` (string) - The Phantom API endpoint

**Example:**
```typescript
const sdk = new ServerSDK({
  organizationId: 'org_abc123',
  apiPrivateKey: '5Kb8kLf9zgW...',
  apiBaseUrl: 'https://api.phantom.app/wallet'
});
```

### `createWallet(walletName?)`

Creates a new wallet with addresses for multiple blockchains.

**Parameters:**
- `walletName` (string, optional) - Custom name for the wallet

**Returns:** `Promise<CreateWalletResult>`
- `walletId` (string) - Unique identifier for the wallet
- `addresses` (WalletAddress[]) - Array of blockchain addresses

**Example:**
```typescript
const wallet = await sdk.createWallet('Customer Wallet');
```

### `signAndSendTransaction(walletId, transaction, networkId)`

Signs a transaction and optionally submits it to the network.

**Parameters:**
- `walletId` (string) - The wallet ID to sign with
- `transaction` (Uint8Array) - The serialized transaction
- `networkId` (NetworkId) - The target network

**Returns:** `Promise<SignedTransaction>`
- `rawTransaction` (string) - Base64-encoded signed transaction

**Example:**
```typescript
const signed = await sdk.signAndSendTransaction(
  walletId,
  serializedTx,
  NetworkId.SOLANA_MAINNET
);
```

### `signMessage(walletId, message, networkId)`

Signs an arbitrary message.

**Parameters:**
- `walletId` (string) - The wallet ID to sign with
- `message` (string) - The message to sign
- `networkId` (NetworkId) - The network context for signing

**Returns:** `Promise<string>` - Base64-encoded signature

**Example:**
```typescript
const signature = await sdk.signMessage(
  walletId,
  'Authenticate with our service',
  NetworkId.ETHEREUM_MAINNET
);
```

### `getWalletAddresses(walletId, derivationPaths?)`

Retrieves addresses for a wallet.

**Parameters:**
- `walletId` (string) - The wallet ID
- `derivationPaths` (string[], optional) - Custom derivation paths

**Returns:** `Promise<WalletAddress[]>` - Array of addresses

**Example:**
```typescript
const addresses = await sdk.getWalletAddresses(walletId);
```

### `getWallets(limit?, offset?)`

Lists all wallets in your organization.

**Parameters:**
- `limit` (number, optional) - Number of results (default: 20)
- `offset` (number, optional) - Pagination offset (default: 0)

**Returns:** `Promise<GetWalletsResult>`
- `wallets` (Wallet[]) - Array of wallets
- `totalCount` (number) - Total number of wallets
- `limit` (number) - Results per page
- `offset` (number) - Current offset

**Example:**
```typescript
const page1 = await sdk.getWallets(50, 0);
const page2 = await sdk.getWallets(50, 50);
```

## CAIP-2 Network Utilities

The SDK includes utilities for working with CAIP-2 network identifiers:

```typescript
import { 
  deriveSubmissionConfig,
  supportsTransactionSubmission,
  getNetworkDescription,
  getSupportedNetworkIds,
  getNetworkIdsByChain
} from '@phantom/server-sdk';

// Check if a network supports transaction submission
if (supportsTransactionSubmission(NetworkId.SOLANA_MAINNET)) {
  // Network supports automatic transaction submission
}

// Get human-readable network description
const description = getNetworkDescription(NetworkId.ETHEREUM_MAINNET);
// Returns: "Ethereum Mainnet"

// List all supported networks
const allNetworks = getSupportedNetworkIds();

// Get all networks for a specific chain
const solanaNetworks = getNetworkIdsByChain('solana');
// Returns: [SOLANA_MAINNET, SOLANA_DEVNET, SOLANA_TESTNET]
```

## Complete Example

Here's a complete example demonstrating wallet creation and transaction signing:

```typescript
import { ServerSDK, NetworkId } from '@phantom/server-sdk';
import { 
  Connection, 
  Transaction, 
  SystemProgram, 
  PublicKey,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

async function main() {
  // Initialize SDK
  const sdk = new ServerSDK({
    organizationId: process.env.PHANTOM_ORG_ID!,
    apiPrivateKey: process.env.PHANTOM_PRIVATE_KEY!,
    apiBaseUrl: 'https://api.phantom.app/wallet'
  });

  // Create a wallet
  const wallet = await sdk.createWallet('Demo Wallet');
  const solanaAddress = wallet.addresses.find(
    a => a.addressType === 'Solana'
  )?.address!;

  console.log('Created wallet:', wallet.walletId);
  console.log('Solana address:', solanaAddress);

  // Connect to Solana
  const connection = new Connection('https://api.devnet.solana.com');
  
  // Create a transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(solanaAddress),
      toPubkey: new PublicKey(solanaAddress), // Self-transfer
      lamports: 0.001 * LAMPORTS_PER_SOL
    })
  );

  // Set transaction details
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(solanaAddress);

  // Serialize transaction
  const serializedTx = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false
  });

  // Sign and send
  const signed = await sdk.signAndSendTransaction(
    wallet.walletId,
    serializedTx,
    NetworkId.SOLANA_DEVNET
  );

  console.log('Transaction signed:', signed.rawTransaction);
}

main().catch(console.error);
```

### Getting Help

- Review the [demo script](https://github.com/phantom/wallet-sdk/tree/main/examples/server-sdk-examples) for working examples
- Contact Phantom support

## License

This SDK is distributed under the MIT License. See the [LICENSE](../../LICENSE) file for details.

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a history of changes to this package. 

## Integration

For detailed integration examples and best practices, see the [Integration Guide](./INTEGRATION.md).