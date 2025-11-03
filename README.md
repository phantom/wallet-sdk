# Phantom Wallet SDK

A comprehensive suite of SDKs for integrating Phantom Wallet across different platforms and use cases, supporting both Phantom browser extension and embedded non-custodial wallets.

### Frontend SDK Options:

- **[React SDK](./packages/react-sdk/README.md)** - React hooks and components
- **[React UI](./packages/react-ui/README.md)** - Complete UI solution with pre-built modals
- **[Browser SDK](./packages/browser-sdk/README.md)** - Vanilla JavaScript/TypeScript
- **[React Native SDK](./packages/react-native-sdk/README.md)** - Mobile app integration


### ⚠️ Deprecated Packages

- **[@phantom/wallet-sdk](./packages/browser-embedded-sdk/README.md)** - ⚠️ **DEPRECATED** - Use [@phantom/browser-sdk](./packages/browser-sdk/README.md) or [@phantom/react-sdk](./packages/react-sdk/README.md) instead ([NPM](https://www.npmjs.com/package/@phantom/wallet-sdk))

## Provider Types

All frontend SDKs support two provider types:

### 🔌 Injected Provider (Browser Extension)

Connect to the user's existing Phantom browser extension wallet:

- Uses wallets already installed and funded by the user
- Requires Phantom browser extension to be installed
- Access to user's existing wallet history and assets

### 🔮 Embedded Provider (Non-Custodial)

Create or use non-custodial embedded wallets within your application:

- **App Wallet**: Fresh wallet created per application (unfunded, app-specific)
- **User Wallet**: User's Phantom wallet accessed via authentication (potentially funded, portable across apps)

## SDK Overview

This repository contains multiple SDKs for different integration needs, prioritized by ease of use:

### React SDK

**[@phantom/react-sdk](./packages/react-sdk/README.md)** - React hooks for Phantom integration with chain-specific APIs.

```tsx
import { PhantomProvider, useConnect, useSolana, useEthereum, AddressType } from "@phantom/react-sdk";

// App wrapper with provider selection
<PhantomProvider
  config={{
    providerType: "injected", // or "embedded"
    addressTypes: [AddressType.solana, AddressType.ethereum],
    // For embedded wallets:
    // embeddedWalletType: "app-wallet",
    // apiBaseUrl: "https://api.phantom.app/v1/wallets",
    // appId: "your-app-id",
  }}
>
  <App />
</PhantomProvider>;

// Component with chain-specific operations
function WalletComponent() {
  const { connect } = useConnect();
  const { solana } = useSolana();
  const { ethereum } = useEthereum();

  const handleConnect = async () => {
    const { addresses } = await connect({ provider: "injected" });
    console.log("Connected addresses:", addresses);
  };

  const signMessages = async () => {
    const solanaSignature = await solana.signMessage("Hello Solana!");
    const accounts = await ethereum.getAccounts();
    const ethSignature = await ethereum.signPersonalMessage("Hello Ethereum!", accounts[0]);
  };
}
```

### Browser SDK - **For Vanilla JS/TS**

**[@phantom/browser-sdk](./packages/browser-sdk/README.md)** - Core browser SDK with dual provider support and chain-specific APIs.

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Injected Provider (Browser Extension)
const sdk = new BrowserSDK({
  providerType: "injected",
  addressTypes: [AddressType.solana, AddressType.ethereum],
});

// Embedded Provider (Non-Custodial)
// const sdk = new BrowserSDK({
//   providerType: "embedded",
//   embeddedWalletType: "app-wallet",
//   addressTypes: [AddressType.solana, AddressType.ethereum],
//   apiBaseUrl: "https://api.phantom.app/v1/wallets",
//   appId: "your-app-id",
// });

// Connect through SDK (provider parameter is required)
const { addresses } = await sdk.connect({ provider: "injected" });

// Chain-specific operations
const solanaSignature = await sdk.solana.signMessage("Hello Solana!");
const ethResult = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: "1000000000000000000",
  gas: "21000",
});
```

### Server SDK - **For Backend Applications**

**[@phantom/server-sdk](./packages/server-sdk/README.md)** - Server-side SDK for backend applications with built-in authentication.

```typescript
import { ServerSDK, NetworkId } from "@phantom/server-sdk";

const sdk = new ServerSDK({
  organizationId: process.env.ORGANIZATION_ID,
  appId: process.env.APP_ID,
  apiPrivateKey: process.env.PRIVATE_KEY,
  apiBaseUrl: process.env.API_URL,
});

