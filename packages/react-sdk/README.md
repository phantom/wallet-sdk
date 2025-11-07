# @phantom/react-sdk

React hooks for integrating Phantom wallet functionality into React applications with chain-specific operations.

## Installation

```bash
npm install @phantom/react-sdk
```

## Dependencies

Install additional dependencies based on the networks you want to support:

| Network Support | Required Dependencies              |
| --------------- | ---------------------------------- |
| Solana          | `@solana/web3.js` OR `@solana/kit` |
| Ethereum/EVM    | `viem`                             |

**Example for Solana + Ethereum support (using @solana/web3.js):**

```bash
npm install @phantom/react-sdk @solana/web3.js viem
```

**Example for Solana + Ethereum support (using @solana/kit):**

```bash
npm install @phantom/react-sdk @solana/kit viem
```

## Quick Start

### Basic Setup with Chain-Specific Operations

```tsx
import { PhantomProvider, useConnect, useSolana, useEthereum } from "@phantom/react-sdk";
import { AddressType } from "@phantom/browser-sdk";

function App() {
  return (
    <PhantomProvider
      config={{
        providerType: "injected", // Uses Phantom browser extension
        addressTypes: [AddressType.solana, AddressType.ethereum],
      }}
    >
      <WalletComponent />
    </PhantomProvider>
  );
}

function WalletComponent() {
  const { connect, isConnecting } = useConnect();
  const { solana } = useSolana();
  const { ethereum } = useEthereum();

  const handleConnect = async () => {
    const { addresses } = await connect({ provider: "injected" });
    console.log("Connected addresses:", addresses);
  };

  const signSolanaMessage = async () => {
    const signature = await solana.signMessage("Hello Solana!");
    console.log("Solana signature:", signature);
  };

  const signEthereumMessage = async () => {
    const accounts = await ethereum.getAccounts();
    const signature = await ethereum.signPersonalMessage("Hello Ethereum!", accounts[0]);
    console.log("Ethereum signature:", signature);
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      <button onClick={signSolanaMessage}>Sign Solana Message</button>
      <button onClick={signEthereumMessage}>Sign Ethereum Message</button>
    </div>
  );
}
```

### Embedded Wallet Setup

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { AddressType } from "@phantom/browser-sdk";

function App() {
  return (
    <PhantomProvider
      config={{
        providerType: "embedded",
        appId: "your-app-id", // Get your app ID from phantom.com/portal
        addressTypes: [AddressType.solana, AddressType.ethereum],
      }}
    >
      <YourApp />
    </PhantomProvider>
  );
}
```

## Connection Flow

The React SDK follows a clear connection pattern:

1. **Provider Setup**: Wrap your app with `PhantomProvider`
2. **Connection**: Use `useConnect()` to establish wallet connection
3. **Chain Operations**: Use chain-specific hooks (`useSolana()`, `useEthereum()`) for transactions and signing

```tsx
function WalletExample() {
  const { connect } = useConnect();
  const { solana } = useSolana();
  const { ethereum } = useEthereum();

  // 1. Connect first (provider parameter is required)
  const handleConnect = async () => {
    await connect({ provider: "injected" });
  };

  // 2. Then use chain-specific operations
  const sendSolanaTransaction = async () => {
    const result = await solana.signAndSendTransaction(transaction);
  };

  const sendEthereumTransaction = async () => {
    const result = await ethereum.sendTransaction(transaction);
  };
}
```

### Connection Options

The `connect()` method requires a `provider` parameter and automatically switches between providers based on the authentication method you specify:

```tsx
const { connect } = useConnect();

// Connect with injected provider (Phantom extension)
// Automatically switches to injected provider if not already using it
await connect({
  provider: "injected",
});

// Connect with Google authentication (embedded provider)
// Automatically switches to embedded provider if not already using it
await connect({
  provider: "google",
});

// Connect with Apple authentication (embedded provider)
// Automatically switches to embedded provider if not already using it
await connect({
  provider: "apple",
});

// Connect with Phantom authentication (embedded provider)
// Uses Phantom extension or mobile app for authentication
// Automatically switches to embedded provider if not already using it
await connect({
  provider: "phantom",
});

// Connect with JWT authentication (embedded provider)
await connect({
  provider: "jwt",
  jwtToken: "your-jwt-token",
});
```

## Provider Types

### Injected Provider

Uses the Phantom browser extension installed by the user.

```tsx
<PhantomProvider
  config={{
    providerType: "injected",
    addressTypes: [AddressType.solana, AddressType.ethereum],
  }}
