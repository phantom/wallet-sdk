# Phantom Connector

A multi-chain connector for Phantom Wallet SDK that provides standardized provider interfaces for both Ethereum and Solana networks. This connector abstracts the differences between embedded and injected wallets, giving developers a unified interface across different wallet types.

## Features

- **Multi-chain Support**: Ethereum (+ Layer 2s) and Solana networks
- **Unified Interface**: Same API for both embedded and injected wallets
- **Standard Protocols**: EIP-1193 for Ethereum, standard Solana provider interface
- **Chain Switching**: Automatic network/chain switching with proper validation
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **React Integration**: Ready-to-use React hooks

## Installation

```bash
npm install @phantom/phantom-connector @phantom/browser-sdk @phantom/constants @phantom/client
```

For React applications, also install:

```bash
npm install @phantom/react-sdk
```

## Quick Start

### Basic Usage

```typescript
import { BrowserSDK } from '@phantom/browser-sdk';
import { PhantomConnector } from '@phantom/phantom-connector';
import { NetworkId } from '@phantom/constants';

// Initialize the SDK
const sdk = new BrowserSDK({
  appId: 'your-app-id',
  providerType: 'embedded' // or 'injected'
});

// Connect to wallet
await sdk.connect();

// Create connector
const provider = sdk.getCurrentProvider();
const connector = new PhantomConnector(provider, 'embedded');

// Get Ethereum provider (automatically switches to mainnet)
const ethProvider = await connector.getEthereumProvider(1);
await ethProvider.request({
  method: 'eth_sendTransaction',
  params: [{ to: '0x...', value: '0x...' }]
});

// Get Solana provider
const solanaProvider = await connector.getSolanaProvider(NetworkId.SOLANA_MAINNET);
const result = await solanaProvider.signAndSendTransaction(transaction);
```

### React Hook Usage

The connector is automatically available via React hooks when using the React SDK:

```tsx
import { PhantomProvider, usePhantomConnector } from '@phantom/react-sdk';
import { NetworkId } from '@phantom/constants';

// Wrap your app with PhantomProvider
function App() {
  return (
    <PhantomProvider config={{ appId: "your-app-id", providerType: "embedded" }}>
      <MyComponent />
    </PhantomProvider>
  );
}

// Use the connector in your components

function MyComponent() {
  const { getEthereumProvider, getSolanaProvider, getSupportedChains } = usePhantomConnector();

  const handleEthereumTransaction = async () => {
    // Get Ethereum provider for Polygon
    const ethProvider = await getEthereumProvider(137);
    const result = await ethProvider.request({
      method: 'personal_sign',
      params: ['Hello World', '0x...']
    });
  };

  const handleSolanaTransaction = async () => {
    const solanaProvider = await getSolanaProvider(NetworkId.SOLANA_MAINNET);
    const message = new TextEncoder().encode('Hello Solana');
    const result = await solanaProvider.signMessage(message);
  };

  // Get available chains based on wallet addresses
  const chains = getSupportedChains();
  
  return (
    <div>
      {chains.map(chain => (
        <button key={chain.networkId} onClick={
          chain.chainType === 'ethereum' 
            ? handleEthereumTransaction 
            : handleSolanaTransaction
        }>
          Sign on {chain.name}
        </button>
      ))}
    </div>
  );
}
```

## Architecture

### How It Works

The Phantom Connector bridges the gap between different wallet types (embedded vs injected) and provides standard interfaces:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your App      │    │ PhantomConnector │    │ Wallet Provider │
│                 │    │                  │    │                 │
│ getEthProvider  ├────┤ EthereumBridge   ├────┤ Embedded/       │
│ getSolanaProvider├────┤ SolanaBridge     │    │ Injected        │
│ getSupportedChains────┤ Address Analysis │    │ Provider        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Provider Types

1. **Injected Providers** (Browser Extension)
   - Direct access to `window.phantom.ethereum` and `window.phantom.solana`
   - Native EIP-1193 and Solana provider interfaces
   - No conversion needed

2. **Embedded Providers** (In-App Wallets)
   - Custom bridge adapters (`EmbeddedEthereumBridge`, `EmbeddedSolanaBridge`)
   - Converts embedded wallet API to standard interfaces
   - Handles network state management internally

## API Reference

### PhantomConnector

```typescript
class PhantomConnector {
  constructor(provider: Provider, type: 'injected' | 'embedded');
  
  // Get Ethereum provider with optional chain switching
  getEthereumProvider(chainId?: number): Promise<EthereumProvider>;
  
  // Get Solana provider with optional network switching
  getSolanaProvider(networkId?: NetworkId): Promise<SolanaProvider>;
  
  // Get supported chains based on wallet addresses
  getSupportedChains(): ChainInfo[];
}
```

### EthereumProvider (EIP-1193 Compatible)

```typescript
interface EthereumProvider {
  // Standard EIP-1193 methods
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  
  // Event handling
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  
  // Properties
  isPhantom: boolean;
  selectedAddress: string | null;
  chainId: string;
  isConnected: boolean;
}
```

### SolanaProvider