// Create wallet
const wallet = await sdk.createWallet("User Wallet");

// Sign messages
const signature = await sdk.signMessage({
  walletId: wallet.walletId,
  message: "Hello from Phantom!",
  networkId: NetworkId.SOLANA_MAINNET,
});

// Sign transactions - supports multiple formats
// Solana Web3.js Transaction
const solanaTransaction = new Transaction().add(/* instructions */);
await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction: solanaTransaction, // Native Solana transaction object
  networkId: NetworkId.SOLANA_MAINNET,
});

// Ethereum/EVM transaction object
const evmTransaction = {
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: 1000000000000000000n,
  data: "0x",
};
await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction: evmTransaction, // Viem/Ethers transaction object
  networkId: NetworkId.ETHEREUM_MAINNET,
});

// Raw bytes or hex strings
await sdk.signAndSendTransaction({
  walletId: wallet.walletId,
  transaction: "0x01020304", // Hex string
  networkId: NetworkId.ETHEREUM_MAINNET,
});
```

### React UI - **Complete UI Solution**

**[@phantom/react-ui](./packages/react-ui/README.md)** - Pre-built React UI components with automatic modal injection and chain-specific operations.

```tsx
import { PhantomProvider, useConnect, useSolana, useEthereum, AddressType } from "@phantom/react-ui";

// App wrapper - includes react-sdk + UI theme
<PhantomProvider
  config={{
    providerType: "embedded", // or "injected"
    addressTypes: [AddressType.solana, AddressType.ethereum],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    appId: "your-app-id",
  }}
  theme="dark"
>
  <App />
</PhantomProvider>;

// Component - UI appears automatically
function WalletOperations() {
  const { connect } = useConnect();
  const { solana } = useSolana();
  const { ethereum } = useEthereum();

  const handleOperations = async () => {
    // Connection modals appear automatically (provider parameter is required)
    await connect({ provider: "phantom" });

    // Chain-specific operations with UI
    await solana.signAndSendTransaction(solanaTransaction);
    await ethereum.sendTransaction(ethTransaction);
  };
}
```

## Examples

You can find example applications in the [`examples/`](./examples) folder:

- [`examples/react-sdk-demo-app`](./examples/react-sdk-demo-app)
- [`examples/browser-sdk-demo-app`](./examples/browser-sdk-demo-app)
- [`examples/react-native-sdk-demo-app`](./examples/react-native-sdk-demo-app)
- [`examples/with-nextjs`](./examples/with-nextjs)
- [`examples/with-wagmi`](./examples/with-wagmi/)

## Architecture Overview

Below is an explanation of how the different packages of this repository work together.

### Entry Point Packages

These are the main SDKs that developers use to integrate Phantom Wallet:

#### **[@phantom/server-sdk](./packages/server-sdk/README.md)** - Backend SDK
Server-side SDK for backend applications with built-in authentication. Depends on:
- `@phantom/client` for API communication
- `@phantom/api-key-stamper` for request authentication

#### **[@phantom/react-sdk](./packages/react-sdk/README.md)** - React Hooks
Thin wrapper over `@phantom/browser-sdk` that provides React hooks and context providers for Phantom integration.

#### **[@phantom/react-ui](./packages/react-ui/README.md)** - Complete UI Solution
Thin wrapper over `@phantom/react-sdk` that adds pre-built UI components (modals, buttons, etc.) with automatic injection and theming support.

#### **[@phantom/browser-sdk](./packages/browser-sdk/README.md)** - Vanilla JS/TS SDK
Core browser SDK supporting both injected (extension) and embedded (non-custodial) providers. Depends on:
- `@phantom/embedded-provider-core` for embedded wallet functionality
- `@phantom/browser-injected-sdk` for extension integration
- `@phantom/client` for API communication
- `@phantom/indexed-db-stamper` for secure browser-based authentication

#### **[@phantom/react-native-sdk](./packages/react-native-sdk/README.md)** - Mobile SDK
SDK for React Native and Expo applications. Depends on:
- `@phantom/embedded-provider-core` for embedded wallet functionality
- `@phantom/client` for API communication
- Platform-specific secure storage for authentication

### Core Internal Packages

These are the foundational packages that power the entry point SDKs:

#### **[@phantom/embedded-provider-core](./packages/embedded-provider-core/README.md)** - Embedded Wallet Orchestration
Platform-agnostic core that orchestrates authentication flows for embedded wallets and provides signing interfaces. This is the heart of the embedded wallet functionality, handling:
- Wallet creation and authentication
- Multi-chain signing interfaces (Solana, Ethereum, etc.)
- Session management
- Event handling

#### **[@phantom/browser-injected-sdk](./packages/browser-injected-sdk/README.md)** - Extension Integration
Interfaces with the Phantom browser extension, detecting its presence and providing a unified API to communicate with the injected provider.

#### **[@phantom/client](./packages/client/README.md)** - HTTP API Client
HTTP wrapper for interfacing with the Phantom API. All requests must be cryptographically signed (stamped) using one of the stamper packages.

#### **[@phantom/api-key-stamper](./packages/api-key-stamper/README.md)** - Server Authentication
Stamps API requests with cryptographic signatures using private API keys. Used by `@phantom/server-sdk` for backend authentication.

#### **[@phantom/indexed-db-stamper](./packages/indexed-db-stamper/README.md)** - Browser Authentication
Stamps API requests using non-extractable cryptographic keys stored in IndexedDB. Used by `@phantom/browser-sdk` for secure browser-based authentication.

### Supporting Utility Packages

#### **[@phantom/chain-interfaces](./packages/chain-interfaces/README.md)** - Multi-Chain Type Definitions
TypeScript interfaces and types for different blockchain networks (Solana, Ethereum, etc.).

#### **[@phantom/sdk-types](./packages/sdk-types/README.md)** - Shared Type Definitions
Common TypeScript types used across all SDK packages.

#### **[@phantom/constants](./packages/constants/README.md)** - Shared Constants
Environment URLs, configuration values, and other constants used across packages.

#### **[@phantom/parsers](./packages/parsers/README.md)** - Data Parsers
Utilities for parsing and transforming blockchain data formats.

#### **[@phantom/crypto](./packages/crypto/README.md)** - Cryptographic Utilities
Platform-agnostic cryptographic operations (signing, hashing, key generation).

#### **[@phantom/base64url](./packages/base64url/README.md)** - URL-Safe Base64
Encoding/decoding utilities for URL-safe base64 operations.

#### **[@phantom/utils](./packages/utils/README.md)** - General Utilities
Miscellaneous utility functions used across packages.

### Package Dependency Flow

```
Frontend Entry Points:
  react-ui → react-sdk → browser-sdk → embedded-provider-core → client → (api-key-stamper | indexed-db-stamper)
                                     → browser-injected-sdk