>
  <YourApp />
</PhantomProvider>
```

### Embedded Provider

Creates non-custodial wallets embedded in your application.

#### User Wallet

- **Uses Phantom authentication** - user logs in with existing account
- **Potentially funded** - brings existing wallet balance
- **Connected** to user's Phantom ecosystem

```tsx
<PhantomProvider
  config={{
    providerType: "embedded",
    appId: "your-app-id",
    addressTypes: [AddressType.solana, AddressType.ethereum],
  }}
>
  <YourApp />
</PhantomProvider>
```


## Available Hooks

### Core Connection Hooks

#### useConnect

Connect to wallet:

```tsx
import { useConnect } from "@phantom/react-sdk";

function ConnectButton() {
  const { connect, isConnecting, error } = useConnect();

  const handleConnect = async () => {
    try {
      const { addresses } = await connect({ provider: "injected" });
      console.log("Connected addresses:", addresses);
    } catch (err) {
      console.error("Failed to connect:", err);
    }
  };

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

#### useAccounts

Get connected wallet addresses:

```tsx
import { useAccounts } from "@phantom/react-sdk";

function WalletAddresses() {
  const addresses = useAccounts();

  if (!addresses) {
    return <div>Not connected</div>;
  }

  return (
    <div>
      {addresses.map((addr, index) => (
        <div key={index}>
          <strong>{addr.addressType}:</strong> {addr.address}
        </div>
      ))}
    </div>
  );
}
```

#### useDisconnect

Disconnect from wallet:

```tsx
import { useDisconnect } from "@phantom/react-sdk";

function DisconnectButton() {
  const { disconnect, isDisconnecting } = useDisconnect();

  return (
    <button onClick={disconnect} disabled={isDisconnecting}>
      {isDisconnecting ? "Disconnecting..." : "Disconnect"}
    </button>
  );
}
```

#### useIsExtensionInstalled

Check if the Phantom browser extension is installed (for injected provider):

```tsx
import { useIsExtensionInstalled } from "@phantom/react-sdk";

function ExtensionStatus() {
  const { isLoading, isInstalled } = useIsExtensionInstalled();

  if (isLoading) {
    return <div>Checking for Phantom extension...</div>;
  }

  return (
    <div>
      {isInstalled ? (
        <p>✅ Phantom extension is installed!</p>
      ) : (
        <p>
          ❌ Phantom extension not found.{" "}
          <a href="https://phantom.app/download" target="_blank">
            Install here
          </a>
        </p>
      )}
    </div>
  );
}
```

#### useIsPhantomLoginAvailable

Check if Phantom Login is available (requires extension installed and `phantom_login` feature support):

```tsx
import { useIsPhantomLoginAvailable } from "@phantom/react-sdk";

function PhantomLoginButton() {
  const { isLoading, isAvailable } = useIsPhantomLoginAvailable();
  const { connect } = useConnect();

  if (isLoading) {
    return <div>Checking Phantom Login availability...</div>;
  }

  if (!isAvailable) {
    return null; // Don't show button if Phantom Login is not available
  }

  return (
    <button onClick={() => connect({ provider: "phantom" })}>
      Login with Phantom
    </button>
  );
}
```

### Chain-Specific Hooks

#### useSolana

Hook for Solana chain operations:

```tsx
import { useSolana } from "@phantom/react-sdk";
import { VersionedTransaction, TransactionMessage, SystemProgram, PublicKey, Connection } from "@solana/web3.js";

function SolanaOperations() {
  const { solana } = useSolana();

  const signMessage = async () => {
    const signature = await solana.signMessage("Hello Solana!");
    console.log("Signature:", signature);
  };

  const signAndSendTransaction = async () => {
    // Create transaction
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();

    const fromAddress = await solana.getPublicKey();
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(toAddress),
      lamports: 1000000, // 0.001 SOL
    });

    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(fromAddress),
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Sign and send
    const result = await solana.signAndSendTransaction(transaction);
    console.log("Transaction sent:", result.signature);
  };

  const switchNetwork = async () => {
    await solana.switchNetwork("devnet");
  };

  return (
    <div>
      <button onClick={signMessage}>Sign Message</button>
      <button onClick={signAndSendTransaction}>Send Transaction</button>
      <button onClick={switchNetwork}>Switch to Devnet</button>
      <p>Connected: {solana.isConnected ? "Yes" : "No"}</p>
    </div>
  );
}
```

**Available methods:**

- `signMessage(message)` - Sign a message
- `signTransaction(transaction)` - Sign without sending
- `signAndSendTransaction(transaction)` - Sign and send
- `switchNetwork(network)` - Switch between mainnet/devnet
- `getPublicKey()` - Get current public key
- `isConnected` - Connection status
- `isAvailable` - Provider availability

#### useEthereum

Hook for Ethereum chain operations:

```tsx
import { useEthereum } from "@phantom/react-sdk";

function EthereumOperations() {
  const { ethereum } = useEthereum();

  const signPersonalMessage = async () => {
    const accounts = await ethereum.getAccounts();
    const signature = await ethereum.signPersonalMessage("Hello Ethereum!", accounts[0]);
    console.log("Signature:", signature);
  };

  const signTypedData = async () => {
    const accounts = await ethereum.getAccounts();
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

    const signature = await ethereum.signTypedData(typedData);
    console.log("Typed data signature:", signature);
  };

  const signTransaction = async () => {
    const signedTx = await ethereum.signTransaction({
      to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      value: "1000000000000000000", // 1 ETH in wei
      gas: "21000",
    });
    console.log("Transaction signed:", signedTx);
    // Transaction is signed but not sent - you can broadcast it later
  };

  const sendTransaction = async () => {
    const result = await ethereum.sendTransaction({
      to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      value: "1000000000000000000", // 1 ETH in wei
      gas: "21000",
    });
    console.log("Transaction sent:", result.hash);
  };

  const switchChain = async () => {
    await ethereum.switchChain(137); // Switch to Polygon
  };

  return (
    <div>
      <button onClick={signPersonalMessage}>Sign Personal Message</button>
      <button onClick={signTypedData}>Sign Typed Data</button>
      <button onClick={signTransaction}>Sign Transaction</button>
      <button onClick={sendTransaction}>Sign & Send Transaction</button>
      <button onClick={switchChain}>Switch to Polygon</button>
      <p>Connected: {ethereum.isConnected ? "Yes" : "No"}</p>
    </div>
  );
}
```

**Available methods:**

- `request(args)` - EIP-1193 requests
- `signPersonalMessage(message, address)` - Sign personal message
- `signTypedData(typedData)` - Sign EIP-712 typed data
- `signTransaction(transaction)` - Sign transaction without sending
- `sendTransaction(transaction)` - Sign and send transaction
- `switchChain(chainId)` - Switch chains (accepts chain ID as number or a hex string)
- `getChainId()` - Get current chain ID
- `getAccounts()` - Get connected accounts
- `isConnected` - Connection status
- `isAvailable` - Provider availability

**Supported EVM Networks:**

| Network | Chain ID | Usage |
|---------|----------|-------|
| Ethereum Mainnet | `1` | `ethereum.switchChain(1)` |
| Ethereum Sepolia | `11155111` | `ethereum.switchChain(11155111)` |
| Polygon Mainnet | `137` | `ethereum.switchChain(137)` |
| Polygon Amoy | `80002` | `ethereum.switchChain(80002)` |
| Base Mainnet | `8453` | `ethereum.switchChain(8453)` |
| Base Sepolia | `84532` | `ethereum.switchChain(84532)` |
| Arbitrum One | `42161` | `ethereum.switchChain(42161)` |
| Arbitrum Sepolia | `421614` | `ethereum.switchChain(421614)` |
| Monad Mainnet | `143` | `ethereum.switchChain(143)` |
| Monad Testnet | `10143` | `ethereum.switchChain(10143)` |

### Auto-Confirm Hook (Injected Provider Only)

#### useAutoConfirm

Hook for managing auto-confirm functionality with the Phantom extension. Auto-confirm allows transactions to be automatically approved without user interaction for enabled chains.

> **Note**: This hook only works with the `injected` provider type (Phantom browser extension). It will throw errors for embedded providers.

```tsx
import { useAutoConfirm, NetworkId } from "@phantom/react-sdk";

function AutoConfirmControls() {
  const { enable, disable, status, supportedChains, isLoading, error, refetch } = useAutoConfirm();

  const handleEnable = async () => {
    try {
      // Enable auto-confirm for specific chains
      const result = await enable({
        chains: [NetworkId.SOLANA_DEVNET, NetworkId.ETHEREUM_MAINNET],
      });
      console.log("Auto-confirm enabled:", result);
    } catch (err) {
      console.error("Failed to enable auto-confirm:", err);
    }
  };

  const handleDisable = async () => {
    try {
      await disable();
      console.log("Auto-confirm disabled");
    } catch (err) {
      console.error("Failed to disable auto-confirm:", err);
    }
  };

  if (isLoading) {
    return <div>Loading auto-confirm settings...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h3>Auto-Confirm Settings</h3>

      <div>
        <strong>Status:</strong> {status?.enabled ? "Enabled" : "Disabled"}
        {status?.chains && (
          <div>
            <strong>Active Chains:</strong>
            <ul>
              {status.chains.map(chain => (
                <li key={chain}>{chain}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <strong>Supported Chains:</strong>
        {supportedChains?.chains && (
          <ul>
            {supportedChains.chains.map(chain => (
              <li key={chain}>{chain}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button onClick={handleEnable} disabled={isLoading}>
          Enable Auto-Confirm
        </button>
        <button onClick={handleDisable} disabled={isLoading}>
          Disable Auto-Confirm
        </button>
        <button onClick={refetch} disabled={isLoading}>
          Refresh Status
        </button>
      </div>
    </div>
  );
}
```

**Hook Interface:**

```typescript
interface UseAutoConfirmResult {
  enable: (params: AutoConfirmEnableParams) => Promise<AutoConfirmResult>;
  disable: () => Promise<void>;
  status: AutoConfirmResult | null;
  supportedChains: AutoConfirmSupportedChainsResult | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface AutoConfirmEnableParams {
  chains?: NetworkId[]; // Optional array of chains to enable
}

interface AutoConfirmResult {
  enabled: boolean;
  chains: NetworkId[];
}

interface AutoConfirmSupportedChainsResult {
  chains: NetworkId[];
}
```

**Available Methods:**

- `enable(params)` - Enable auto-confirm for specific chains
- `disable()` - Disable auto-confirm completely
- `refetch()` - Refresh status and supported chains from extension
- `status` - Current auto-confirm status (enabled/disabled and active chains)
- `supportedChains` - List of chains that support auto-confirm
- `isLoading` - Loading state for operations
- `error` - Any errors from auto-confirm operations

**Usage Notes:**

- Auto-confirm automatically fetches status and supported chains when the hook initializes
- Only works with injected provider (Phantom extension)
- Throws errors for embedded providers
- Status is automatically updated after enable/disable operations
- Use `refetch()` to manually refresh data from the extension

## Transaction Examples

### Solana with @solana/web3.js

```tsx
import { VersionedTransaction, TransactionMessage, SystemProgram, PublicKey, Connection } from "@solana/web3.js";
import { useSolana } from "@phantom/react-sdk";

function SolanaExample() {
  const { solana } = useSolana();

  const sendTransaction = async () => {
    // Get recent blockhash
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transfer instruction
    const fromAddress = await solana.getPublicKey();
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(toAddress),
      lamports: 1000000, // 0.001 SOL
    });

    // Create VersionedTransaction
    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(fromAddress),
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Sign and send using chain-specific hook
    const result = await solana.signAndSendTransaction(transaction);
    console.log("Transaction sent:", result.signature);
  };

  return <button onClick={sendTransaction}>Send SOL</button>;
}
```

### Solana with @solana/kit

```tsx
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";
import { useSolana } from "@phantom/react-sdk";

function SolanaKitExample() {
  const { solana } = useSolana();

  const sendTransaction = async () => {
    const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const userPublicKey = await solana.getPublicKey();
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(address(userPublicKey), tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );

    const transaction = compileTransaction(transactionMessage);

    // Sign and send using chain-specific hook
    const result = await solana.signAndSendTransaction(transaction);
    console.log("Transaction sent:", result.signature);
  };

  return <button onClick={sendTransaction}>Send SOL</button>;
}
```

### Ethereum with Viem

```tsx
import { parseEther, parseGwei, encodeFunctionData } from "viem";
import { useEthereum } from "@phantom/react-sdk";

function EthereumExample() {
  const { ethereum } = useEthereum();

  const sendEth = async () => {
    const result = await ethereum.sendTransaction({
      to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
      value: parseEther("1").toString(), // 1 ETH
      gas: "21000",
      gasPrice: parseGwei("20").toString(), // 20 gwei
    });
    console.log("ETH sent:", result.hash);
  };

  const sendToken = async () => {
    const result = await ethereum.sendTransaction({
      to: tokenContractAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress, parseEther("100")],
      }),
      gas: "50000",
      maxFeePerGas: parseGwei("30").toString(),
      maxPriorityFeePerGas: parseGwei("2").toString(),
    });
    console.log("Token sent:", result.hash);
  };

  return (
    <div>
      <button onClick={sendEth}>Send ETH</button>
      <button onClick={sendToken}>Send Token</button>
    </div>
  );
}
```

## Hooks Reference

Quick reference of all available hooks:

| Hook                          | Purpose                                 | Returns                                             |
| ----------------------------- | --------------------------------------- | --------------------------------------------------- |
| `useConnect`                  | Connect to wallet                       | `{ connect, isConnecting, error }`                  |
| `useAccounts`                 | Get wallet addresses                    | `WalletAddress[]` or `null`                         |
| `useIsExtensionInstalled`     | Check extension status                  | `{ isLoading, isInstalled }`                        |
| `useIsPhantomLoginAvailable`  | Check Phantom Login availability        | `{ isLoading, isAvailable }`                        |
| `useDisconnect`               | Disconnect from wallet                  | `{ disconnect, isDisconnecting }`                   |
| `useAutoConfirm`              | Auto-confirm management (injected only) | `{ enable, disable, status, supportedChains, ... }` |
| `useSolana`                   | Solana chain operations                 | `{ signMessage, signAndSendTransaction, ... }`      |
| `useEthereum`                 | Ethereum chain operations               | `{ signPersonalMessage, sendTransaction, ... }`     |
| `usePhantom`                  | Get provider context                    | `{ isConnected, isReady }`                          |

## Configuration Reference

```typescript
interface PhantomSDKConfig {
  providerType: "injected" | "embedded";
  addressTypes?: [AddressType, ...AddressType[]]; // Networks to enable (e.g., [AddressType.solana])

  // Required for embedded provider only
  appId: string; // Your app ID from phantom.com/portal (required for embedded provider)
  
  // Optional configuration
  apiBaseUrl?: string; // Phantom API base URL (optional, has default)
  authOptions?: {
    authUrl?: string; // Custom auth URL (optional, defaults to "https://connect.phantom.app/login")
    redirectUrl?: string; // Custom redirect URL after authentication (optional)
  };
  embeddedWalletType?: "user-wallet"; // Wallet type (optional, defaults to "user-wallet", currently the only supported type)
  autoConnect?: boolean; // Auto-connect to existing session on SDK instantiation (optional, defaults to true for embedded, false for injected)
}
```

## Debug Configuration

The React SDK supports separate debug configuration that can be changed without reinstantiating the underlying SDK, providing better performance.

### PhantomDebugConfig Interface

```typescript
interface PhantomDebugConfig {
  enabled?: boolean; // Enable debug logging
  level?: DebugLevel; // Debug level (ERROR, WARN, INFO, DEBUG)
  callback?: DebugCallback; // Custom debug message handler
}
```

### Using Debug Configuration

Pass the `debugConfig` as a separate prop to `PhantomProvider`:

```typescript
import { PhantomProvider, type PhantomSDKConfig, type PhantomDebugConfig, DebugLevel } from "@phantom/react-sdk";

function App() {
  const [debugLevel, setDebugLevel] = useState(DebugLevel.INFO);
  const [debugMessages, setDebugMessages] = useState([]);

  // SDK configuration - static, won't change when debug settings change
  const config: PhantomSDKConfig = {
    providerType: "embedded",
    appId: "your-app-id",
    // ... other config
  };

  // Debug configuration - separate to avoid SDK reinstantiation
  const debugConfig: PhantomDebugConfig = {
    enabled: true,
    level: debugLevel,
    callback: (message) => {
      setDebugMessages(prev => [...prev, message]);
    }
  };

  return (
    <PhantomProvider config={config} debugConfig={debugConfig}>
      {/* Your app components */}
    </PhantomProvider>
  );
}
```

### Debug Message Structure

Debug callbacks receive a `DebugMessage` object:

```typescript
interface DebugMessage {
  timestamp: number; // Unix timestamp
  level: DebugLevel; // Message level
  category: string; // Component category
  message: string; // Debug message text
  data?: any; // Additional debug data (optional)
}
```

For more details and examples, see the [@phantom/browser-sdk documentation](../browser-sdk/README.md).
