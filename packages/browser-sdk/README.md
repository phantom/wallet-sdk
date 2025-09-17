# @phantom/browser-sdk

Browser SDK for Phantom Wallet supporting both injected and embedded non-custodial wallets with chain-specific APIs.

## Quick Start

```bash
npm install @phantom/browser-sdk
```

### Unified Configuration with Smart Auto-Connect

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Unified configuration - no need to choose provider type upfront
const sdk = new BrowserSDK({
  appId: "your-app-id", // Get your app ID from phantom.com/portal
  addressTypes: [AddressType.solana, AddressType.ethereum],
});

// Smart auto-connect automatically chooses the best provider
await sdk.autoConnect();

// If not auto-connected, connect manually
if (!sdk.isConnected()) {
  const { addresses } = await sdk.connect();
  console.log("Connected addresses:", addresses);
}

// Chain-specific operations work the same regardless of provider
const message = "Hello from Phantom!";
const solanaSignature = await sdk.solana.signMessage(message);

// Encode the message as hex for EVM
const encoded = "0x" + Buffer.from(message, "utf8").toString("hex");
const ethSignature = await sdk.ethereum.signPersonalMessage(encoded, addresses[1].address);

// Sign and send transactions
const solanaResult = await sdk.solana.signAndSendTransaction(mySolanaTransaction);
const ethResult = await sdk.ethereum.sendTransaction(myEthTransaction);
```

### Manual Provider Selection

You can still specify which provider to use if needed:

```typescript
// Connect with injected provider (browser extension)
const { addresses } = await sdk.connect({ providerType: "injected" });

// Connect with embedded provider 
const { addresses } = await sdk.connect({ providerType: "embedded" });

// Switch between providers after initialization
await sdk.switchProvider("injected");
await sdk.switchProvider("embedded");
```

## Features

- **🔒 Non-Custodial**: Full user control of private keys for both injected and embedded wallets
- **🧠 Smart Auto-Connect**: Automatically determines the best provider using intelligent heuristics
- **🌐 Dynamic Provider Switching**: Switch between Phantom extension and embedded wallets at runtime
- **⛓️ Chain-Specific APIs**: Dedicated interfaces for Solana and Ethereum operations
- **🛠️ Native Transactions**: Work with blockchain-native objects, not base64url strings
- **🔗 Multi-Chain**: Solana and Ethereum support with dedicated methods
- **⚡ TypeScript**: Full type safety for all transaction formats
- **🎯 Unified Configuration**: Single configuration works for all provider types

## Connection Flow

The SDK provides multiple ways to establish connections:

### Recommended: Smart Auto-Connect

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// 1. Create SDK instance with unified configuration
const sdk = new BrowserSDK({
  appId: "your-app-id", // Get your app ID from phantom.com/portal
  addressTypes: [AddressType.solana, AddressType.ethereum],
});

// 2. Smart auto-connect (chooses best available provider)
await sdk.autoConnect();

// 3. Check if connected, connect manually if needed
if (!sdk.isConnected()) {
  const { addresses } = await sdk.connect();
  console.log("Connected addresses:", addresses);
}

// 4. Use chain-specific methods
const signature = await sdk.solana.signMessage("Hello!");
const ethResult = await sdk.ethereum.sendTransaction({
  to: "0x...",
  value: "1000000000000000000",
  gas: "21000",
});
```

### Manual Provider Selection

```typescript
// Connect with specific provider
const { addresses } = await sdk.connect({ providerType: "injected" });

// Or switch providers dynamically
await sdk.switchProvider("embedded");
const { addresses } = await sdk.connect();
```

### Connection Options

You can specify provider type and authentication options during connection:

```typescript
// Default: Use smart auto-connect heuristics
const result = await sdk.connect();

// Force specific provider
const result = await sdk.connect({ providerType: "injected" });
const result = await sdk.connect({ providerType: "embedded" });

// Embedded authentication options
const result = await sdk.connect({
  providerType: "embedded",
  provider: "google", // Skip provider selection screen
});

const result = await sdk.connect({
  providerType: "embedded", 
  provider: "apple",
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
await sdk.solana.switchNetwork("devnet");

// Utilities
const publicKey = await sdk.solana.getPublicKey();
const isConnected = sdk.solana.isConnected();
```

### Ethereum Chain (`sdk.ethereum`)

