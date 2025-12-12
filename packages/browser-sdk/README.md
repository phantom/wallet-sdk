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
  providers: ["injected"], // Only allow browser extension
  addressTypes: [AddressType.solana, AddressType.ethereum],
});

const { addresses } = await sdk.connect({ provider: "injected" });
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

### Embedded Provider (Multiple Auth Methods)

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Create embedded non-custodial wallet with multiple auth providers
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom"], // Allow Google, Apple, and Phantom Login
  addressTypes: [AddressType.solana, AddressType.ethereum],
  appId: "your-app-id", // Get your app ID from phantom.com/portal
});

const { addresses } = await sdk.connect({ provider: "phantom" });
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

// 1. Create SDK instance with allowed providers
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom", "injected"], // Allowed auth providers
  addressTypes: [AddressType.solana, AddressType.ethereum],
  appId: "your-app-id", // Required when using embedded providers
});

// 2. Connect to wallet (provider parameter must be in allowed providers list)
const { addresses } = await sdk.connect({ provider: "google" });
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

The `connect()` method requires a `provider` parameter and automatically switches between providers based on the authentication method you specify:

```typescript
// Connect with injected provider (Phantom extension)
// Automatically switches to injected provider if not already using it
const result = await sdk.connect({
  provider: "injected",
});

// Connect with Google authentication (embedded provider)
// Automatically switches to embedded provider if not already using it
const result = await sdk.connect({
  provider: "google",
});

// Connect with Apple authentication (embedded provider)
// Automatically switches to embedded provider if not already using it
const result = await sdk.connect({
  provider: "apple",
});

// Connect with Phantom authentication (embedded provider)
// Uses Phantom extension or mobile app for authentication
// Automatically switches to embedded provider if not already using it
const result = await sdk.connect({
  provider: "phantom",
});

// Connect with JWT authentication (embedded provider)
const result = await sdk.connect({
  provider: "jwt",
  jwtToken: "your-jwt-token",
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

## Authentication Providers

The SDK supports multiple authentication providers that you configure via the `providers` array:

### Available Providers

- **`"injected"`** - Phantom browser extension
- **`"google"`** - Google OAuth
- **`"apple"`** - Apple ID
- **`"phantom"`** - Phantom Login
- **`"deeplink"`** - Deeplink to Phantom mobile app (only renders on mobile devices)

### Configuration Examples

**Injected Provider Only (Browser Extension)**

```typescript
const sdk = new BrowserSDK({
  providers: ["injected"], // Only allow browser extension
  addressTypes: [AddressType.solana, AddressType.ethereum],
});
```

**Multiple Authentication Methods**

```typescript
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom", "injected", "deeplink"], // Allow all methods
  addressTypes: [AddressType.solana, AddressType.ethereum],
  appId: "your-app-id", // Required for embedded providers (google, apple, phantom, deeplink)
  authOptions: {
    authUrl: "https://connect.phantom.app/login", // optional
    redirectUrl: "https://yourapp.com/callback", // optional, defaults to current page
  },
  autoConnect: true, // optional, auto-connect to existing session (default: true when embedded providers are used)
});
```

**Mobile Deeplink Support**

The `"deeplink"` provider enables a button that opens the Phantom mobile app on mobile devices. This button only appears on mobile devices when the Phantom browser extension is not installed. When clicked, it redirects users to the Phantom mobile app to complete authentication.

```typescript
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom", "deeplink"], // Include deeplink for mobile support
  addressTypes: [AddressType.solana, AddressType.ethereum],
  appId: "your-app-id", // Required for deeplink
  authOptions: {
    authUrl: "https://connect.phantom.app/login",
    redirectUrl: "https://yourapp.com/callback",
  },
});
```

### Embedded Wallet Type

When using embedded providers (google, apple, phantom, etc.), you can specify the wallet type:

#### User Wallet (`'user-wallet'`) - Default

- **Uses Phantom authentication** - user logs in with existing Phantom account
- **Potentially funded** - brings in user's existing wallet balance
- **Connected** to user's Phantom ecosystem
- **Perfect for**: All embedded wallet use cases

```typescript
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom"],
  appId: "your-app-id",
  addressTypes: [AddressType.solana, AddressType.ethereum],
  embeddedWalletType: "user-wallet", // default, can be omitted
});
```

### Available AddressTypes

| AddressType            | Supported Chains                      |
| ---------------------- | ------------------------------------- |
| `AddressType.solana`   | Solana Mainnet, Devnet, Testnet       |
| `AddressType.ethereum` | Ethereum, Polygon, Arbitrum, and more |

### Auto-Connect Feature

The SDK can automatically reconnect to existing sessions when instantiated, providing a seamless user experience.

```typescript
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom"],
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
  autoConnect: true, // Default: true when embedded providers are used, false for injected-only
});

