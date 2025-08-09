# @phantom/swapper-sdk

SDK for Phantom swap and bridge functionality. This SDK provides a TypeScript interface to the Phantom Swap API, enabling token swaps and cross-chain bridges.

## Installation

```bash
npm install @phantom/swapper-sdk
# or
yarn add @phantom/swapper-sdk
```

## Quick Start

```typescript
import { SwapperSDK, NetworkId } from '@phantom/swapper-sdk';

// Initialize the SDK
const swapper = new SwapperSDK({
  apiUrl: 'https://api.phantom.app', // optional, this is the default
  options: {
    organizationId: 'your-org-id', // from Phantom Portal
    countryCode: 'US', // optional, for geo-blocking
    debug: true, // optional, enables debug logging
  },
});

// Get swap quotes
const quotes = await swapper.getQuotes({
  sellToken: {
    type: 'native',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  buyToken: {
    type: 'address',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  sellAmount: '1000000000',
  from: {
    address: '8B3fBhkpHFMTdaQSfKVREB5HFKnZkT8rL6zKJfmmWDeZ',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  slippageTolerance: 0.5,
});
```

## Configuration

### Default API URL

```
https://api.phantom.app/swap/v2
```

### SDK Configuration

```typescript
interface SwapperSDKConfig {
  apiUrl?: string;         // API base URL (default: https://api.phantom.app)
  timeout?: number;        // Request timeout in ms (default: 30000)
  options?: {
    organizationId?: string;  // Organization ID from Phantom Portal
    countryCode?: string;     // Country code for geo-blocking (e.g., 'US')
    anonymousId?: string;     // Anonymous user ID for analytics
    version?: string;         // Client version
    debug?: boolean;          // Enable debug logging
  };
}
```

**Note:** The `countryCode` option can be used to check if a user is allowed to swap tokens based on their location.

## Token Constants

The SDK provides predefined token constants for easy use. Instead of manually constructing token objects, use the `TOKENS` object:

```typescript
import { SwapperSDK, TOKENS } from '@phantom/swapper-sdk';

// Use predefined tokens
console.log(TOKENS.ETHEREUM_MAINNET.ETH);   // Native ETH on Ethereum
console.log(TOKENS.ETHEREUM_MAINNET.USDC);  // USDC on Ethereum
console.log(TOKENS.SOLANA_MAINNET.SOL);     // Native SOL on Solana
console.log(TOKENS.BASE_MAINNET.ETH);       // Native ETH on Base
console.log(TOKENS.ARBITRUM_ONE.USDC);      // USDC on Arbitrum
console.log(TOKENS.POLYGON_MAINNET.MATIC);  // Native MATIC on Polygon
```

### Available Networks

Each network in `TOKENS` contains major tokens:
- `TOKENS.ETHEREUM_MAINNET`: ETH, USDC, USDT, WETH
- `TOKENS.BASE_MAINNET`: ETH, USDC, WETH
- `TOKENS.POLYGON_MAINNET`: MATIC, USDC, USDT, WETH
- `TOKENS.ARBITRUM_ONE`: ETH, USDC, USDT, WETH
- `TOKENS.SOLANA_MAINNET`: SOL, USDC, USDT, WSOL

## API Methods

### Swap Operations

#### Get Quotes

Get quotes for token swaps (same-chain) or bridges (cross-chain).

**Using Token Constants (Recommended):**
```typescript
import { SwapperSDK, TOKENS, NetworkId } from '@phantom/swapper-sdk';

// ETH to USDC swap on Ethereum
const quotes = await swapper.getQuotes({
  sellToken: TOKENS.ETHEREUM_MAINNET.ETH,
  buyToken: TOKENS.ETHEREUM_MAINNET.USDC,
  sellAmount: '1000000000000000000', // 1 ETH in wei
  from: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6D123',
    networkId: NetworkId.ETHEREUM_MAINNET,
  },
  slippageTolerance: 0.5, // 0.5%
});

// Cross-chain bridge: USDC from Ethereum to Solana
const bridgeQuotes = await swapper.getQuotes({
  sellToken: TOKENS.ETHEREUM_MAINNET.USDC,
  buyToken: TOKENS.SOLANA_MAINNET.USDC,
  sellAmount: '1000000', // 1 USDC (6 decimals)
  from: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6D123',
    networkId: NetworkId.ETHEREUM_MAINNET,
  },
  to: {
    address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  slippageTolerance: 1.0,
});
```

