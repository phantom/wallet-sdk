# @phantom/browser-sdk

Browser SDK for Phantom Wallet supporting both injected and embedded non-custodial wallets with chain-specific APIs.

## Quick Start

```bash
npm install @phantom/browser-sdk
```

### Injected Provider (Browser Extension)

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Connect to Phantom browser extension
const sdk = new BrowserSDK({
  providerType: "injected",
  addressTypes: [AddressType.solana, AddressType.ethereum],
});

const { addresses } = await sdk.connect();
console.log("Connected addresses:", addresses);

// Chain-specific operations
const message = "Hello from Phantom!";
const solanaSignature = await sdk.solana.signMessage(message);

// Encode the message as hex for EVM
const encoded = "0x" + Buffer.from(message, "utf8").toString("hex");
const ethSignature = await sdk.ethereum.signPersonalMessage(encoded, addresses[1].address);

// Sign and send transactions
const solanaResult = await sdk.solana.signAndSendTransaction(mySolanaTransaction);
const ethResult = await sdk.ethereum.sendTransaction(myEthTransaction);
```

### Embedded Provider

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Create embedded non-custodial wallet
const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  apiBaseUrl: "https://api.phantom.app/v1/wallets",
  organizationId: "your-org-id",
});

const { walletId, addresses } = await sdk.connect();
console.log("Wallet ID:", walletId);
console.log("Addresses:", addresses);

// Use chain-specific APIs
const solanaResult = await sdk.solana.signAndSendTransaction(mySolanaTransaction);
const ethResult = await sdk.ethereum.sendTransaction(myEthTransaction);
```

## Features

- **🔒 Non-Custodial**: Full user control of private keys for both injected and embedded wallets
- **🌐 Dual Provider Support**: Works with Phantom browser extension or creates embedded wallets
- **⛓️ Chain-Specific APIs**: Dedicated interfaces for Solana and Ethereum operations
- **🛠️ Native Transactions**: Work with blockchain-native objects, not base64url strings
- **🔗 Multi-Chain**: Solana and Ethereum support with dedicated methods
- **⚡ TypeScript**: Full type safety for all transaction formats
- **🎯 Unified API**: Same interface for both injected and embedded providers

## Connection Flow

After instantiating the SDK, use `sdk.connect()` to establish a connection to the wallet:

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// 1. Create SDK instance
const sdk = new BrowserSDK({
  providerType: "injected",
  addressTypes: [AddressType.solana, AddressType.ethereum],
});

// 2. Connect to wallet
const { addresses } = await sdk.connect();
console.log("Connected addresses:", addresses);

// 3. Use chain-specific methods
const signature = await sdk.solana.signMessage("Hello!");
const ethResult = await sdk.ethereum.sendTransaction({
  to: "0x...",
  value: "1000000000000000000",
  gas: "21000",
});
```

### Connection Options

For embedded user-wallets, you can specify authentication providers:

```typescript
// Default: Show provider selection screen
const result = await sdk.connect();

// Google authentication (skips provider selection)
const result = await sdk.connect({
  authOptions: {
    provider: "google",
  },
});

// Apple authentication (skips provider selection) 
const result = await sdk.connect({
  authOptions: {
    provider: "apple",
  },
});
```

## Chain-Specific APIs

The SDK provides separate interfaces for each blockchain with optimized methods:

### Solana Chain (`sdk.solana`)

```typescript
// Message signing
const signature = await sdk.solana.signMessage("Hello Solana!");

// Transaction signing (without sending)
const signedTx = await sdk.solana.signTransaction(transaction);

// Sign and send transaction
const result = await sdk.solana.signAndSendTransaction(transaction);

// Network switching
await sdk.solana.switchNetwork('devnet');

// Utilities
const publicKey = await sdk.solana.getPublicKey();
const isConnected = sdk.solana.isConnected();
```

### Ethereum Chain (`sdk.ethereum`)

```typescript
// EIP-1193 requests
const accounts = await sdk.ethereum.request({ method: 'eth_accounts' });
const chainId = await sdk.ethereum.request({ method: 'eth_chainId' });