// SDK will automatically check for existing valid session and connect in background
// No need to call connect() if user already has a session

// Check if already connected
if (sdk.isConnected()) {
  console.log("Already connected!");
  const addresses = await sdk.getAddresses();
} else {
  // First time or session expired, need to connect manually
  await sdk.connect({ provider: "google" });
}
```

**Disabling Auto-Connect:**

```typescript
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom"],
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
  autoConnect: false, // Disable auto-connect
});

// Now you must manually call connect() every time
await sdk.connect({ provider: "google" });
```

## API Reference

### Constructor

```typescript
new BrowserSDK(config: BrowserSDKConfig)
```

#### BrowserSDKConfig

```typescript
interface BrowserSDKConfig {
  // List of allowed authentication providers (REQUIRED)
  providers: AuthProviderType[]; // e.g., ["google", "apple", "phantom", "injected", "deeplink"]

  addressTypes?: [AddressType, ...AddressType[]]; // Networks to enable (e.g., [AddressType.solana])

  // Required when using embedded providers (google, apple, phantom)
  appId?: string; // Your app ID from phantom.com/portal

  // Optional configuration
  apiBaseUrl?: string; // Phantom API base URL (optional, has default)
  authOptions?: {
    authUrl?: string; // Custom auth URL (optional, defaults to "https://connect.phantom.app/login")
    redirectUrl?: string; // Custom redirect URL after authentication (optional)
  };
  embeddedWalletType?: "user-wallet"; // Wallet type (optional, defaults to "user-wallet")
  autoConnect?: boolean; // Auto-connect to existing session (default: true when embedded providers used)
}

// Valid provider types
type AuthProviderType = "google" | "apple" | "phantom" | "injected" | "deeplink";
```

### Extension Detection

#### waitForPhantomExtension

Check if the Phantom extension is installed:

```typescript
import { waitForPhantomExtension } from "@phantom/browser-sdk";

const isAvailable = await waitForPhantomExtension(5000);

if (isAvailable) {
  console.log("Phantom extension is available!");
} else {
  console.log("Phantom extension not found");
}
```

#### isPhantomLoginAvailable

Check if Phantom Login is available (requires extension to be installed and support the `phantom_login` feature):

```typescript
import { isPhantomLoginAvailable } from "@phantom/browser-sdk";

const isAvailable = await isPhantomLoginAvailable();

if (isAvailable) {
  console.log("Phantom Login is available!");
  // Can use provider: "phantom" in connect()
} else {
  console.log("Phantom Login is not available");
}
```

### Core Methods

#### connect(options)

Connect to wallet and get addresses for configured AddressTypes.

**Parameters:**

- `options: AuthOptions` (required) - Authentication options
  - `provider: "google" | "apple" | "jwt" | "phantom" | "injected"` (required) - Authentication provider to use
  - `jwtToken?: string` (optional) - JWT token (required when `provider` is "jwt")
  - `customAuthData?: Record<string, any>` (optional) - Custom authentication data

```typescript
// Connect with injected provider
const result = await sdk.connect({ provider: "injected" });

// Connect with Phantom authentication
const result = await sdk.connect({ provider: "phantom" });

// Connect with Google authentication
const result = await sdk.connect({ provider: "google" });

// Returns: { addresses: WalletAddress[], status: "pending" | "completed", provider: "google" | "apple" | "injected" ...  }
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

Switch to a different Ethereum chain. Accepts a chain ID as a number or a hex string value.