**Manual Token Construction:**
```typescript
const quotes = await swapper.getQuotes({
  sellToken: {
    type: 'native' | 'address',
    address?: string,  // Required if type is 'address'
    networkId: NetworkId,
  },
  buyToken: {
    type: 'native' | 'address',
    address?: string,  // Required if type is 'address'
    networkId: NetworkId,
  },
  sellAmount: string,
  from: {
    address: string,
    networkId: NetworkId,
  },
  to?: {  // Optional, for bridges
    address: string,
    networkId: NetworkId,
  },
  
  // Optional parameters
  slippageTolerance?: number,
  priorityFee?: number,
  tipAmount?: number,
  exactOut?: boolean,
  autoSlippage?: boolean,
  isLedger?: boolean,
});
```

#### Initialize Swap

Initialize a swap session and get token metadata.

```typescript
const result = await swapper.initializeSwap({
  type: 'buy' | 'sell' | 'swap',
  
  // Conditional fields based on type
  network?: ChainID,
  buyCaip19?: string,
  sellCaip19?: string,
  
  // Optional
  address?: string,
  settings?: {
    priorityFee?: number,
    tip?: number,
  },
});
```

#### Stream Quotes (Real-time)

Get real-time quote updates via Server-Sent Events.

```typescript
const stopStreaming = swapper.streamQuotes({
  taker: string,
  buyToken: string,
  sellToken: string,
  sellAmount: string,
  
  // Event handlers
  onQuote: (quote) => console.log('New quote:', quote),
  onError: (error) => console.error('Error:', error),
  onFinish: () => console.log('Stream finished'),
});

// Stop streaming when done
stopStreaming();
```

### Bridge Operations

#### Get Bridgeable Tokens

```typescript
const { tokens } = await swapper.getBridgeableTokens();
```

#### Get Bridge Providers

```typescript
const { providers } = await swapper.getPreferredBridges();
```

#### Initialize Bridge (Hyperunit)

Generate a deposit address for bridging.

```typescript
const result = await swapper.initializeBridge({
  sellToken: string,        // CAIP-19 format
  buyToken?: string,        // CAIP-19 format
  takerDestination: string, // CAIP-19 format
});
```

#### Check Bridge Status (Relay)

```typescript
const status = await swapper.getIntentsStatus({
  requestId: string,
});
```

#### Get Bridge Operations (Hyperunit)

```typescript
const operations = await swapper.getBridgeOperations({
  taker: string,            // CAIP-19 format
  opCreatedAtOrAfter?: string, // ISO timestamp
});
```

### Utility Methods

#### Get Permissions

Check user permissions based on location.

```typescript
const permissions = await swapper.getPermissions();
```

#### Get Withdrawal Queue

```typescript
const queue = await swapper.getWithdrawalQueue();
```

## Advanced Configuration

### Custom Headers

While not commonly needed, you can provide custom headers if required:

```typescript
const swapper = new SwapperSDK({
  apiUrl: 'https://api.phantom.app',
  options: {
    organizationId: 'your-org-id',
  },
  // Advanced: custom headers (not typically needed)
  headers: {
    'Custom-Header': 'value',
  },
});
```

### Update Headers

Dynamically update request headers:

```typescript
swapper.updateHeaders({
  'X-Custom-Header': 'new-value',
});
```

## Types

### NetworkId

Supported blockchain networks:

```typescript
enum NetworkId {
  // Solana
  SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  SOLANA_TESTNET = "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
  
  // Ethereum
  ETHEREUM_MAINNET = "eip155:1",
  ETHEREUM_SEPOLIA = "eip155:11155111",
  
  // Polygon
  POLYGON_MAINNET = "eip155:137",
  
  // Base
  BASE_MAINNET = "eip155:8453",
  
  // Arbitrum
  ARBITRUM_ONE = "eip155:42161",
  
  // Sui
  SUI_MAINNET = "sui:35834a8a",
  
  // Bitcoin
  BITCOIN_MAINNET = "bip122:000000000019d6689c085ae165831e93",
  
  // ... and more
}
```