Backend Entry Point:
  server-sdk → client → api-key-stamper

Mobile Entry Point:
  react-native-sdk → embedded-provider-core → client → api-key-stamper
```

## Network Support

Phantom SDKs support multiple blockchain networks across Solana and EVM chains.

### Supported Blockchains

**Solana**: Mainnet, Devnet, Testnet

**EVM Chains**:
- Ethereum (Mainnet, Sepolia)
- Polygon (Mainnet, Amoy)
- Base (Mainnet, Sepolia)
- Arbitrum (One, Sepolia)
- Monad (Mainnet, Testnet)

**Coming Soon**: Bitcoin, Sui

### Network Configuration

Different SDKs use different network identifiers:

- **[@phantom/server-sdk](./packages/server-sdk/README.md#network-support)** - Uses `NetworkId` enum for backend operations
- **[@phantom/browser-sdk](./packages/browser-sdk/README.md)** and **[@phantom/react-sdk](./packages/react-sdk/README.md)** - Use chain IDs (numbers) for network switching


## Give Feedback

Phantom SDKs are in active development and will be prioritizing features requested by early adopters. If you are interested in working with us, please email us at `developers@phantom.app` or message `@brianfriel` on Telegram.

## Disclaimers

The embedded wallet is a beta version, and Phantom will not be liable for any losses or damages suffered by you or your end users.

Any suggestions, enhancement requests, recommendations, or other feedback provided by you regarding the embedded wallet will be the exclusive property of Phantom. By using this beta version and providing feedback, you agree to assign any rights in that feedback to Phantom.


## Releasing a new version

This project uses the command `yarn changeset` to generate new versions for the different packages.

In your pull request, run the command `yarn changeset`, select which packages are affected and commit the generated files. 

After this pull request is merged a new one will be generated automatically with the release. The CI system will release the new versions upon merge.