```typescript
await sdk.ethereum.switchChain(1); // Ethereum mainnet
await sdk.ethereum.switchChain(137); // Polygon
await sdk.ethereum.switchChain(42161); // Arbitrum One
```

**Supported EVM Networks:**

| Network          | Chain ID   | Usage                   |
| ---------------- | ---------- | ----------------------- |
| Ethereum Mainnet | `1`        | `switchChain(1)`        |
| Ethereum Sepolia | `11155111` | `switchChain(11155111)` |
| Polygon Mainnet  | `137`      | `switchChain(137)`      |
| Polygon Amoy     | `80002`    | `switchChain(80002)`    |
| Base Mainnet     | `8453`     | `switchChain(8453)`     |
| Base Sepolia     | `84532`    | `switchChain(84532)`    |
| Arbitrum One     | `42161`    | `switchChain(42161)`    |
| Arbitrum Sepolia | `421614`   | `switchChain(421614)`   |
| Monad Mainnet    | `143`      | `switchChain(143)`      |
| Monad Testnet    | `10143`    | `switchChain(10143)`    |

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

### Wallet Discovery Methods

The SDK can discover multiple injected wallets using Wallet Standard for Solana and EIP-6963 for Ethereum. This allows users to choose from any installed wallet that supports the configured address types.

#### discoverWallets()

Asynchronously discover all available injected wallets that support the configured address types. This method uses Wallet Standard (`navigator.wallets.getWallets()`) for Solana wallets and EIP-6963 events for Ethereum wallets.

**Returns:** `Promise<InjectedWalletInfo[]>` - Array of discovered wallet information

```typescript
// Discover wallets asynchronously
const wallets = await sdk.discoverWallets();

console.log("Discovered wallets:", wallets);
// Example output:
// [
//   {
//     id: "backpack",
//     name: "Backpack",
//     icon: "https://backpack.app/icon.png",
//     addressTypes: [AddressType.solana],
//     chains: ["solana:mainnet", "solana:devnet"]
//   },
//   {
//     id: "metamask-io",
//     name: "MetaMask",
//     icon: "https://metamask.io/icon.png",
//     addressTypes: [AddressType.ethereum],
//     chains: ["eip155:1", "eip155:5", "eip155:11155111"]
//   }
// ]
```

**Behavior:**

- Automatically filters wallets based on `config.addressTypes`
- If `addressTypes` is undefined or empty, discovers all wallets regardless of chain support
- Registers discovered wallets in the internal registry for later retrieval
- Discovery typically takes ~400ms (EIP-6963 timeout)
- Returns empty array on error (errors are logged but not thrown)

**Note:** Discovery happens automatically when the SDK is instantiated. This method is useful for manually triggering discovery or refreshing the wallet list.

#### getDiscoveredWallets()

Get all currently discovered wallets from the internal registry. This is a synchronous method that returns wallets that have already been discovered.

**Returns:** `InjectedWalletInfo[]` - Array of discovered wallet information

```typescript
// Get already discovered wallets (synchronous)
const wallets = sdk.getDiscoveredWallets();

console.log("Available wallets:", wallets);
// Returns wallets that match the configured addressTypes
// Also includes Phantom if available and matches addressTypes
```

**Behavior:**

- Returns wallets from the internal registry that match `config.addressTypes`
- Includes Phantom wallet if `window.phantom` is available and matches configured address types
- Returns empty array if no wallets are discovered or if an error occurs
- This is a synchronous read operation - it does not trigger new discovery

**Wallet Information Structure:**

```typescript
interface InjectedWalletInfo {
  id: string; // Unique wallet identifier (e.g., "backpack", "metamask-io")
  name: string; // Human-readable wallet name (e.g., "Backpack", "MetaMask")
  icon?: string; // Wallet icon URL (optional)
  addressTypes: AddressType[]; // Supported address types (e.g., [AddressType.solana])
  chains?: string[]; // Supported chains in CAIP-2 format (e.g., ["solana:mainnet"])
}
```

### Event Handlers

The SDK provides typed event handlers that allow you to listen for connection state changes. This is especially useful for `autoConnect()` flows where you need to track the connection result.

#### Available Events

