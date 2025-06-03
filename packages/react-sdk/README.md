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

### usePhantom

The `usePhantom` hoo provides access to the phantom instance. With Phantom instance you can call browser-sdk methods directly.

## Solana API Reference

### useProvider

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

- `connect: () => Promise<ConnectResponse>` - An asynchronous function that initiates the connection process. Returns a promise that resolves with the connection response (e.g., `{ publicKey: string }`) or rejects if connection fails.

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

### useAccount

The `useAccount` hook provides access the currently connected account state. It is reactive and changes according to the connected account state.

#### Return Value

The hook returns an object with the following properties:

- `status: 'loading' | 'connected' | 'disconnected'` - Current account status
- `publicKey: string | null` - Current public key of the connected account or null when account is not connected.

### useSignIn (Solana)

The `useSignIn` hook provides a function to initiate a sign-in request to the Phantom wallet for Solana. This is compliant with SIP-001 (Sign In With Solana).

#### Return Value

The hook returns an object with the following property:

- `signIn: (signInData: SolanaSignInData) => Promise<{ address: string; signature: Uint8Array; signedMessage: Uint8Array }>` - An asynchronous function that initiates the sign-in process. `SolanaSignInData` is a type imported from `@phantom/browser-sdk/solana`. Returns a promise that resolves with the `address` (string), `signature` (Uint8Array), and `signedMessage` (Uint8Array), or rejects if the sign-in fails.

```tsx
import { useSignIn } from "@phantom/react-sdk"; // Or '@phantom/react-sdk/solana' if specific
import { SolanaSignInData } from "@phantom/browser-sdk/solana"; // This type might be needed from the browser-sdk

function MyComponent() {
  const { signIn } = useSignIn();

  const handleSignInClick = async () => {
    // Construct SolanaSignInData according to your needs
    // This typically includes the domain and a statement for the user.
    const signInData: SolanaSignInData = {
      domain: window.location.host,
      statement: "Please sign in to access exclusive features.",
      // Other fields like `nonce`, `chainId`, `resources` can be added as per SIP-001
    };

    try {
      const result = await signIn(signInData);
      console.log("Sign In successful. Address:", result.address.toString());
      // You can now verify the signature and signedMessage on your backend
      // Handle successful sign-in (e.g., update UI, set user session)
    } catch (err) {
      console.error("Sign In error:", err);
      // Handle sign-in error (e.g., show error message to user)
    }
  };

  return <button onClick={handleSignInClick}>Sign In with Solana</button>;
}
```

### useSignMessage (Solana)

The `useSignMessage` hook provides a function to prompt the user to sign an arbitrary message with their Solana account.

#### Return Value

The hook returns an object with the following property:

- `signMessage: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<{ signature: Uint8Array; publicKey: string }>` - An asynchronous function that prompts the user to sign a message. The `message` must be a `Uint8Array`. The optional `display` parameter can be 'utf8' (default) or 'hex' to suggest how the wallet should display the message bytes. Returns a promise that resolves with the `signature` (Uint8Array) and `publicKey` (string) of the signer, or rejects if signing fails.

```tsx
import { useSignMessage } from "@phantom/react-sdk"; // Or '@phantom/react-sdk/solana' if specific

function MyComponent() {
  const { signMessage } = useSignMessage();

  const handleSignMessage = async () => {
    const messageToSign = "Please confirm your action by signing this message.";
    const messageBytes = new TextEncoder().encode(messageToSign);
    try {
      const { signature, publicKey } = await signMessage(messageBytes, "utf8");
      console.log("Message signed successfully!");
      console.log("Signature:", signature);
      console.log("Public Key:", publicKey);
      // You can now verify this signature on a backend or use it as needed.
    } catch (err) {
      console.error("Sign message error:", err);
      // Handle error (e.g., user rejected, wallet error)
    }
  };

  return <button onClick={handleSignMessage}>Sign Message</button>;
}
```

### useSignAndSendTransaction (Solana)

The `useSignAndSendTransaction` hook prompts the user to sign **and** send a Kit-style transaction.

#### Return Value

The hook returns an object with the following property:

- `signAndSendTransaction(transaction: Transaction): Promise<{ signature: string; publicKey?: string }>` – accepts a `Transaction` built with **`@solana/kit`** and returns the confirmed signature.

```tsx
import { useSignAndSendTransaction } from "@phantom/react-sdk/solana"; // scoped import is fine
import {
  createSolanaRpc,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  pipe,
  address,
  compileTransaction,
} from "@solana/kit";

function MyComponent() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const handlePayment = async (publicKey: string) => {
    // 0️⃣  Ensure the wallet is connected and we have a fee-payer address
    if (!publicKey) return console.error("Wallet not connected");

    try {
      // 1️⃣  Fetch a recent blockhash
      const rpc = createSolanaRpc("https://api.devnet.solana.com");
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      // 2️⃣  Build a minimal v0 transaction message (no instructions – demo only)
      const txMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayer(address(publicKey), tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      );

      const transaction = compileTransaction(txMessage);

      // 3️⃣  Prompt the user to sign and send
      const { signature } = await signAndSendTransaction(transaction);
      console.log("Transaction signature:", signature);
    } catch (err) {
      console.error("Transaction error:", err);
    }
  };

  return <button onClick={() => handlePayment("YOUR_CONNECTED_WALLET_PUBLIC_KEY")}>Send 0.001 SOL</button>;
}
```

### useAccountEffect

The `useAccountEffect` hook provides easy way to subscribe to events like `connect`, `disconnect` and `accountChanged`. You can subscribe by calling the hook and declaring event callbacks you want to react to.

Example:

```tsx
useAccountEffect({
  onConnect: data => {
    console.log("Connected to Phantom with public key:", data.publicKey);
  },
  onDisconnect: () => {
    console.log("Disconnected from Phantom");
  },
  onAccountChanged: data => {
    console.log("Account changed to:", data.publicKey);
  },
});
```
