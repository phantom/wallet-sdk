# Phantom Browser SDK

The Phantom Browser SDK allows you to interact with the Phantom wallet from your web application. It uses a plugin system to support different blockchains.

## Installation

You can install the SDK using npm or yarn:

**npm:**

```bash
npm install @phantom/browser-sdk
```

**yarn:**

```bash
yarn add @phantom/browser-sdk
```

## Usage

Here's an example of how to import and use the SDK with the Solana plugin:

```typescript
import { createPhantom } from "@phantom/browser-sdk";
import { createSolanaPlugin } from "@phantom/browser-sdk/solana"; // Import the solana plugin

// Create a Phantom instance with the Solana plugin
const phantom = createPhantom({
  chainPlugins: [createSolanaPlugin()],
});

// Now you can use the Solana-specific methods
async function connectAndSign() {
  try {
    // Get the Solana provider (Phantom wallet instance)
    const provider = phantom.solana.getProvider();

    if (!provider) {
      console.error("Phantom wallet not found. Please install Phantom.");
      return;
    }

    // Attempt to connect to the wallet
    // The actual connect method might be part of the provider,
    // this example assumes a common pattern.
    // You might need to call provider.connect() or a similar method
    // depending on the provider's API.
    // For instance, with Solana's window.solana, it's often implicit or handled by specific actions.

    // Example: Sign in (if supported by the specific provider/plugin)
    const signInResult = await phantom.solana.signIn();
    console.log("Sign In Result:", signInResult);

    // Example: Sign a message
    const message = new TextEncoder().encode("Hello from Phantom Browser SDK!");
    const signedMessage = await phantom.solana.signMessage(message, "utf8");
    console.log("Signed Message:", signedMessage);

    // Example: Sign and send a transaction
    // Note: Constructing a real transaction requires @solana/web3.js
    // This is a conceptual example.
    /*
    import { Connection, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

    // Placeholder for a real transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey, // Assuming provider has publicKey
        toPubkey: provider.publicKey, // Sending to self for example
        lamports: 1000,
      })
    );
    const connection = new Connection("https://api.devnet.solana.com"); // or your desired cluster

    // The SDK provides `signAndSendTransaction` which may handle connection internally or require it
    // Check the specific implementation or provider documentation
    const signature = await phantom.solana.signAndSendTransaction(transaction, connection); // Adjust based on actual API
    console.log('Transaction Signature:', signature);
    */
  } catch (error) {
    console.error("Error interacting with Phantom:", error);
  }
}

connectAndSign();
```

### Available Solana Methods

Once the `phantom.solana` object is initialized, you can access the following methods:

- `getProvider(): PhantomSolanaProvider | null`
  - Retrieves the Phantom Solana provider instance.
- `signIn(): Promise<SignInResult>`
  - Initiates a sign-in request to the wallet.
- `signMessage(message: Uint8Array | string, display?: 'utf8' | 'hex'): Promise<SignedMessage>`
  - Prompts the user to sign a given message.
- `signAndSendTransaction(transaction: Transaction, connection?: Connection, options?: SendOptions): Promise<TransactionSignature>`
  - Prompts the user to sign and then sends the transaction. (Requires `@solana/web3.js` for `Transaction` object)

Please refer to the Phantom documentation and the `@solana/web3.js` library for more details on constructing transactions and interacting with the Solana blockchain.
