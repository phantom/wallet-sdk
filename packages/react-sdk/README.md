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

### useSignIn (Solana)

The `useSignIn` hook provides a function to initiate a sign-in request to the Phantom wallet for Solana. This is compliant with SIP-001 (Sign In With Solana).

#### Return Value

The hook returns an object with the following property:

- `signIn: (signInData: SolanaSignInData) => Promise<{ address: PublicKey; signature: Uint8Array; signedMessage: Uint8Array }>` - An asynchronous function that initiates the sign-in process. `SolanaSignInData` is a type imported from `@phantom/browser-sdk/solana`. Returns a promise that resolves with the `address` (PublicKey), `signature` (Uint8Array), and `signedMessage` (Uint8Array), or rejects if the sign-in fails.

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

- `signMessage: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<{ signature: Uint8Array; publicKey: PublicKey }>` - An asynchronous function that prompts the user to sign a message. The `message` must be a `Uint8Array`. The optional `display` parameter can be 'utf8' (default) or 'hex' to suggest how the wallet should display the message bytes. Returns a promise that resolves with the `signature` (Uint8Array) and `publicKey` (PublicKey) of the signer, or rejects if signing fails.

```tsx
import { useSignMessage } from "@phantom/react-sdk"; // Or '@phantom/react-sdk/solana' if specific
import { PublicKey } from "@solana/web3.js"; // Assuming PublicKey might be used or needed

function MyComponent() {
  const { signMessage } = useSignMessage();

  const handleSignMessage = async () => {
    const messageToSign = "Please confirm your action by signing this message.";
    const messageBytes = new TextEncoder().encode(messageToSign);
    try {
      const { signature, publicKey } = await signMessage(messageBytes, "utf8");
      console.log("Message signed successfully!");
      console.log("Signature:", signature);
      console.log("Public Key:", publicKey.toString());
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

The `useSignAndSendTransaction` hook provides a function to prompt the user to sign and then send a transaction on the Solana network.

#### Return Value

The hook returns an object with the following property:

- `signAndSendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<{ signature: string; publicKey?: string }>` - An asynchronous function that prompts to sign and then sends a transaction. `Transaction` and `VersionedTransaction` are types from `@solana/web3.js`. Returns a promise that resolves with the transaction `signature` (string) and an optional `publicKey` (string) of the signer, or rejects if the process fails.

```tsx
import { useSignAndSendTransaction } from "@phantom/react-sdk"; // Or '@phantom/react-sdk/solana' if specific
import { Transaction, SystemProgram, PublicKey, Connection } from "@solana/web3.js";
// For VersionedTransaction, you might need: import { VersionedTransaction } from '@solana/web3.js';

function MyComponent() {
  const { signAndSendTransaction } = useSignAndSendTransaction();
  // Assume `connectedPublicKey` is available from `useConnect` or similar context
  const connectedPublicKey = new PublicKey("YOUR_CONNECTED_WALLET_PUBLIC_KEY"); // Replace with actual public key

  const handlePayment = async () => {
    if (!connectedPublicKey) {
      console.error("Wallet not connected");
      return;
    }

    // Example: Create a simple SOL transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: connectedPublicKey,
        toPubkey: new PublicKey("RECEIVER_PUBLIC_KEY_HERE"), // Replace with recipient's public key
        lamports: 1000000, // 0.001 SOL (1 SOL = 1,000,000,000 lamports)
      }),
    );

    // Optional: Set recent blockhash and fee payer if not handled by the hook/provider
    // const connection = new Connection("https://api.devnet.solana.com");
    // transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    // transaction.feePayer = connectedPublicKey;

    try {
      const { signature } = await signAndSendTransaction(transaction);
      console.log(`Transaction successful with signature: ${signature}`);
      // You can now monitor this signature on a Solana explorer or use a connection to confirm the transaction.
    } catch (err) {
      console.error("Sign and send transaction error:", err);
      // Handle error (e.g., user rejected, insufficient funds, network error)
    }
  };

  return <button onClick={handlePayment}>Send 0.001 SOL</button>;
}
```