```typescript
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";
import type {
  ConnectEventData,
  ConnectStartEventData,
  ConnectErrorEventData,
  DisconnectEventData,
} from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom"],
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
});

// 1. connect_start - Fired when connection starts
sdk.on("connect_start", (data: ConnectStartEventData) => {
  console.log("Connection starting:", data.source); // "auto-connect" | "manual-connect"
  console.log("Auth options:", data.authOptions?.provider); // "google" | "apple" | etc.
});

// 2. connect - Fired when connection succeeds (includes full ConnectResult)
sdk.on("connect", (data: ConnectEventData) => {
  console.log("Connected successfully!");
  console.log("Provider type:", data.provider); // "google" | "apple" | "injected" ...
  console.log("Wallet ID:", data.walletId); // only for embedded providers
  console.log("Addresses:", data.addresses); // WalletAddress[]
  console.log("Status:", data.status); // "pending" | "completed"
  console.log("Source:", data.source); // "auto-connect" | "manual-connect" | "manual-existing" | "existing-session" | "manual"
});

// 3. connect_error - Fired when connection fails
sdk.on("connect_error", (data: ConnectErrorEventData) => {
  console.error("Connection failed:", data.error);
  console.log("Source:", data.source); // "auto-connect" | "manual-connect"
});

// 4. disconnect - Fired when disconnected
sdk.on("disconnect", (data: DisconnectEventData) => {
  console.log("Disconnected from wallet");
  console.log("Source:", data.source); // "manual"
});

// 5. error - General error handler
sdk.on("error", (error: unknown) => {
  console.error("SDK error:", error);
});

// Don't forget to remove listeners when done
sdk.off("connect", handleConnect);
```

#### Event Types

| Event           | Payload Type            | When Fired            | Key Data                                            |
| --------------- | ----------------------- | --------------------- | --------------------------------------------------- |
| `connect_start` | `ConnectStartEventData` | Connection initiated  | `source`, `authOptions`                             |
| `connect`       | `ConnectEventData`      | Connection successful | `provider`, `addresses`, `status`, `source`, `user` |
| `connect_error` | `ConnectErrorEventData` | Connection failed     | `error`, `source`                                   |
| `disconnect`    | `DisconnectEventData`   | Disconnected          | `source`                                            |
| `error`         | `unknown`               | General SDK errors    | Error details                                       |

#### Using Events with autoConnect()

Event handlers are especially useful with `autoConnect()` since it doesn't return a value:

```typescript
const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom"],
  appId: "your-app-id",
  addressTypes: [AddressType.solana],
  autoConnect: true,
});

// Set up event listeners BEFORE autoConnect
sdk.on("connect", (data: ConnectEventData) => {
  console.log("Auto-connected successfully!");
  console.log("Provider type:", data.provider);
  console.log("Addresses:", data.addresses);

  // Update your UI state here
  updateUIWithAddresses(data.addresses);
});

sdk.on("connect_error", (data: ConnectErrorEventData) => {
  console.log("Auto-connect failed:", data.error);
  // Show connect button to user
  showConnectButton();
});

// Auto-connect will trigger events
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

For a complete list of supported networks including Solana, Ethereum, Polygon, Base, Arbitrum, Monad, and more, see the [Network Support section in the main README](../../README.md#network-support).

```typescript
import { NetworkId } from "@phantom/browser-sdk";

// Example: Use NetworkId for auto-confirm
await sdk.enableAutoConfirm({
  chains: [NetworkId.SOLANA_MAINNET, NetworkId.ETHEREUM_MAINNET],
});
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
import { BrowserSDK, DebugLevel, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providers: ["google", "apple", "phantom"],
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
  providers: ["injected"],
  addressTypes: [AddressType.solana],
});

await sdk.connect({ provider: "injected" });

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
  providers: ["injected"],
  addressTypes: [AddressType.solana],
});

await sdk.connect({ provider: "injected" });

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
  providers: ["injected"],
  addressTypes: [AddressType.ethereum],
});

await sdk.connect({ provider: "injected" });

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
  providers: ["google", "apple", "phantom"],
  appId: "your-app-id",
  addressTypes: [AddressType.ethereum],
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
