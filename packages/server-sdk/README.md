# Server SDK

This package provides integration with @phantom/openapi-wallet-service for secure wallet management and transaction signing.

## Installation

```bash
npm install @phantom/server-sdk
```

## Configuration

The SDK requires the following configuration:

- `apiPrivateKey`: Your signing key for authentication (base58 encoded)
- `organizationId`: Your organization ID from Phantom
- `apiBaseUrl`: The wallet API endpoint URL

```typescript
import { ServerSDK } from '@phantom/server-sdk';

const sdk = new ServerSDK({
  apiPrivateKey: 'your-signing-key-base58',
  organizationId: 'your-org-id',
  apiBaseUrl: 'https://api.phantom.app/v1'
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
Creates a new wallet with an optional name. If no name is provided, a default name with timestamp is used.
After creation, it retrieves the public key by signing an empty payload.

```typescript
const wallet = await sdk.createWallet('My Main Wallet');
// Returns: { 
//   walletId: 'wallet-uuid',
//   addresses: [{ addressType: 'Solana', address: 'public-key' }]
// }
```

### signAndSendTransaction(walletId: string, transaction: Uint8Array, networkId: string)
Signs a transaction using the wallet service. The transaction should be provided as a Uint8Array and will be encoded as base64 before sending to the KMS.

The SDK automatically derives the submission configuration from the CAIP-2 network ID. If the network supports transaction submission, Phantom will submit the transaction to the blockchain after signing.

**Note:** This method returns only the signed transaction data. To get the transaction hash/signature, you need to extract it from the signed transaction.

```typescript
import { NetworkId } from '@phantom/server-sdk';

const transactionBuffer = new Uint8Array([...]); // Your serialized transaction
const result = await sdk.signAndSendTransaction(
  'wallet-id',
  transactionBuffer,
  NetworkId.SOLANA_MAINNET // Using enum - submission config automatically derived
);

// Returns: { 
//   rawTransaction: 'base64-signed-transaction'
// }

// Extract the transaction signature (hash)
// Note: requires 'import bs58 from "bs58"'
const signedTx = Transaction.from(Buffer.from(result.rawTransaction, 'base64'));
const signature = signedTx.signature 
  ? bs58.encode(signedTx.signature)
  : bs58.encode(signedTx.signatures[0].signature);
```

### signMessage(walletId: string, message: string, networkId: string)
Signs a message with the specified wallet using the signRawPayload method.

```typescript
const signature = await sdk.signMessage(
  'wallet-id', 
  'Hello World', 
  NetworkId.SOLANA_MAINNET // Using enum for CAIP-2 network ID
);
// Returns: base64 encoded signature
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

## Implementation Details

This SDK uses the @phantom/openapi-wallet-service package which provides:
- `createWallet` - Creates a new wallet and retrieves its public key via signRawPayload
- `signTransaction` - Signs transactions with the wallet's private key
- `signRawPayload` - Signs raw payloads/messages and returns signature with public key

The SDK handles:
- Network-specific algorithms and curves automatically
- Standard derivation paths for each blockchain
- Base64 encoding for transaction data
- Authentication via Ed25519 signatures
- CAIP-2 network ID parsing and submission config derivation

## Authentication

The SDK authenticates requests using Ed25519 signatures:
- Each request is signed with your organization's private key
- The signature, public key, and timestamp are added as headers
- This ensures secure communication with the Phantom wallet service


## Notes

- The wallet ID is a UUID assigned by the service when creating the wallet
- Public keys are retrieved using the signRawPayload method with an empty payload
- Transaction hashes are not returned by the signing service - they're generated after blockchain submission
- The service returns the public key that signed the transaction in the signature field
- Default wallet names include a timestamp to ensure uniqueness
- Message signing supports both Solana (Ed25519) and Ethereum (Secp256k1) networks