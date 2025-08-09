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
import { SwapperSDK, ChainID } from '@phantom/swapper-sdk';

// Initialize the SDK
const swapper = new SwapperSDK({
  apiUrl: 'https://api.phantom.app', // optional, this is the default
  headers: {
    'X-Phantom-Version': '1.0.0',
    'X-Phantom-Platform': 'web',
  },
  debug: true, // optional, enables debug logging
});

// Get swap quotes
const quotes = await swapper.getQuotes({
  taker: {
    chainId: ChainID.SolanaMainnet,
    address: '8B3fBhkpHFMTdaQSfKVREB5HFKnZkT8rL6zKJfmmWDeZ',
    resourceType: 'address',
  },
  sellToken: {
    chainId: ChainID.SolanaMainnet,
    slip44: '501',
    resourceType: 'nativeToken',
  },
  buyToken: {
    chainId: ChainID.SolanaMainnet,
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    resourceType: 'address',
  },
  sellAmount: '1000000000',
  slippageTolerance: 0.5,
});
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# API Base URL (default: https://api.phantom.app)
PHANTOM_SWAPPER_API_URL=https://api.phantom.app

# Optional: Service authentication token for fee removal
PHANTOM_SERVICE_AUTH_TOKEN=

# Optional: Client identification
PHANTOM_CLIENT_VERSION=
PHANTOM_CLIENT_PLATFORM=

# Optional: Country code for geo-blocking
PHANTOM_COUNTRY_CODE=
```

### SDK Configuration

```typescript
interface SwapperSDKConfig {
  apiUrl?: string;         // API base URL
  headers?: {              // Optional custom headers
    'X-Phantom-Version'?: string;
    'X-Phantom-Platform'?: string;
    'X-Phantom-AnonymousId'?: string;
    'cf-ipcountry'?: string;
    'cloudfront-viewer-country'?: string;
    Authorization?: string;
  };
  timeout?: number;        // Request timeout in ms (default: 30000)
  debug?: boolean;         // Enable debug logging
}
```

## API Methods

### Swap Operations

#### Get Quotes

Get quotes for token swaps (same-chain) or bridges (cross-chain).

```typescript
const quotes = await swapper.getQuotes({
  taker: SwapperCaip19,
  buyToken: SwapperCaip19,
  sellToken: SwapperCaip19,
  sellAmount: string,
  
  // Optional parameters
  takerDestination?: SwapperCaip19,  // For bridges
  exactOut?: boolean,
  base64EncodedTx?: boolean,
  autoSlippage?: boolean,
  slippageTolerance?: number,
  priorityFee?: number,
  tipAmount?: number,
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

#### Update Headers

Dynamically update request headers.

```typescript
swapper.updateHeaders({
  'X-Phantom-Version': '2.0.0',
  Authorization: 'Bearer new-token',
});
```

## Types

### ChainID

Supported blockchain networks:

```typescript
enum ChainID {
  // Solana
  SolanaMainnet = "solana:101",
  SolanaTestnet = "solana:102",
  SolanaDevnet = "solana:103",
  
  // Ethereum
  EthereumMainnet = "eip155:1",
  EthereumSepolia = "eip155:11155111",
  
  // Polygon
  PolygonMainnet = "eip155:137",
  
  // Base
  BaseMainnet = "eip155:8453",
  
  // Arbitrum
  ArbitrumMainnet = "eip155:42161",
  
  // Sui
  SuiMainnet = "sui:mainnet",
  
  // Bitcoin
  BitcoinMainnet = "bip122:000000000019d6689c085ae165831e93",
  
  // ... and more
}
```

### SwapperCaip19

Universal token/address format:

```typescript
interface SwapperCaip19 {
  chainId: ChainID;
  resourceType: "address" | "nativeToken";
  address?: string;    // Required if resourceType = "address"
  slip44?: string;     // Required if resourceType = "nativeToken"
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
  taker: {
    chainId: ChainID.SolanaMainnet,
    address: '8B3fBhkpHFMTdaQSfKVREB5HFKnZkT8rL6zKJfmmWDeZ',
    resourceType: 'address',
  },
  sellToken: {
    chainId: ChainID.SolanaMainnet,
    slip44: '501',
    resourceType: 'nativeToken',
  },
  buyToken: {
    chainId: ChainID.SolanaMainnet,
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    resourceType: 'address',
  },
  sellAmount: '1000000000',
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
  taker: {
    chainId: ChainID.EthereumMainnet,
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6D123',
    resourceType: 'address',
  },
  takerDestination: {
    chainId: ChainID.SolanaMainnet,
    address: '8B3fBhkpHFMTdaQSfKVREB5HFKnZkT8rL6zKJfmmWDeZ',
    resourceType: 'address',
  },
  sellToken: {
    chainId: ChainID.EthereumMainnet,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    resourceType: 'address',
  },
  buyToken: {
    chainId: ChainID.SolanaMainnet,
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    resourceType: 'address',
  },
  sellAmount: '1000000000',
  slippageTolerance: 1.0,
});
```

## Support

For issues and questions, please visit [GitHub Issues](https://github.com/phantom/wallet-sdk/issues).

## License

See LICENSE file in the root of the repository.