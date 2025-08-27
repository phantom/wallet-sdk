# Phantom Wallet SDK

A comprehensive suite of SDKs for integrating Phantom Wallet across different platforms and use cases, supporting both Phantom browser extension and embedded non-custodial wallets.

## Choose Your Wallet Type

Choose based on your integration model:

### 🔐 Server-Controlled Wallets

**Use [Server SDK](./packages/server-sdk/README.md)** - App developers can programmatically create wallets and execute transactions from backend

### 👤 User Wallets (Phantom Users)

**Use Frontend SDKs** - Connect to existing Phantom user wallets (funded, with history)

### 🆕 App Wallets (New Unfunded)

**Use Frontend SDKs** - Create fresh wallets per app (empty, app-specific)

### Frontend SDK Options:

- **[React SDK](./packages/react-sdk/README.md)** - React hooks and components
- **[React UI](./packages/react-ui/README.md)** - Complete UI solution with pre-built modals
- **[Browser SDK](./packages/browser-sdk/README.md)** - Vanilla JavaScript/TypeScript
- **[React Native SDK](./packages/react-native-sdk/README.md)** - Mobile app integration

## Packages

All packages with links to documentation:

- **[@phantom/react-sdk](./packages/react-sdk/README.md)** - React hooks and components ([NPM](https://www.npmjs.com/package/@phantom/react-sdk))
- **[@phantom/browser-sdk](./packages/browser-sdk/README.md)** - Core browser SDK ([NPM](https://www.npmjs.com/package/@phantom/browser-sdk))
- **[@phantom/server-sdk](./packages/server-sdk/README.md)** - Server-side SDK ([NPM](https://www.npmjs.com/package/@phantom/server-sdk))
- **[@phantom/react-ui](./packages/react-ui/README.md)** - React UI components
- **[@phantom/client](./packages/client/README.md)** - HTTP client library
- **[@phantom/api-key-stamper](./packages/api-key-stamper/README.md)** - API authentication
- **[@phantom/browser-injected-sdk](./packages/browser-injected-sdk/README.md)** - Browser extension integration

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
Create new non-custodial wallets embedded in your application:
- **App Wallet**: Fresh wallet created per application (unfunded, app-specific)
- **User Wallet**: User's Phantom wallet accessed via authentication (potentially funded)

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
    // organizationId: "your-org-id",
  }}
>
  <App />
</PhantomProvider>;

// Component with chain-specific operations
function WalletComponent() {
  const { connect } = useConnect();
  const solana = useSolana();
  const ethereum = useEthereum();

  const handleConnect = async () => {
    const { addresses } = await connect();
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
//   organizationId: "your-org-id",
// });

// Connect through SDK
const { addresses } = await sdk.connect();

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
import { PhantomUIProvider, useConnect, useSolana, useEthereum, AddressType } from "@phantom/react-ui";

// App wrapper - includes react-sdk + UI theme
<PhantomUIProvider
  config={{
    providerType: "embedded", // or "injected"
    addressTypes: [AddressType.solana, AddressType.ethereum],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    organizationId: "your-org-id",
  }}
  theme="dark"
>
  <App />
</PhantomUIProvider>;

// Component - UI appears automatically
function WalletOperations() {
  const { connect } = useConnect();
  const solana = useSolana();
  const ethereum = useEthereum();

  const handleOperations = async () => {
    // Connection modals appear automatically
    await connect();
    
    // Chain-specific operations with UI
    await solana.signAndSendTransaction(solanaTransaction);
    await ethereum.sendTransaction(ethTransaction);
  };
}
```

## Core Infrastructure

### 🔧 Client

**[@phantom/client](./packages/client/README.md)** - Low-level HTTP client for Phantom's API with authentication support.

### 🔐 API Key Stamper

**[@phantom/api-key-stamper](./packages/api-key-stamper/README.md)** - Ed25519 authentication for API requests.

### 🔌 Browser Injected SDK

**[@phantom/browser-injected-sdk](./packages/browser-injected-sdk/README.md)** - Direct integration with Phantom browser extension.

## Examples

You can find example applications in the [`examples/`](./examples) folder:

- [`examples/react-sdk-demo-app`](./examples/react-sdk-demo-app)
- [`examples/browser-sdk-demo-app`](./examples/browser-sdk-demo-app)
- [`examples/browser-embedded-sdk-demo-app`](./examples/browser-embedded-sdk-demo-app)

## Give Feedback

Phantom SDKs are in active development and will be prioritizing features requested by early adopters. If you are interested in working with us, please email us at `developers@phantom.app` or message `@brianfriel` on Telegram.

## Disclaimers

The embedded wallet is a beta version, and Phantom will not be liable for any losses or damages suffered by you or your end users.

Any suggestions, enhancement requests, recommendations, or other feedback provided by you regarding the embedded wallet will be the exclusive property of Phantom. By using this beta version and providing feedback, you agree to assign any rights in that feedback to Phantom.
