# Phantom Wallet SDK

A comprehensive suite of SDKs for integrating Phantom Wallet across different platforms and use cases, supporting both Phantom browser extension and embedded non-custodial wallets.

## ⚠️ Deprecation Notice

**@phantom/wallet-sdk** (the embedded wallet SDK) is now deprecated. Future development and support will focus on the following packages:

- [@phantom/browser-sdk](https://www.npmjs.com/package/@phantom/browser-sdk): Core browser SDK for Phantom wallet integration (no UI components).
- [@phantom/react-sdk](https://www.npmjs.com/package/@phantom/react-sdk): Invisible SDK for non custodial client wallets
- [@phantom/react-ui](https://www.npmjs.com/package/@phantom/react-ui): SDK with React UI components
- [@phantom/server-sdk](https://www.npmjs.com/package/@phantom/server-sdk): Server SDK for custodial server wallets
- [@phantom/browser-injected-sdk](https://www.npmjs.com/package/@phantom/browser-injected-sdk): Direct SDK to interface with the Phantom browser extension

## SDK Overview

This repository contains multiple SDKs for different integration needs, prioritized by ease of use:

### React SDK

**[@phantom/react-sdk](./packages/react-sdk/README.md)** - React hooks for Phantom integration with native transaction support.

```tsx
import { PhantomProvider, useConnect, useSignAndSendTransaction, AddressType, NetworkId } from "@phantom/react-sdk";

// App wrapper
<PhantomProvider
  config={{
    providerType: "embedded",
    embeddedWalletType: "app-wallet",
    addressTypes: [AddressType.solana],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    organizationId: "your-org-id",
  }}
>
  <App />
</PhantomProvider>;

// Component - works with native transaction objects!
function SendTransaction() {
  const { connect } = useConnect();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const handleSend = async () => {
    await connect();
    const transaction = new Transaction().add(/* your instructions */);
    await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction, // Native Solana Transaction object!
    });
  };
}
```

### Browser SDK - **For Vanilla JS/TS**

**[@phantom/browser-sdk](./packages/browser-sdk/README.md)** - Core browser SDK with unified interface for Phantom extension and embedded wallets.

```typescript
import { BrowserSDK, NetworkId, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providerType: "embedded", // or 'injected' for browser extension
  embeddedWalletType: "app-wallet",
  addressTypes: [AddressType.solana],
  apiBaseUrl: "https://api.phantom.app/v1/wallets",
  organizationId: "your-org-id",
});

await sdk.connect();
await sdk.signAndSendTransaction({
  networkId: NetworkId.SOLANA_MAINNET,
  transaction: solanaTransaction, // Native transaction objects
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

**[@phantom/react-ui](./packages/react-ui/README.md)** - Pre-built React UI components with automatic modal injection.

```tsx
import { PhantomUIProvider, useSignAndSendTransaction } from "@phantom/react-ui";

// App wrapper - includes react-sdk + UI theme
<PhantomUIProvider
  config={{
    providerType: "embedded",
    addressTypes: [AddressType.solana],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    organizationId: "your-org-id",
  }}
  theme="dark"
>
  <App />
</PhantomUIProvider>;

// Component - UI appears automatically
function SendTransaction() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const send = async () => {
    // Connection/transaction modals appear automatically
    await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction: solanaTransaction,
    });
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

## Packages

All packages with links to documentation:

- **[@phantom/react-sdk](./packages/react-sdk/README.md)** - React hooks and components ([NPM](https://www.npmjs.com/package/@phantom/react-sdk))
- **[@phantom/browser-sdk](./packages/browser-sdk/README.md)** - Core browser SDK ([NPM](https://www.npmjs.com/package/@phantom/browser-sdk))
- **[@phantom/server-sdk](./packages/server-sdk/README.md)** - Server-side SDK ([NPM](https://www.npmjs.com/package/@phantom/server-sdk))
- **[@phantom/react-ui](./packages/react-ui/README.md)** - React UI components
- **[@phantom/client](./packages/client/README.md)** - HTTP client library
- **[@phantom/api-key-stamper](./packages/api-key-stamper/README.md)** - API authentication
- **[@phantom/browser-injected-sdk](./packages/browser-injected-sdk/README.md)** - Browser extension integration
- **@phantom/wallet-sdk (DEPRECATED)** - Legacy embedded wallet SDK
- **@phantom/browser-embedded-sdk (DEPRECATED)** - Legacy browser embedded SDK

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
