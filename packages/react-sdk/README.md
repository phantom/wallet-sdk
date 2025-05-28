# Phantom React SDK

React hooks and components for integrating with Phantom wallet.

## Installation

```bash
npm install @phantom/react-sdk @phantom/browser-sdk
```

## Quick Start

```tsx
import React from "react";
import { PhantomProvider, useConnect } from "@phantom/react-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";

function App() {
  return (
    <PhantomProvider config={{ chainPlugins: [createSolanaPlugin()] }}>
      <WalletComponent />
    </PhantomProvider>
  );
}

function WalletComponent() {
  const { connect } = useConnect();

  const handleConnect = async () => {
    try {
      const connectedAccount = await connect();
      console.log("Wallet connected:", connectedAccount?.publicKey?.toString());
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handleConnect}>Connect to Solana</button>
    </div>
  );
}

export default App;
```

## API Reference

### PhantomProvider

The PhantomProvider component provides the Phantom context to child components.

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana";

<PhantomProvider config={{ chainPlugins: [createSolanaPlugin()] }}>{children}</PhantomProvider>;
```

### useProvider (Solana)

The `useProvider` hook provides access to the Solana provider with automatic retry logic and state management.

#### Return Value

The hook returns an object with the following properties:

- `status: 'loading' | 'success' | 'error'` - Current status of the provider
- `provider: NonNullable<unknown> | null` - The Solana provider instance (null when not available)

### useConnect (Solana)

The `useConnect` hook provides a function to connect to the Phantom wallet for Solana.

#### Props

- `autoConnect?: boolean` (optional) - If `true`, attempts to connect to the wallet automatically when the component mounts. Defaults to `false`.

#### Return Value

The hook returns an object with the following property:

- `connect: () => Promise<ConnectResponse>` - An asynchronous function that initiates the connection process. Returns a promise that resolves with the connection response (e.g., `{ publicKey: PublicKey }`) or rejects if connection fails.

```tsx
import { useConnect } from "@phantom/react-sdk"; // Or '@phantom/react-sdk/solana' if specific

function MyComponent() {
  const { connect } = useConnect({ autoConnect: true });

  const handleConnectClick = async () => {
    try {
      const res = await connect();
      console.log("Connected:", res.publicKey.toString());
    } catch (err) {
      console.error("Connection error:", err);
    }
  };
  // ...
}
```

### useDisconnect (Solana)

The `useDisconnect` hook provides a function to disconnect from the Phantom wallet for Solana.

#### Return Value

The hook returns an object with the following property:

- `disconnect: () => Promise<void>` - An asynchronous function that initiates the disconnection process. Returns a promise that resolves when disconnection is complete or rejects if disconnection fails.

```tsx
import { useDisconnect } from "@phantom/react-sdk"; // Or '@phantom/react-sdk/solana' if specific

function MyComponent() {
  const { disconnect } = useDisconnect();

  const handleDisconnectClick = async () => {
    try {
      await disconnect();
      console.log("Disconnected");
    } catch (err) {
      console.error("Disconnection error:", err);
    }
  };
  // ...
}
```
