# @phantom/wallet-sdk

The Phantom Wallet SDK allows you to integrate Phantom's wallet functionality directly into your web application.

## Installation

```bash
# Using npm
npm install @phantom/wallet-sdk

# Using yarn
yarn add @phantom/wallet-sdk

# Using pnpm
pnpm add @phantom/wallet-sdk
```

## Usage Modes

The SDK supports two primary integration modes:

### 1. Popup Mode (Default)

In this mode, the Phantom wallet appears as a floating widget on your page in one of the predefined positions (bottom-right, bottom-left, top-right, top-left). This is the simplest integration method.

```typescript
import { createPhantom, Position } from "@phantom/wallet-sdk";

// Initialize the Phantom wallet as a popup
const phantom = await createPhantom({
  position: Position.bottomRight, // Choose from bottomRight, bottomLeft, topRight, topLeft
  hideLauncherBeforeOnboarded: false,
  namespace: "my-app",
});

// Show the wallet UI
phantom.show();
```

### 2. Element Mode (Custom Container)

In this mode, the Phantom wallet renders inside a specific HTML element that you provide. This gives you complete control over the wallet's positioning and layout within your application.

```typescript
import { createPhantom } from "@phantom/wallet-sdk";

// Make sure the container element exists in your DOM
// <div id="wallet-container" style="width: 400px; height: 600px;"></div>

// Initialize the Phantom wallet inside your container
const phantom = await createPhantom({
  element: "wallet-container", // ID of the container element
  namespace: "my-app",
});

// The wallet will automatically show in the container
// You can still use show/hide methods
phantom.show();
```

## Window Integration Behavior

### Default Behavior (No Namespace)

When you initialize the SDK without specifying a namespace:

```typescript
const phantom = await createPhantom();
```

The SDK behaves as follows:

1. If the Phantom browser extension is already installed, the SDK will **not** initialize a new embedded wallet to avoid conflicts. Your dApp will continue to use the extension.

2. If no extension is detected, the SDK will:
   - Attach the wallet instance to `window.phantom`
   - Expose blockchain RPC providers to their standard window objects:
     - `window.solana` for Solana
     - `window.ethereum` for Ethereum
     - And other blockchain providers

This means that existing dApps built for the Phantom extension can work with the embedded wallet without code changes - the same window objects they already use will be populated by the SDK.

### Custom Namespace Behavior

When you specify a custom namespace:

```typescript
const phantom = await createPhantom({ namespace: "myCustomWallet" });
```

The SDK will:

1. Initialize even if the Phantom extension is installed (allowing both to coexist)
2. Attach the wallet instance to `window.myCustomWallet` instead of `window.phantom`
3. Not automatically expose providers to standard window objects to avoid conflicts with the extension

In this case, you must use the returned object for all interactions:

```typescript
// Connect to Solana using your namespaced instance
const publicKey = await phantom.solana.connect();
```

### Usage with Existing dApps

For existing dApps that detect and use standard provider patterns:

1. **Extension Installed**: The dApp will use the extension as normal
2. **No Extension, Default Namespace**: The dApp will use the embedded wallet through the standard window objects
3. **Custom Namespace**: You'll need to modify your dApp code to use the custom instance

### Skip Injection Behavior

When you set `skipInjection` to `true`:

```typescript
const phantom = await createPhantom({ skipInjection: true });
```

The SDK will:

1. Not inject any providers into the window object, even if no extension is detected
2. Return all providers through the Phantom instance only
3. Work with the new event structure that passes providers directly in the event detail

This is useful when you want to avoid any global namespace pollution and prefer to access all functionality through the returned Phantom instance.

## Configuration Options

The `createPhantom` function accepts the following configuration options:

