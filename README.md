# Phantom Wallet SDK

This monorepo contains the Phantom Wallet SDK and a demo application that demonstrates its usage.

## Overview

The Phantom Wallet SDK allows you to integrate Phantom's wallet functionality directly into your web application. It provides a simple interface for interacting with the wallet, including showing/hiding the wallet UI, performing swaps and purchases, and accessing chain-specific RPC interfaces for Solana, Ethereum, Sui, and Bitcoin.

## Packages

- **@phantom/sdk**: The core SDK that provides the Phantom wallet integration.
- **@phantom/demo-app**: A React-based demo app that demonstrates how to use the SDK.

## Getting Started

### Installation

```bash
# Using npm
npm install @phantom/sdk

# Using yarn
yarn add @phantom/sdk

# Using pnpm
pnpm add @phantom/sdk
```

### Basic Usage

```typescript
import { createPhantom, Position } from "@phantom/sdk";

// Create a wallet instance
const phantom = await createPhantom({
  position: Position.bottomRight,
  hideLauncherBeforeOnboarded: false,
  namespace: "my-app",
});

// Show the wallet
phantom.show();

// Access blockchain-specific interfaces
// Solana
const solanaPublicKey = await phantom.solana.connect();
console.log("Connected Solana account:", solanaPublicKey.toString());

// Ethereum
const ethereumAccounts = await phantom.ethereum.request({
  method: "eth_requestAccounts",
});
console.log("Connected Ethereum account:", ethereumAccounts[0]);

// Use wallet functions
phantom.buy({ buy: "solana:101/nativeToken:501" }); // Buy SOL
phantom.swap({
  buy: "solana:101/address:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  sell: "solana:101/nativeToken:501",
}); // Swap SOL to USDC
```

## Blockchain RPC Interfaces

The SDK provides access to Phantom's blockchain-specific RPC interfaces:

- `phantom.solana` - Solana RPC interface
- `phantom.ethereum` - Ethereum, Base, and Polygon RPC interface
- `phantom.sui` - Sui RPC interface
- `phantom.bitcoin` - Bitcoin RPC interface

## Development

```bash
# Install dependencies
yarn install

# Start the demo app
yarn start:demo

# Build all packages
yarn build
```

## Give Feedback

Phantom Embedded is in active development and will be prioritizing features requested by early adopters. If you are
interested in working with us, please email us at `developers@phantom.app` or message `@brianfriel` on Telegram.

## Frequently Asked Questions

<details>
  <summary>How does the embedded wallet work with the Phantom extension?</summary>

    If the Phantom extension is detected, we will not inject the embedded wallet. Phantom users can continue using their extension like normal.

    If you want to use the embedded wallet and the Phantom extension, you need to instantiate the wallet with a custom namespace.

</details>
<details>
  <summary>What does `createPhantom()` do?</summary>

    The Phantom embedded wallet lives inside an iframe. The `createPhantom` function loads and attaches the iframe to your website.

</details>
<details>
  <summary>How do I interact with the embedded wallet?</summary>

    Once `createPhantom` has been called, `window.phantom.solana` and a compliant wallet-standard provider will also be available in the global scope of your website. This means that most of your existing code for interacting with Solana wallets should work out of the box.

    Once a user has onboarded to the embedded wallet, they should be able to click your “connect wallet” button, which gives your website access to their Solana address. After that, signing messages and transactions should just work as normal.

    If you use a namespace, you will need to invoke the functions through the `window[namespace]` object, or directly through the returned Phantom instance.

</details>
<details>
  <summary>I can't see the embedded wallet on my website. What's wrong?</summary>

    The most common cause is that you are using a browser with the Phantom extension installed. If the Phantom extension is detected, we will not inject the embedded wallet, unless you use a custom namespace.

    You can temporarily disable the Phantom extension by going to `chrome://extensions` and toggling Phantom off.

</details>
<details>
  <summary>How much does this cost?</summary>

    It's free!

</details>

## Disclaimers

The embedded wallet is a beta version, and Phantom will not be liable for any losses or damages suffered by you or your end users.

Any suggestions, enhancement requests, recommendations, or other feedback provided by you regarding the embedded wallet will be the exclusive property of Phantom. By using this beta version and providing feedback, you agree to assign any rights in that feedback to Phantom.
