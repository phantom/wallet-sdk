# @phantom/parsers

A utility package for parsing and converting transaction formats into base64url format for use with Phantom's API. This package provides a unified interface for handling different blockchain transaction formats across multiple networks.

## Installation

```bash
npm install @phantom/parsers
# or
yarn add @phantom/parsers
```

## Overview

- **`parseToKmsTransaction`** - Converts various transaction formats to base64url for different blockchain networks

## Supported Networks

- **Solana** (`solana:*`)
- **Ethereum/EVM** (`ethereum:*`, `eip155:*`, `polygon:*`, `arbitrum:*`, `optimism:*`, `base:*`, `bsc:*`, `avalanche:*`)
- **Bitcoin** (`bitcoin:*`)
- **Sui** (`sui:*`)

## API Reference

### parseToKmsTransaction(transaction, networkId)

Converts various transaction formats to different encoding based on the target network.

**Parameters:**

- `transaction` (any) - The transaction object/data to parse
- `networkId` (NetworkId) - The target network identifier

**Returns:**

- `Promise<ParsedTransaction>` object with:
  - `base64url` (string) - Base64url encoded transaction
  - `originalFormat` (string) - The detected input format

## Supported Transaction Formats

### Solana

```typescript
import { Transaction } from "@solana/web3.js";
import { parseToKmsTransaction } from "@phantom/parsers";
import { NetworkId } from "@phantom/client";

// Solana Web3.js Transaction
const transaction = new Transaction().add(/* instructions */);
const result = await parseToKmsTransaction(transaction, NetworkId.SOLANA_MAINNET);

// Raw bytes
const rawBytes = new Uint8Array([1, 2, 3, 4]);
const result2 = await parseToKmsTransaction(rawBytes, NetworkId.SOLANA_MAINNET);

// Hex string
const result3 = await parseToKmsTransaction("0x01020304", NetworkId.SOLANA_MAINNET);
```

### Ethereum/EVM

```typescript
import { parseToKmsTransaction } from "@phantom/parsers";
import { NetworkId } from "@phantom/client";

// Viem/Ethers transaction object
const evmTransaction = {
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: 1000000000000000000n, // 1 ETH in wei
  data: "0x",
  gasLimit: 21000n,
  gasPrice: 20000000000n, // 20 gwei
};

const result = await parseToKmsTransaction(evmTransaction, NetworkId.ETHEREUM_MAINNET);

// Raw transaction bytes
const rawTx = new Uint8Array([
  /* transaction bytes */
]);
const result2 = await parseToKmsTransaction(rawTx, NetworkId.ETHEREUM_MAINNET);

// Hex-encoded transaction
const result3 = await parseToKmsTransaction("0xf86c...", NetworkId.ETHEREUM_MAINNET);
```

### Bitcoin

```typescript
import { parseToKmsTransaction } from "@phantom/parsers";
import { NetworkId } from "@phantom/client";

// Raw transaction bytes
const bitcoinTx = new Uint8Array([
  /* bitcoin transaction bytes */
]);
const result = await parseToKmsTransaction(bitcoinTx, NetworkId.BITCOIN_MAINNET);

// Hex-encoded transaction
const result2 = await parseToKmsTransaction("0x0100000001...", NetworkId.BITCOIN_MAINNET);
```

### Sui

```typescript
import { parseToKmsTransaction } from "@phantom/parsers";
import { NetworkId } from "@phantom/client";

// Sui transaction bytes
const suiTx = new Uint8Array([
  /* sui transaction bytes */
]);
const result = await parseToKmsTransaction(suiTx, NetworkId.SUI_MAINNET);
```

## Format Detection

The parsers automatically detect the input format and handle conversion appropriately:

### Message Formats

- **String** - Plain text messages (UTF-8 encoded)
- **Uint8Array/Buffer** - Raw byte data
- **Base64/Base64url** - Already encoded data (re-encoded to base64url)

### Transaction Formats

- **@solana/web3.js** - Solana Web3.js Transaction objects (calls `.serialize()`)
- **@solana/kit** - Solana Kit transaction objects
- **Viem** - Ethereum transaction objects with standard fields
- **Ethers** - Ethereum transaction objects (legacy and modern formats)
- **Raw bytes** - Uint8Array or Buffer containing transaction data
- **Hex strings** - "0x"-prefixed hex-encoded transaction data
- **Base64/Base64url** - Already encoded transaction data

## Cross-Platform Compatibility

The parsers package is designed to work across different JavaScript environments including browsers, Node.js, and React Native. The package gracefully handles missing dependencies and provides consistent parsing functionality across all supported platforms.

## Error Handling

The parsers will throw descriptive errors for:

- Unsupported network identifiers
- Invalid transaction formats for the target network
- Malformed input data
- Encoding/decoding failures

```typescript
try {
  const result = await parseToKmsTransaction(invalidData, "unsupported:network");
} catch (error) {
  console.error("Parsing failed:", error.message);
  // "Unsupported network: unsupported"
}
```

## Integration with Phantom SDKs

This package is used internally by:

- **@phantom/browser-sdk** - For client-side transaction parsing
- **@phantom/server-sdk** - For server-side transaction parsing
- **@phantom/react-sdk** - Through browser-sdk integration

The parsers enable these SDKs to accept native transaction objects from popular libraries like @solana/web3.js, viem, and ethers, providing a seamless developer experience.

## Network ID Format

Network IDs follow the format `{chain}:{network}`:

- Solana: `solana:mainnet-beta`, `solana:devnet`, `solana:testnet`
- Ethereum: `ethereum:1` (mainnet), `ethereum:5` (goerli)
- EIP-155: `eip155:1` (ethereum), `eip155:137` (polygon)
- Bitcoin: `bitcoin:000000000019d6689c085ae165831e93`
- Sui: `sui:mainnet`, `sui:testnet`, `sui:devnet`

## Development

This package is part of the Phantom Wallet SDK monorepo. For development:

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Run tests
yarn test

# Run integration tests (requires RPC access)
yarn test:integration
```

### Integration Tests

The package includes comprehensive integration tests that create real transactions using actual Solana libraries:

- **VersionedTransaction** parsing with `@solana/web3.js`
- **Legacy Transaction** parsing with `@solana/web3.js`
- **@solana/kit** transaction parsing
- Error handling and network resilience

To run integration tests:

1. Copy `.env.example` to `.env`
2. Set `SOLANA_RPC_URL` to your preferred Solana RPC endpoint
3. Run `yarn test:integration`

**Note**: Integration tests make real network calls to fetch recent blockhashes but only create local test transactions (no funds required).

## License

MIT License - see LICENSE file for details.
