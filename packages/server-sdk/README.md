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
  apiBaseUrl: 'https://api.phantom.app/v1/kms/rpc'
});
```

## Methods

### createWallet(walletName?: string)
Creates a new wallet with an optional name. If no name is provided, a default name with timestamp is used.
After creation, it retrieves the public key by signing an empty payload.

```typescript
const wallet = await sdk.createWallet('My Main Wallet');
// Returns: { 
//   walletId: 'wallet-uuid',
//   addresses: [{ networkId: 'solana:101', address: 'public-key' }]
// }
```

### signAndSendTransaction(walletId: string, transaction: Transaction)
Signs a transaction using the wallet service. The transaction should be base64 encoded.

```typescript
const result = await sdk.signAndSendTransaction('wallet-id', {
  from: 'sender-address',
  to: 'recipient-address',
  data: 'base64-encoded-transaction',
  networkId: 'solana:101'
});
// Returns: { 
//   txHash: 'transaction-hash',
//   signature: 'transaction-signature',
//   rawTransaction: 'base64-signed-transaction'
// }
```

### signMessage(walletId: string, message: string, networkId: string)
Signs a message with the specified wallet using the signRawPayload method.

```typescript
const signature = await sdk.signMessage('wallet-id', 'Hello World', 'solana:101');
// Returns: base64 encoded signature
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