```typescript
// EIP-1193 requests
const accounts = await sdk.ethereum.request({ method: "eth_accounts" });
const chainId = await sdk.ethereum.request({ method: "eth_chainId" });

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

The SDK automatically manages provider selection, but you can still understand and control which provider is used:

### Smart Provider Selection

The SDK uses intelligent heuristics to determine the best provider:

1. **Session Recovery**: Checks if an embedded wallet session can be recovered
2. **Extension Detection**: Looks for installed Phantom browser extension
3. **Fallback**: Prompts user for manual selection

```typescript
const sdk = new BrowserSDK({
  appId: "your-app-id", // Required for embedded wallets
  addressTypes: [AddressType.solana, AddressType.ethereum],
});

// Smart auto-connect chooses automatically
await sdk.autoConnect();
```

### Manual Provider Control

```typescript
// Force specific provider during connection
await sdk.connect({ providerType: "injected" }); // Use browser extension
await sdk.connect({ providerType: "embedded" }); // Use embedded wallet

// Switch providers at runtime
await sdk.switchProvider("injected");
await sdk.switchProvider("embedded");

// Check current provider
const providerInfo = sdk.getCurrentProviderInfo();
console.log("Current provider:", providerInfo?.type); // "injected" or "embedded"
```

### Embedded Wallet Configuration

The SDK supports user wallets that integrate with the Phantom ecosystem:

#### User Wallet (`'user-wallet'`)

- **Uses Phantom authentication** - user logs in with existing Phantom account  
- **Potentially funded** - brings in user's existing wallet balance
- **Connected** to user's Phantom ecosystem
- **Perfect for**: All embedded wallet use cases

```typescript
const sdk = new BrowserSDK({
  appId: "your-app-id",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  embeddedWalletType: "user-wallet", // Default, can be omitted
});
```

### Available AddressTypes

| AddressType            | Supported Chains                      |
| ---------------------- | ------------------------------------- |
| `AddressType.solana`   | Solana Mainnet, Devnet, Testnet       |
| `AddressType.ethereum` | Ethereum, Polygon, Arbitrum, and more |


### Smart Auto-Connect Feature

The SDK provides intelligent auto-connect that determines the best provider and automatically connects when possible.

```typescript
const sdk = new BrowserSDK({
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
});

// Smart auto-connect with heuristics
await sdk.autoConnect();

// Check if auto-connect was successful
if (sdk.isConnected()) {
  console.log("Auto-connected successfully!");
  console.log("Using provider:", sdk.getCurrentProviderInfo()?.type);
  const addresses = sdk.getAddresses();
} else {
  // Auto-connect failed, manual connection needed
  const { addresses } = await sdk.connect();
}
```

**Auto-Connect Heuristics:**

1. **Session Recovery Priority**: If an embedded wallet has a recoverable session, use embedded provider
2. **Extension Fallback**: If no session but Phantom extension is installed, use injected provider  
3. **Manual Selection**: If neither condition is met, prompt user for provider selection

```typescript
// You can also check what auto-connect would do without connecting
const isExtensionAvailable = await BrowserSDK.isPhantomInstalled();
console.log("Extension available:", isExtensionAvailable);
```

## API Reference

### Constructor

```typescript
new BrowserSDK(config: BrowserSDKConfig)
```

#### BrowserSDKConfig

```typescript
interface BrowserSDKConfig {
  // Required configuration
  appId: string; // Your app ID from phantom.com/portal
  addressTypes: [AddressType, ...AddressType[]]; // Networks to enable (e.g., [AddressType.solana])
  
  // Optional configuration
  apiBaseUrl?: string; // Phantom API base URL (optional, has default)
  authOptions?: {
    authUrl?: string; // Custom auth URL (optional, defaults to "https://connect.phantom.app/login")
    redirectUrl?: string; // Custom redirect URL after authentication (optional)
  };
  embeddedWalletType?: "user-wallet"; // Wallet type (optional, defaults to "user-wallet")
}
```

### Extension Detection

You can check if the Phantom extension is installed for smart provider selection:

```typescript
// Static method on BrowserSDK
const isAvailable = await BrowserSDK.isPhantomInstalled(5000); // 5 second timeout

if (isAvailable) {
  console.log("Phantom extension is available!");
} else {
  console.log("Phantom extension not found");
}

// Using the utility function directly
import { waitForPhantomExtension } from "@phantom/browser-sdk";
const isAvailable = await waitForPhantomExtension(5000);
```

### Core Methods

#### autoConnect()

Smart auto-connect that determines the best provider and connects automatically.

```typescript
await sdk.autoConnect();
// Uses intelligent heuristics to choose and connect to the best available provider
// Fails silently if no suitable provider is found
```

#### connect(options?)

Connect to wallet with optional provider selection and authentication options.

```typescript
// Smart connection (uses heuristics)
const result = await sdk.connect();