// Message signing
const signature = await sdk.ethereum.signPersonalMessage(message, address);

// EIP-712 typed data signing
const typedDataSignature = await sdk.ethereum.signTypedData(typedData, address);

// Transaction sending
const result = await sdk.ethereum.sendTransaction({
  to: "0x...",
  value: "1000000000000000000", // 1 ETH in wei
  gas: "21000",
});

// Network switching
await sdk.ethereum.switchChain(1); // Ethereum mainnet
await sdk.ethereum.switchChain(137); // Polygon

// Utilities
const chainId = await sdk.ethereum.getChainId();
const accounts = await sdk.ethereum.getAccounts();
const isConnected = sdk.ethereum.isConnected();
```

## Provider Types

### Injected Provider

Uses the Phantom browser extension installed by the user. No additional configuration needed.

```typescript
const sdk = new BrowserSDK({
  providerType: "injected",
  addressTypes: [AddressType.solana, AddressType.ethereum],
});
```

### Embedded Provider

Creates a non-custodial wallet embedded in your application. Requires API configuration.

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  apiBaseUrl: "https://api.phantom.app/v1/wallets",
  organizationId: "your-org-id",
  embeddedWalletType: "app-wallet", // or 'user-wallet'
  authOptions: {
    authUrl: "https://auth.phantom.app", // optional, defaults to "https://connect.phantom.app"
    redirectUrl: "https://yourapp.com/callback", // optional, defaults to current page
  },
  appName: "My DApp", // optional, for branding
  appLogo: "https://myapp.com/logo.png", // optional, for branding
  debug: {
    enabled: true, // optional, enable debug logging
    level: DebugLevel.INFO, // optional, debug level
  },
});
```

### Embedded Wallet Types

#### App Wallet (`'app-wallet'`)

- **New wallets** created per application
- **Unfunded** by default - you need to fund them
- **Independent** from user's existing Phantom wallet
- **Perfect for**: Gaming, DeFi protocols, or apps that need fresh wallets

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  embeddedWalletType: "app-wallet",
  addressTypes: [AddressType.solana],
  // ... other config
});
```

#### User Wallet (`'user-wallet'`)

- **Uses Phantom authentication** - user logs in with existing Phantom account
- **Potentially funded** - brings in user's existing wallet balance
- **Connected** to user's Phantom ecosystem
- **Perfect for**: Trading platforms, NFT marketplaces, or apps needing funded wallets

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  embeddedWalletType: "user-wallet",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  // ... other config
});
```

### Available AddressTypes

| AddressType                 | Supported Chains                    |
| --------------------------- | ----------------------------------- |
| `AddressType.solana`        | Solana Mainnet, Devnet, Testnet     |
| `AddressType.ethereum`      | Ethereum, Polygon, Arbitrum, and more |

### Solana Provider Configuration

When using `AddressType.solana`, you can choose between two Solana libraries:

```typescript
const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.solana],
  solanaProvider: "web3js", // or 'kit'
  // ... other config
});
```

**Provider Options:**

- `'web3js'` (default) - Uses `@solana/web3.js` library
- `'kit'` - Uses `@solana/kit` library (modern, TypeScript-first)

**When to use each:**

- **@solana/web3.js**: Better ecosystem compatibility, wider community support
- **@solana/kit**: Better TypeScript support, modern architecture, smaller bundle size

## API Reference

### Constructor

```typescript
new BrowserSDK(config: BrowserSDKConfig)
```

#### BrowserSDKConfig

