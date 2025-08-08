# Phantom Browser Injected SDK

The Phantom Browser Injected SDK allows you to interact with the Phantom wallet from your web application. (Browser Extension and Mobile)

## Installation

You can install the SDK using npm or yarn:

**npm:**

```bash
npm install @phantom/browser-injected-sdk
```

**yarn:**

```bash
yarn add @phantom/browser-injected-sdk
```

## Usage

Here's an example of how to import and use the SDK with the Solana plugin:

```typescript
import { createPhantom } from "@phantom/browser-injected-sdk";
import { createSolanaPlugin } from "@phantom/browser-injected-sdk/solana"; // Import the solana plugin
import { createEthereumPlugin } from "@phantom/browser-injected-sdk/ethereum";

// Create a Phantom instance with the Solana plugin
const phantom = createPhantom({
  plugins: [createSolanaPlugin(), createEthereumPlugin()],
});

// Now you can use the Solana-specific methods
async function connectAndSign() {
  try {
    // Attempt to connect to the wallet
    const connectionResult = await phantom.solana.connect();
    console.log("Connection Result:", connectionResult.address);

    // Example: Sign in (if supported by the specific provider/plugin)
    // Construct SolanaSignInData according to your needs
    const signInData = { domain: window.location.host, statement: "Please sign in to access this dApp." };
    const signInResult = await phantom.solana.signIn(signInData);
    console.log("Sign In Result:", signInResult.address);

    // Example: Sign a message
    const message = new TextEncoder().encode("Hello from Phantom Browser SDK!");
    const signedMessage = await phantom.solana.signMessage(message, "utf8");
    console.log("Signed Message:", signedMessage);
  } catch (error) {
    console.error("Error interacting with Phantom:", error);
  }
}

connectAndSign();
```

### Available Solana Methods

Once the `phantom.solana` object is initialized, you can access the following methods:

- `connect(opts?: { onlyIfTrusted?: boolean }): Promise<string>`
  - Connects to the Phantom wallet. Optionally, `onlyIfTrusted` can be set to true to only connect if the dApp is already trusted.
- `disconnect(): Promise<void>`
  - Disconnects from the Phantom wallet.
- `getAccount(): Promise<string | undefined>`
  - Gets the current connected address
- `signIn(): Promise<SignInResult>`
  - Initiates a sign-in request to the wallet.
- `signMessage(message: Uint8Array | string, display?: 'utf8' | 'hex'): Promise<SignedMessage>`
  - Prompts the user to sign a given message.
- `signAndSendTransaction(transaction: Transaction): Promise<{ signature: string; address?: string }>`
  - Prompts the user to sign **and send** a Kit `Transaction` and returns the confirmed signature.

### Event Handling

The SDK also allows you to listen for `connect`, `disconnect`, and `accountChanged` events:

- `addEventListener(event: PhantomEventType, callback: PhantomEventCallback): () => void`
  - Registers a callback that will be invoked when the specified event occurs.
  - For the `connect` event, the callback receives the public key (as a string) of the connected account.
  - For the `disconnect` event, the callback receives no arguments.
  - For the `accountChanged` event, the callback receives the new public key (as a string).
  - Returns a function that, when called, will unregister the callback.
  - Multiple callbacks can be registered for the same event.

  **Example:**

  ```typescript
  const phantom = createPhantom({ plugins: [createSolanaPlugin()] });

  const handleConnect = (address: string) => {
    console.log(`Wallet connected with public key: ${address}`);
  };

  const clearConnectListener = phantom.solana.addEventListener("connect", handleConnect);

  const handleAccountChanged = (newAddress: string) => {
    console.log(`Account changed to: ${newAddress}`);
  };

  const clearAccountChangedListener = phantom.solana.addEventListener("accountChanged", handleAccountChanged);

  // To stop listening for a specific event:
  // clearConnectListener();
  // clearAccountChangedListener();
  ```

- `removeEventListener(event: PhantomEventType, callback: PhantomEventCallback): void`
  - Unregisters a previously registered callback for the specified event.

  **Example:**

  ```typescript
  const phantom = createPhantom({ plugins: [createSolanaPlugin()] });

  const handleDisconnect = () => {
    console.log("Wallet disconnected");
  };

  phantom.solana.addEventListener("disconnect", handleDisconnect);

  // To stop listening for this specific disconnect event:
  // phantom.solana.removeEventListener("disconnect", handleDisconnect);
  ```

### Creating a transaction

Phantom's SDK uses the `@solana/kit` library to create transactions. You can use the `createTransactionMessage` function to create a transaction message.

```typescript
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";

// Example: Sign and send a transaction

const rpc = createSolanaRpc("https://my-rpc-url.com"); // Replace with your own RPC URL

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayer(address(userPublicKey as string), tx),
  tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
);

const transaction = compileTransaction(transactionMessage);

const { signature } = await phantomInstance.solana.signAndSendTransaction(transaction);
```
