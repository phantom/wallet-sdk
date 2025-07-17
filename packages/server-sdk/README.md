# Phantom Server SDK

The Phantom Server SDK enables secure wallet creation, message signing and transaction signing and submission for your applications.

## Installation

```bash
npm install @phantom/server-sdk
```

## Configuration

To get started, initialize the SDK with your credentials:

```typescript
import { ServerSDK } from '@phantom/server-sdk';

const sdk = new ServerSDK({
  apiPrivateKey: 'your-private-key',  // Base58 encoded private key
  organizationId: 'your-org-id',      // Your organization ID
  apiBaseUrl: 'https://api.phantom.app/wallet'
});
```

## Network Identifiers

The SDK provides user-friendly enums for CAIP-2 network identifiers:

```typescript
import { NetworkId } from '@phantom/server-sdk';

// Use the NetworkId enum for easy access to CAIP-2 identifiers
const solanaMainnet = NetworkId.SOLANA_MAINNET; // 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
const ethMainnet = NetworkId.ETHEREUM_MAINNET;  // 'eip155:1'
const polygonMainnet = NetworkId.POLYGON_MAINNET; // 'eip155:137'

// Example usage with SDK methods
const result = await sdk.signAndSendTransaction(
  walletId,
  transaction,
  NetworkId.SOLANA_MAINNET  // Instead of hardcoding 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
);

// Sign a message on Ethereum
const signature = await sdk.signMessage(
  walletId,
  'Hello World',
  NetworkId.ETHEREUM_MAINNET
);


```

### Available Networks

| Network | Enum Value | CAIP-2 ID |
|---------|-----------|-----------|
| **Solana** | | |
| Mainnet | `NetworkId.SOLANA_MAINNET` | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| Devnet | `NetworkId.SOLANA_DEVNET` | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| Testnet | `NetworkId.SOLANA_TESTNET` | `solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z` |
| **Ethereum** | | |
| Mainnet | `NetworkId.ETHEREUM_MAINNET` | `eip155:1` |
| Goerli | `NetworkId.ETHEREUM_GOERLI` | `eip155:5` |
| Sepolia | `NetworkId.ETHEREUM_SEPOLIA` | `eip155:11155111` |
| **Polygon** | | |
| Mainnet | `NetworkId.POLYGON_MAINNET` | `eip155:137` |
| Mumbai | `NetworkId.POLYGON_MUMBAI` | `eip155:80001` |
| **Arbitrum** | | |
| One | `NetworkId.ARBITRUM_ONE` | `eip155:42161` |
| Goerli | `NetworkId.ARBITRUM_GOERLI` | `eip155:421613` |
| **Base** | | |
| Mainnet | `NetworkId.BASE_MAINNET` | `eip155:8453` |
| Sepolia | `NetworkId.BASE_SEPOLIA` | `eip155:84532` |

## CAIP-2 Network Identifiers

This SDK uses the CAIP-2 (Chain Agnostic Improvement Proposal 2) standard for network identifiers. CAIP-2 provides a standardized way to identify blockchain networks across different ecosystems.

### Format
CAIP-2 identifiers follow the format: `namespace:reference`

### Common Network IDs
- **Solana Mainnet**: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`
- **Solana Devnet**: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- **Ethereum Mainnet**: `eip155:1`
- **Polygon Mainnet**: `eip155:137`
- **Arbitrum One**: `eip155:42161`
- **Base Mainnet**: `eip155:8453`

## Methods

### createWallet(walletName?: string)
Creates a new wallet in your organization. Each wallet supports multiple chains.

```typescript
const wallet = await sdk.createWallet('My Main Wallet');
// Returns: { 
//   walletId: 'wallet-uuid',
//   addresses: [
//     { addressType: 'Solana', address: '...' },
//     { addressType: 'Ethereum', address: '...' },
//     { addressType: 'BitcoinSegwit', address: '...' },
//     { addressType: 'Sui', address: '...' }
//   ]
// }
```

### signAndSendTransaction(walletId: string, transaction: Uint8Array, networkId: string)
Signs a transaction and tries to submits it to the blockchain. The SDK automatically handles network-specific requirements.
If the networkId is not supported for sending, the transaction will only be signed.

```typescript
import { NetworkId } from '@phantom/server-sdk';

const transactionBuffer = new Uint8Array([...]); // Your serialized transaction
const result = await sdk.signAndSendTransaction(
  'wallet-id',
  transactionBuffer,
  NetworkId.SOLANA_MAINNET
);

// Returns: { 
//   rawTransaction: 'base64-signed-transaction'
//   txHash: 'tx-hash-string'
// }

// Extract the transaction signature (hash)
// Note: requires 'import bs58 from "bs58"'
const signedTx = Transaction.from(Buffer.from(result.rawTransaction, 'base64'));
const signature = signedTx.signature 
  ? bs58.encode(signedTx.signature)
  : bs58.encode(signedTx.signatures[0].signature);
```

### signMessage(walletId: string, message: string, networkId: string)
Signs a message with the specified wallet.

```typescript
const signature = await sdk.signMessage(
  'wallet-id', 
  'Hello World', 
  NetworkId.SOLANA_MAINNET
);
// Returns: base64 encoded signature
```

### getWallets(limit?: number, offset?: number)
Retrieves all wallets for your organization with pagination support.

```typescript
// Get first 10 wallets
const result = await sdk.getWallets(10, 0);
// Returns: {
//   wallets: [{ walletId: '...', walletName: '...' }, ...],
//   totalCount: 25,
//   limit: 10,
//   offset: 0
// }

// Get all wallets (default limit: 20)
const allWallets = await sdk.getWallets();
```

### getWalletAddresses(walletId: string, derivationPaths?: string[])
Retrieves addresses for a specific wallet across different blockchains.

```typescript
const addresses = await sdk.getWalletAddresses('wallet-id');
// Returns: [
//   { addressType: 'Solana', address: '...' },
//   { addressType: 'Ethereum', address: '...' },
//   { addressType: 'Bitcoin', address: '...' },
//   { addressType: 'Sui', address: '...' }
// ]
```

## CAIP-2 Utility Functions

The SDK exports several utility functions for working with CAIP-2 network identifiers:

```typescript
import {
  deriveSubmissionConfig,
  supportsTransactionSubmission,
  getNetworkDescription,
  getSupportedNetworkIds,
  getNetworkIdsByChain
} from '@phantom/server-sdk';

// Check if a network supports transaction submission
if (supportsTransactionSubmission('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')) {
  // Network supports automatic transaction submission
}

// Get human-readable network description
const description = getNetworkDescription('eip155:137'); // "Polygon Mainnet"

// List all supported networks
const allNetworks = getSupportedNetworkIds();

// Get networks for a specific chain
const solanaNetworks = getNetworkIdsByChain('solana');
// ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', ...]
```

## Security Best Practices

- **Never expose your private key** in client-side code or commit it to version control
- Store your credentials securely using environment variables or secret management systems
- Each wallet is isolated and can only be accessed by your organization
- All API requests are authenticated using cryptographic signatures

## Error Handling

All SDK methods throw descriptive errors when operations fail:

```typescript
try {
  const wallet = await sdk.createWallet();
} catch (error) {
  console.error('Failed to create wallet:', error.message);
}
```

## Support

For detailed integration examples and best practices, see the [Integration Guide](./INTEGRATION.md).