```typescript
interface SolanaProvider {
  // Connection
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  
  // Signing
  signMessage(message: Uint8Array, display?: 'utf8' | 'hex'): Promise<{ signature: Uint8Array }>;
  signTransaction<T>(transaction: T): Promise<T>;
  signAllTransactions<T>(transactions: T[]): Promise<T[]>;
  signAndSendTransaction<T>(transaction: T): Promise<{ signature: string }>;
  
  // Event handling
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  
  // Properties
  isPhantom: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
}
```

## Supported Networks

### Ethereum Networks
- **Mainnet** (Chain ID: 1)
- **Polygon** (Chain ID: 137)
- **Optimism** (Chain ID: 10)
- **Arbitrum One** (Chain ID: 42161)
- **Base** (Chain ID: 8453)

### Solana Networks
- **Mainnet Beta** (`NetworkId.SOLANA_MAINNET`)
- **Devnet** (`NetworkId.SOLANA_DEVNET`)

## Chain Switching

The connector handles chain switching automatically:

```typescript
// Ethereum - automatically switches to Polygon
const ethProvider = await connector.getEthereumProvider(137);

// Solana - switches to devnet
const solanaProvider = await connector.getSolanaProvider(NetworkId.SOLANA_DEVNET);
```

### Chain Change Events

```typescript
// Listen for chain changes on Ethereum
ethProvider.on('chainChanged', ({ chainId }) => {
  console.log('Switched to chain:', chainId);
});

// Listen for network changes on Solana
solanaProvider.on('networkChanged', ({ networkId }) => {
  console.log('Switched to network:', networkId);
});
```

## Integration with Web3 Libraries

The connector provides standard interfaces that work seamlessly with popular Web3 libraries:

### Ethers.js

```typescript
import { ethers } from 'ethers';

const ethProvider = await connector.getEthereumProvider(1);
const provider = new ethers.BrowserProvider(ethProvider);
const signer = await provider.getSigner();
```

### Viem

```typescript
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

const ethProvider = await connector.getEthereumProvider(1);
const client = createWalletClient({
  chain: mainnet,
  transport: custom(ethProvider)
});
```

### Wagmi

```typescript
import { createConfig, injected } from 'wagmi';

const ethProvider = await connector.getEthereumProvider(1);
const config = createConfig({
  connectors: [injected({ target: () => ({ provider: ethProvider, name: 'Phantom' }) })],
  // ... other config
});
```

### Solana Web3.js

```typescript
import { Connection, VersionedTransaction } from '@solana/web3.js';

const solanaProvider = await connector.getSolanaProvider(NetworkId.SOLANA_MAINNET);

// Works with both Transaction and VersionedTransaction
const result = await solanaProvider.signAndSendTransaction(transaction);
```

## Error Handling

```typescript
try {
  const ethProvider = await connector.getEthereumProvider(999999);
} catch (error) {
  if (error.message.includes('Unsupported chainId')) {
    // Handle unsupported chain
  }
}

try {
  const solanaProvider = await connector.getSolanaProvider('invalid' as any);
} catch (error) {
  if (error.message.includes('Invalid Solana network')) {
    // Handle invalid network
  }
}
```

## Advanced Usage

### Custom Chain Support

To add support for additional chains, extend the network mapping:

```typescript
// The connector uses internal mappings that can be extended
// Check the source code for current mappings and contribute new ones
```

### Provider State Management

```typescript
// Check available addresses to determine supported chains
const chains = connector.getSupportedChains();
const hasEthereum = chains.some(chain => chain.chainType === 'ethereum');
const hasSolana = chains.some(chain => chain.chainType === 'solana');

if (hasEthereum) {
  // Show Ethereum UI
}

if (hasSolana) {
  // Show Solana UI
}
```

### Event-Driven Architecture

```typescript
class WalletManager {
  private connector: PhantomConnector;
  
  async setupEventListeners() {
    const ethProvider = await this.connector.getEthereumProvider();
    
    ethProvider.on('chainChanged', this.handleChainChange.bind(this));
    ethProvider.on('accountsChanged', this.handleAccountChange.bind(this));
  }
  
  private handleChainChange({ chainId }: { chainId: string }) {
    console.log('Chain changed to:', parseInt(chainId, 16));
    // Update UI, refresh balances, etc.
  }
  
  private handleAccountChange(accounts: string[]) {
    console.log('Accounts changed:', accounts);
    // Handle account switching
  }
}
```

## Key Benefits

| Feature | Description |
|---------|-------------|
| **Multi-chain Support** | Full Ethereum + Solana network support |
| **Standard Interfaces** | EIP-1193 for Ethereum, standard Solana provider interface |
| **Embedded Wallets** | Complete support for in-app wallet integration |
| **Chain Switching** | Automatic network/chain switching with validation |
| **TypeScript** | Comprehensive type definitions and safety |
| **React Integration** | Ready-to-use hooks for React applications |

## Contributing

This package is part of the Phantom Wallet SDK. To contribute:

1. Fork the repository
2. Make your changes in the `packages/phantom-connector` directory
3. Add tests for new functionality
4. Run the test suite: `npm test`
5. Submit a pull request

## License

MIT