```typescript
interface BrowserSDKConfig {
  providerType: "injected" | "embedded";
  appName?: string; // Optional app name for branding
  appLogo?: string; // Optional app logo URL for branding
  addressTypes?: AddressType[]; // Networks to enable (e.g., [AddressType.solana])

  // Required for embedded provider only
  apiBaseUrl?: string; // Phantom API base URL
  organizationId?: string; // Your organization ID
  authOptions?: {
    authUrl?: string; // Custom auth URL (default: "https://connect.phantom.app")
    redirectUrl?: string; // Custom redirect URL after authentication
  };
  embeddedWalletType?: "app-wallet" | "user-wallet"; // Wallet type
  solanaProvider?: "web3js" | "kit"; // Solana library choice (default: 'web3js')

  // Debug options
  debug?: {
    enabled?: boolean; // Enable debug logging
    level?: DebugLevel; // Debug level
    callback?: DebugCallback; // Custom debug callback
  };
}
```

### Core Methods

#### connect()

Connect to wallet and get addresses for configured AddressTypes.

```typescript
const result = await sdk.connect();
// Returns: { walletId?: string, addresses: WalletAddress[] }
// addresses only includes types from addressTypes config
```

#### getAddresses()

Get connected wallet addresses.

```typescript
const addresses = await sdk.getAddresses();
// Returns addresses matching configured AddressTypes
```

#### disconnect()

Disconnect from wallet and clear session.

```typescript
await sdk.disconnect();
```

#### isConnected()

Check if SDK is connected to a wallet.

```typescript
const connected = sdk.isConnected();
```

#### getWalletId()

Get the wallet ID (embedded wallets only).

```typescript
const walletId = sdk.getWalletId();
// Returns string for embedded wallets, null for injected
```

### Solana Chain Methods

#### signMessage(message)

Sign a message with the Solana wallet.

```typescript
const signature = await sdk.solana.signMessage("Hello Solana!");
// Returns: { signature: string, rawSignature: string }
```

#### signTransaction(transaction)

Sign a transaction without sending it.

```typescript
const signedTx = await sdk.solana.signTransaction(transaction);
// Returns the signed transaction object
```

#### signAndSendTransaction(transaction)

Sign and send a transaction to the Solana network.

```typescript
const result = await sdk.solana.signAndSendTransaction(transaction);
// Returns: { hash: string, rawTransaction: string, blockExplorer?: string }
```

#### switchNetwork(network)

Switch between Solana networks.

```typescript
await sdk.solana.switchNetwork('mainnet');
await sdk.solana.switchNetwork('devnet');
```

#### getPublicKey()

Get the current Solana public key.

```typescript
const publicKey = await sdk.solana.getPublicKey();
// Returns: string | null
```

#### isConnected()

Check if connected to Solana wallet.

```typescript
const connected = sdk.solana.isConnected();
// Returns: boolean
```

### Ethereum Chain Methods

#### request(args)

Make an EIP-1193 compatible request.

```typescript
const accounts = await sdk.ethereum.request({ method: 'eth_accounts' });
const chainId = await sdk.ethereum.request({ method: 'eth_chainId' });
const balance = await sdk.ethereum.request({ 
  method: 'eth_getBalance', 
  params: [address, 'latest'] 
});
```

#### signPersonalMessage(message, address)

Sign a personal message.

```typescript
const signature = await sdk.ethereum.signPersonalMessage("Hello Ethereum!", address);
// Returns: { signature: string, rawSignature: string }
```

#### signTypedData(typedData, address)

Sign EIP-712 typed data.

```typescript
const typedData = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" }
    ],
    Mail: [
      { name: "from", type: "string" },
      { name: "to", type: "string" },
      { name: "contents", type: "string" }
    ]
  },
  primaryType: "Mail",
  domain: {
    name: "Ether Mail",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
  },
  message: {
    from: "Alice",
    to: "Bob",
    contents: "Hello!"
  }
};

const signature = await sdk.ethereum.signTypedData(typedData, address);
// Returns: { signature: string, rawSignature: string }
```

#### sendTransaction(transaction)

Send an Ethereum transaction.

```typescript
const result = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: "1000000000000000000", // 1 ETH in wei
  gas: "21000",
  gasPrice: "20000000000", // 20 gwei
});
// Returns: { hash: string, rawTransaction: string, blockExplorer?: string }
```

#### switchChain(chainId)

Switch to a different Ethereum chain.