```typescript
export type CreatePhantomConfig = Partial<{
  zIndex: number; // Set the z-index of the wallet UI
  hideLauncherBeforeOnboarded: boolean; // Hide the launcher for new users
  colorScheme: string; // Light or dark mode
  paddingBottom: number; // Padding from bottom of screen
  paddingRight: number; // Padding from right of screen
  paddingTop: number; // Padding from top of screen
  paddingLeft: number; // Padding from left of screen
  position: Position; // Position on screen (bottomRight, bottomLeft, topRight, topLeft)
  sdkURL: string; // Custom SDK URL
  element: string; // ID of element to render wallet in (for custom positioning)
  namespace: string; // Namespace for the wallet instance
  skipInjection: boolean; // Skip injecting providers into the window object
}>;
```

**Note**: When using Element Mode, the `position` setting is ignored since the wallet will render inside your specified container element.

## Phantom Interface

The `createPhantom` function returns a `Phantom` interface with the following methods and properties:

```typescript
export interface Phantom {
  // UI Controls
  show: () => void; // Show the wallet UI
  hide: () => void; // Hide the wallet UI

  // Wallet Actions
  buy: (options: { amount?: number; buy: string }) => void; // Buy tokens
  swap: (options: { buy: string; sell?: string; amount?: string }) => void; // Swap tokens
  navigate: ({ route, params }: { route: string; params?: any }) => void; // Navigate within wallet

  // Blockchain RPC Interfaces
  solana?: any; // Solana RPC interface
  ethereum?: any; // Ethereum RPC interface
  sui?: any; // Sui RPC interface
  bitcoin?: any; // Bitcoin RPC interface

  // App Interface
  app: PhantomApp; // Phantom app interface
}
```

## Blockchain RPC Interfaces

The SDK exposes blockchain-specific RPC interfaces through the Phantom instance:

### Solana

```typescript
// Connect to wallet
const publicKey = await phantom.solana.connect();

// Sign a message
const message = new TextEncoder().encode("Hello, Solana!");
const signature = await phantom.solana.signMessage(message);

// Send a transaction
const transaction = new Transaction();
// ... add instructions ...
const signature = await phantom.solana.signAndSendTransaction(transaction);
```

For detailed examples, see [Solana documentation](https://docs.phantom.com/solana/sending-a-transaction).

### Ethereum, Base & Polygon

```typescript
// Connect to wallet
const accounts = await phantom.ethereum.request({
  method: "eth_requestAccounts",
});

// Sign a message
const from = accounts[0];
const message = "Hello, Ethereum!";
const signature = await phantom.ethereum.request({
  method: "personal_sign",
  params: [message, from],
});

// Send a transaction
const txHash = await phantom.ethereum.request({
  method: "eth_sendTransaction",
  params: [
    {
      from,
      to: "0x...",
      value: "0x...",
      // other tx params
    },
  ],
});
```

For detailed examples, see [Ethereum documentation](https://docs.phantom.com/ethereum-monad-testnet-base-and-polygon/sending-a-transaction).

### Sui

```typescript
// Connect to wallet
const accounts = await phantom.sui.connect();

// Sign a transaction
// ... create transaction ...
const signedTx = await phantom.sui.signTransaction(tx);
```

For detailed examples, see [Sui documentation](https://docs.phantom.com/sui-beta/sending-a-transaction).

### Bitcoin

```typescript
// Connect to wallet
const accounts = await phantom.bitcoin.connect();

// Sign a PSBT
// ... create PSBT ...
const signedPsbt = await phantom.bitcoin.signPsbt(psbt);
```

For detailed examples, see [Bitcoin documentation](https://docs.phantom.com/bitcoin/sending-a-transaction).

## Wallet Actions

### Buy Tokens

```typescript
// Buy SOL with default amount
phantom.buy({ buy: "solana:101/nativeToken:501" });

// Buy SOL with specific amount
phantom.buy({ buy: "solana:101/nativeToken:501", amount: 10 });
```

### Swap Tokens

```typescript
// Swap SOL to USDC
phantom.swap({
  sell: "solana:101/nativeToken:501",
  buy: "solana:101/address:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});

// Swap SOL to USDC with specific amount
phantom.swap({
  sell: "solana:101/nativeToken:501",
  buy: "solana:101/address:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amount: "1000000000",
});
```