### Token

Token specification:

```typescript
interface Token {
  type: 'native' | 'address';
  address?: string;      // Required if type is 'address'
  networkId: NetworkId;
}
```

### UserAddress

User address with network:

```typescript
interface UserAddress {
  address: string;
  networkId: NetworkId;
}
```

### SwapType

```typescript
enum SwapType {
  Solana = "solana",   // Same-chain Solana swap
  EVM = "eip155",      // Same-chain EVM swap
  XChain = "xchain",   // Cross-chain swap/bridge
  Sui = "sui"          // Same-chain Sui swap
}
```

## Integration with Other Phantom SDKs

The Swapper SDK can be integrated with other Phantom SDKs for a complete DApp experience.

### With Server SDK

```typescript
import { PhantomServer } from '@phantom/server-sdk';
import { SwapperSDK } from '@phantom/swapper-sdk';

const server = new PhantomServer({ apiKey: 'your-api-key' });
const swapper = new SwapperSDK();

// Get quotes
const quotes = await swapper.getQuotes({...});

// Sign and send transaction using Server SDK
const transaction = quotes.quotes[0].transactionData[0];
// Use server SDK to sign and send...
```

### With Browser SDK

```typescript
import { createPhantom } from '@phantom/browser-sdk';
import { SwapperSDK } from '@phantom/swapper-sdk';

const phantom = await createPhantom();
const swapper = new SwapperSDK();

// Get quotes
const quotes = await swapper.getQuotes({...});

// Sign and send using Browser SDK
const transaction = quotes.quotes[0].transactionData[0];
// Use browser SDK to sign and send...
```

## Error Handling

The SDK throws typed errors for various failure scenarios:

```typescript
try {
  const quotes = await swapper.getQuotes({...});
} catch (error) {
  if (error.code === 'INVALID_TOKEN_PAIR') {
    console.error('These tokens cannot be swapped');
  } else if (error.code === 'INSUFFICIENT_LIQUIDITY') {
    console.error('Not enough liquidity for this swap');
  } else if (error.code === 'PRICE_IMPACT_TOO_HIGH') {
    console.error('Price impact exceeds 30%');
  }
}
```

Common error codes:
- `UnsupportedCountry` - Country blocked (400)
- `InvalidTokenPair` - Tokens not swappable
- `InsufficientLiquidity` - Not enough liquidity
- `PriceImpactTooHigh` - Price impact > 30%
- `InvalidCaip19Format` - Invalid token format
- `InvalidAmount` - Amount validation failed

## Development

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch
```

### Building

```bash
# Build the SDK
yarn build

# Development mode
yarn dev
```

### Linting

```bash
# Run ESLint
yarn lint

# Check types
yarn check-types

# Format code
yarn prettier
```

## Examples

### Same-Chain Swap (Solana)

```typescript
const quotes = await swapper.getQuotes({
  sellToken: {
    type: 'native',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  buyToken: {
    type: 'address',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  sellAmount: '1000000000',
  from: {
    address: '8B3fBhkpHFMTdaQSfKVREB5HFKnZkT8rL6zKJfmmWDeZ',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  slippageTolerance: 0.5,
});

// Get the best quote
const bestQuote = quotes.quotes[0];
const transaction = bestQuote.transactionData[0];
// Sign and send transaction...
```

### Cross-Chain Bridge (Ethereum to Solana)

```typescript
const quotes = await swapper.getQuotes({
  sellToken: {
    type: 'address',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    networkId: NetworkId.ETHEREUM_MAINNET,
  },
  buyToken: {
    type: 'address',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
    networkId: NetworkId.SOLANA_MAINNET,
  },
  sellAmount: '1000000000',
  from: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6D123',
    networkId: NetworkId.ETHEREUM_MAINNET,
  },
  to: {
    address: '8B3fBhkpHFMTdaQSfKVREB5HFKnZkT8rL6zKJfmmWDeZ',
    networkId: NetworkId.SOLANA_MAINNET,
  },
  slippageTolerance: 1.0,
});
```

## Support

For issues and questions, please visit [GitHub Issues](https://github.com/phantom/wallet-sdk/issues).

## License

See LICENSE file in the root of the repository.