```typescript
await sdk.ethereum.switchChain(1);    // Ethereum mainnet
await sdk.ethereum.switchChain(137);  // Polygon
await sdk.ethereum.switchChain(42161); // Arbitrum One
```

#### getChainId()

Get the current chain ID.

```typescript
const chainId = await sdk.ethereum.getChainId();
// Returns: number
```

#### getAccounts()

Get connected Ethereum accounts.

```typescript
const accounts = await sdk.ethereum.getAccounts();
// Returns: string[]
```

#### isConnected()

Check if connected to Ethereum wallet.

```typescript
const connected = sdk.ethereum.isConnected();
// Returns: boolean
```

## Transaction Examples

### Solana Transactions

The SDK supports two different Solana transaction libraries. Choose based on your needs:

#### Option 1: @solana/web3.js (Legacy Library)

Traditional Solana library with broader ecosystem support.

```bash
npm install @solana/web3.js
```

```typescript
import {
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providerType: "injected",
  addressTypes: [AddressType.solana],
  solanaProvider: "web3js",
});

await sdk.connect();

// Get recent blockhash
const connection = new Connection("https://api.mainnet-beta.solana.com");
const { blockhash } = await connection.getLatestBlockhash();

// Create transfer instruction
const fromAddress = await sdk.solana.getPublicKey();
const transferInstruction = SystemProgram.transfer({
  fromPubkey: new PublicKey(fromAddress),
  toPubkey: new PublicKey(toAddress),
  lamports: 0.001 * LAMPORTS_PER_SOL,
});

// Create VersionedTransaction
const messageV0 = new TransactionMessage({
  payerKey: new PublicKey(fromAddress),
  recentBlockhash: blockhash,
  instructions: [transferInstruction],
}).compileToV0Message();

const transaction = new VersionedTransaction(messageV0);

// Send transaction using chain-specific API
const result = await sdk.solana.signAndSendTransaction(transaction);
console.log("Transaction signature:", result.hash);
```

#### Option 2: @solana/kit (Modern Library)

New high-performance Solana library with better TypeScript support.

```bash
npm install @solana/kit
```

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
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providerType: "injected", 
  addressTypes: [AddressType.solana],
  solanaProvider: "kit",
});

await sdk.connect();

// Create transaction with @solana/kit
const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const userPublicKey = await sdk.solana.getPublicKey();
const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayer(address(userPublicKey), tx),
  tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
);

const transaction = compileTransaction(transactionMessage);

// Send using chain-specific API
const result = await sdk.solana.signAndSendTransaction(transaction);
console.log("Transaction signature:", result.hash);
```

### Ethereum Transactions

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providerType: "injected",
  addressTypes: [AddressType.ethereum],
});

await sdk.connect();

// Simple ETH transfer
const result = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: "1000000000000000000", // 1 ETH in wei
  gas: "21000",
  gasPrice: "20000000000", // 20 gwei
});

// EIP-1559 transaction with maxFeePerGas
const result = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: "1000000000000000000", // 1 ETH in wei
  data: "0x...", // contract call data
  gas: "50000",
  maxFeePerGas: "30000000000", // 30 gwei
  maxPriorityFeePerGas: "2000000000", // 2 gwei
});

console.log("Transaction hash:", result.hash);
```

#### Working with Viem

```typescript
import { parseEther, parseGwei, encodeFunctionData } from "viem";
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providerType: "embedded",
  addressTypes: [AddressType.ethereum],
  // ... config
});

// Simple transfer with viem utilities
const result = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: parseEther("1").toString(), // 1 ETH
  gas: "21000",
  gasPrice: parseGwei("20").toString(), // 20 gwei
});

// Contract interaction
const result = await sdk.ethereum.sendTransaction({
  to: tokenContractAddress,
  data: encodeFunctionData({
    abi: tokenAbi,
    functionName: "transfer",
    args: [recipientAddress, parseEther("100")],
  }),
  gas: "50000",
  maxFeePerGas: parseGwei("30").toString(),
  maxPriorityFeePerGas: parseGwei("2").toString(),
});
```