// Force specific provider
const result = await sdk.connect({ providerType: "injected" });
const result = await sdk.connect({ providerType: "embedded" });

// With authentication options for embedded provider
const result = await sdk.connect({ 
  providerType: "embedded",
  provider: "google" 
});

// Returns: { walletId?: string, addresses: WalletAddress[] }
```

#### switchProvider(type, options?)

Switch to a different provider type at runtime.

```typescript
// Switch to injected provider (browser extension)
await sdk.switchProvider("injected");

// Switch to embedded provider with options
await sdk.switchProvider("embedded", { 
  embeddedWalletType: "user-wallet" 
});
```

#### getCurrentProviderInfo()

Get information about the currently active provider.

```typescript
const info = sdk.getCurrentProviderInfo();
console.log("Provider type:", info?.type); // "injected" | "embedded" | null
console.log("Embedded wallet type:", info?.embeddedWalletType); // "user-wallet" | undefined
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
await sdk.solana.switchNetwork("mainnet");
await sdk.solana.switchNetwork("devnet");
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
const accounts = await sdk.ethereum.request({ method: "eth_accounts" });
const chainId = await sdk.ethereum.request({ method: "eth_chainId" });
const balance = await sdk.ethereum.request({
  method: "eth_getBalance",
  params: [address, "latest"],
});

// Sign transaction via RPC (alternative to signTransaction method)
const signedTx = await sdk.ethereum.request({
  method: "eth_signTransaction",
  params: [{ to: "0x...", value: "0x...", gas: "0x..." }],
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
      { name: "verifyingContract", type: "address" },
    ],
    Mail: [
      { name: "from", type: "string" },
      { name: "to", type: "string" },
      { name: "contents", type: "string" },
    ],
  },
  primaryType: "Mail",
  domain: {
    name: "Ether Mail",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  },
  message: {
    from: "Alice",
    to: "Bob",
    contents: "Hello!",
  },
};

const signature = await sdk.ethereum.signTypedData(typedData, address);
// Returns: { signature: string, rawSignature: string }
```

#### signTransaction(transaction)

Sign an Ethereum transaction without sending it.

```typescript
const signedTx = await sdk.ethereum.signTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: "1000000000000000000", // 1 ETH in wei
  gas: "21000",
  gasPrice: "20000000000", // 20 gwei
});
// Returns: string (hex-encoded signed transaction)
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
await sdk.ethereum.switchChain(1); // Ethereum mainnet
await sdk.ethereum.switchChain(137); // Polygon
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

#### autoConnect()

Attempt auto-connection using existing session. Should be called after setting up event listeners to avoid race conditions. Only works with embedded providers.

```typescript
await sdk.autoConnect();
```

### Auto-Confirm Methods (Injected Provider Only)

The SDK provides auto-confirm functionality that allows automatic transaction confirmation for specified chains. This feature is only available when using the injected provider (Phantom browser extension).

#### enableAutoConfirm(params?)

Enable auto-confirm for specific chains or all supported chains.

```typescript
import { NetworkId } from "@phantom/browser-sdk";

// Enable auto-confirm for specific chains
const result = await sdk.enableAutoConfirm({
  chains: [NetworkId.SOLANA_MAINNET, NetworkId.ETHEREUM_MAINNET],
});

// Enable auto-confirm for all supported chains
const result = await sdk.enableAutoConfirm();

console.log("Auto-confirm enabled:", result.enabled);
console.log("Enabled chains:", result.chains);
// Returns: { enabled: boolean, chains: NetworkId[] }
```

#### disableAutoConfirm()

Disable auto-confirm for all chains.

```typescript
const result = await sdk.disableAutoConfirm();
console.log("Auto-confirm disabled:", !result.enabled);
// Returns: { enabled: boolean, chains: NetworkId[] }
```

#### getAutoConfirmStatus()

Get the current auto-confirm status and enabled chains.

```typescript
const status = await sdk.getAutoConfirmStatus();
console.log("Auto-confirm enabled:", status.enabled);
console.log("Enabled chains:", status.chains);
// Returns: { enabled: boolean, chains: NetworkId[] }
```

#### getSupportedAutoConfirmChains()

Get the list of chains that support auto-confirm functionality.

```typescript
const supportedChains = await sdk.getSupportedAutoConfirmChains();
console.log("Supported chains:", supportedChains.chains);
// Returns: { chains: NetworkId[] }
```

#### Available NetworkId Values

```typescript
import { NetworkId } from "@phantom/browser-sdk";

// Solana networks
NetworkId.SOLANA_MAINNET; // "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
NetworkId.SOLANA_DEVNET; // "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
NetworkId.SOLANA_TESTNET; // "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z"

// Ethereum networks
NetworkId.ETHEREUM_MAINNET; // "eip155:1"
NetworkId.ETHEREUM_SEPOLIA; // "eip155:11155111"

// Polygon networks
NetworkId.POLYGON_MAINNET; // "eip155:137"
NetworkId.POLYGON_AMOY; // "eip155:80002"

// Arbitrum networks
NetworkId.ARBITRUM_ONE; // "eip155:42161"
NetworkId.ARBITRUM_SEPOLIA; // "eip155:421614"

// Optimism networks
NetworkId.OPTIMISM_MAINNET; // "eip155:10"
NetworkId.OPTIMISM_GOERLI; // "eip155:420"

// Base networks
NetworkId.BASE_MAINNET; // "eip155:8453"
NetworkId.BASE_SEPOLIA; // "eip155:84532"
```

**Important Notes:**

- Auto-confirm methods are **only available for injected providers** (Phantom browser extension)
- Calling these methods on embedded providers will throw an error
- Auto-confirm applies to transaction confirmations, not initial connection prompts
- Users can override auto-confirm settings directly in the Phantom extension UI

## Debug Configuration

The BrowserSDK provides dynamic debug configuration that can be changed at runtime without reinstantiating the SDK. This provides better performance and cleaner architecture.

### Debug Methods

```typescript
// Enable debug logging
sdk.enableDebug();

// Disable debug logging
sdk.disableDebug();

// Set debug level
sdk.setDebugLevel(DebugLevel.INFO);

// Set debug callback function
sdk.setDebugCallback(message => {
  console.log(`[${message.category}] ${message.message}`, message.data);
});

// Configure all debug settings at once
sdk.configureDebug({
  enabled: true,
  level: DebugLevel.DEBUG,
  callback: message => {
    // Handle debug messages
    console.log(`[${message.level}] ${message.category}: ${message.message}`);
  },
});
```

### Debug Levels

```typescript
import { DebugLevel } from "@phantom/browser-sdk";

// Available debug levels (in order of verbosity)
DebugLevel.ERROR; // 0 - Only error messages
DebugLevel.WARN; // 1 - Warning and error messages
DebugLevel.INFO; // 2 - Info, warning, and error messages
DebugLevel.DEBUG; // 3 - All debug messages (most verbose)
```

### Debug Message Structure

Debug callbacks receive a `DebugMessage` object:

```typescript
interface DebugMessage {
  timestamp: number; // Unix timestamp
  level: DebugLevel; // Message level
  category: string; // Component category (e.g., "BrowserSDK", "ProviderManager")
  message: string; // Debug message text
  data?: any; // Additional debug data (optional)
}
```

### Example: Debug Console Implementation

```typescript
import { BrowserSDK, DebugLevel } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
});

// Store debug messages
const debugMessages: DebugMessage[] = [];

// Set up debug system
sdk.configureDebug({
  enabled: true,
  level: DebugLevel.INFO,
  callback: message => {
    debugMessages.push(message);

    // Keep only last 100 messages
    if (debugMessages.length > 100) {
      debugMessages.shift();
    }

    // Update UI
    updateDebugConsole();
  },
});

// Dynamic debug level changing
function changeDebugLevel(newLevel: DebugLevel) {
  sdk.setDebugLevel(newLevel);
  console.log(`Debug level changed to: ${DebugLevel[newLevel]}`);
}

// Toggle debug on/off
function toggleDebug(enabled: boolean) {
  if (enabled) {
    sdk.enableDebug();
  } else {
    sdk.disableDebug();
  }
}
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
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
});

// Smart auto-connect or manual connection
await sdk.autoConnect();
if (!sdk.isConnected()) {
  await sdk.connect();
}

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
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
});

// Smart auto-connect or manual connection
await sdk.autoConnect();
if (!sdk.isConnected()) {
  await sdk.connect();
}

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
  appId: "your-app-id",
  addressTypes: [AddressType.ethereum],
});

// Smart auto-connect or manual connection
await sdk.autoConnect();
if (!sdk.isConnected()) {
  await sdk.connect();
}

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
  appId: "your-app-id",
  addressTypes: [AddressType.ethereum],
});

// Smart auto-connect or manual connection
await sdk.autoConnect();
if (!sdk.isConnected()) {
  await sdk.connect();
}

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
