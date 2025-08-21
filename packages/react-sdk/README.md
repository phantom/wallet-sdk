# @phantom/react-sdk

React hooks for integrating Phantom wallet functionality into React applications with native transaction support.

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
| Bitcoin         | `bitcoinjs-lib`                    |
| Sui             | `@mysten/sui.js`                   |

**Example for Solana + Ethereum support (using @solana/web3.js):**

```bash
npm install @phantom/react-sdk @solana/web3.js viem
```

**Example for Solana + Ethereum support (using @solana/kit):**

```bash
npm install @phantom/react-sdk @solana/kit viem
```

For complete dependency information and bundle optimization tips, see the [@phantom/browser-sdk documentation](../browser-sdk/README.md#bundle-optimization-tips).

## Quick Start

### Basic Setup

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { AddressType } from "@phantom/client";

function App() {
  return (
    <PhantomProvider
      config={{
        providerType: "injected", // Uses Phantom browser extension
      }}
    >
      <YourApp />
    </PhantomProvider>
  );
}
```

### Embedded Wallet Setup

```tsx
import { PhantomProvider } from "@phantom/react-sdk";
import { AddressType } from "@phantom/client";

function App() {
  return (
    <PhantomProvider
      config={{
        providerType: "embedded",
        embeddedWalletType: "app-wallet", // or 'user-wallet'
        addressTypes: [AddressType.solana, AddressType.ethereum],
        apiBaseUrl: "https://api.phantom.app/v1/wallets",
        organizationId: "your-org-id",
      }}
    >
      <YourApp />
    </PhantomProvider>
  );
}
```

## Provider Types

### Injected Provider

Uses the Phantom browser extension installed by the user.

```tsx
<PhantomProvider
  config={{
    providerType: "injected",
  }}
>
  <YourApp />
</PhantomProvider>
```

### Embedded Provider

Creates non-custodial wallets embedded in your application.

#### App Wallet (Recommended for most apps)

- **New wallets** created per application
- **Unfunded** by default - you need to fund them
- **Independent** from user's existing Phantom wallet

```tsx
<PhantomProvider
  config={{
    providerType: "embedded",
    embeddedWalletType: "app-wallet",
    addressTypes: [AddressType.solana],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    organizationId: "your-org-id",
  }}
>
  <YourApp />
</PhantomProvider>
```

#### User Wallet (For existing Phantom users)

- **Uses Phantom authentication** - user logs in with existing account
- **Potentially funded** - brings existing wallet balance
- **Connected** to user's Phantom ecosystem

```tsx
<PhantomProvider
  config={{
    providerType: "embedded",
    embeddedWalletType: "user-wallet",
    addressTypes: [AddressType.solana, AddressType.ethereum],
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    organizationId: "your-org-id",
  }}
>
  <YourApp />
</PhantomProvider>
```

## Solana Provider Configuration

When using `AddressType.solana`, you can choose between two Solana libraries:

```tsx
<PhantomProvider
  config={{
    providerType: "embedded",
    addressTypes: [AddressType.solana],
    solanaProvider: "web3js", // or 'kit'
    apiBaseUrl: "https://api.phantom.app/v1/wallets",
    organizationId: "your-org-id",
  }}
>
  <YourApp />
</PhantomProvider>
```

**Provider Options:**

- `'web3js'` (default) - Uses `@solana/web3.js` library
- `'kit'` - Uses `@solana/kit` library (modern, TypeScript-first)

**When to use each:**

- **@solana/web3.js**: Better ecosystem compatibility, wider community support
- **@solana/kit**: Better TypeScript support, modern architecture, smaller bundle size

## Available Hooks

### useConnect

Connect to wallet:

```tsx
import { useConnect } from "@phantom/react-sdk";

function ConnectButton() {
  const { connect, isLoading, error } = useConnect();

  const handleConnect = async () => {
    try {
      const { walletId, addresses } = await connect();
      console.log("Connected addresses:", addresses);
    } catch (err) {
      console.error("Failed to connect:", err);
    }
  };

  return (
    <button onClick={handleConnect} disabled={isLoading}>
      {isLoading ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

### useAccounts

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

### useIsExtensionInstalled

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

**Features:**

- **Session-based caching**: Result is cached during the browser session to avoid redundant checks
- **Automatic detection**: Runs automatically when the hook is first used
- **Loading states**: Provides `isLoading` during the initial check
- **Performance optimized**: Subsequent calls return cached result instantly

**Use cases:**

- Show installation prompts for users without the extension
- Conditionally render UI based on extension availability
- Provide fallback options when extension is not installed

### useDisconnect

Disconnect from wallet:

```tsx
import { useDisconnect } from "@phantom/react-sdk";

function DisconnectButton() {
  const { disconnect, isLoading } = useDisconnect();

  return (
    <button onClick={disconnect} disabled={isLoading}>
      {isLoading ? "Disconnecting..." : "Disconnect"}
    </button>
  );
}
```

### useSignMessage

Sign messages with native string input:

```tsx
import { useSignMessage, NetworkId } from "@phantom/react-sdk";

function SignMessage() {
  const { signMessage, isLoading, error } = useSignMessage();

  const handleSign = async () => {
    try {
      const signature = await signMessage({
        message: "Hello from Phantom!",
        networkId: NetworkId.SOLANA_MAINNET,
      });
      console.log("Signature:", signature);
    } catch (err) {
      console.error("Failed to sign:", err);
    }
  };

  return (
    <button onClick={handleSign} disabled={isLoading}>
      {isLoading ? "Signing..." : "Sign Message"}
    </button>
  );
}
```

### useSignAndSendTransaction

#### Solana Transaction

```tsx
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";
import {
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";

function SendSolanaTransaction() {
  const { signAndSendTransaction, isLoading, error } = useSignAndSendTransaction();

  const handleSend = async () => {
    // Get recent blockhash
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transfer instruction
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

    try {
      const result = await signAndSendTransaction({
        networkId: NetworkId.SOLANA_MAINNET,
        transaction: transaction, // Native VersionedTransaction object!
      });
      console.log("Transaction sent:", result.rawTransaction);
    } catch (err) {
      console.error("Failed to send:", err);
    }
  };

  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? "Sending..." : "Send SOL"}
    </button>
  );
}
```

#### Ethereum Transaction (with Viem)

```tsx
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";
import { parseEther, parseGwei } from "viem";

function SendEthereumTransaction() {
  const { signAndSendTransaction, isLoading } = useSignAndSendTransaction();

  const handleSend = async () => {
    try {
      const result = await signAndSendTransaction({
        networkId: NetworkId.ETHEREUM_MAINNET,
        transaction: {
          to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
          value: parseEther("0.001"), // 0.001 ETH
          gas: 21000n,
          gasPrice: parseGwei("20"), // 20 gwei
        },
      });
      console.log("Transaction sent:", result);
    } catch (err) {
      console.error("Failed to send:", err);
    }
  };

  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? "Sending..." : "Send ETH"}
    </button>
  );
}
```

## Network Support

### Supported Networks

The SDK automatically determines the transaction type from the NetworkId:

#### Solana

- `NetworkId.SOLANA_MAINNET`
- `NetworkId.SOLANA_DEVNET`
- `NetworkId.SOLANA_TESTNET`

#### Ethereum/EVM

- `NetworkId.ETHEREUM_MAINNET`
- `NetworkId.ETHEREUM_SEPOLIA`
- `NetworkId.POLYGON_MAINNET`
- `NetworkId.ARBITRUM_ONE`
- `NetworkId.OPTIMISM_MAINNET`
- `NetworkId.BASE_MAINNET`

#### Bitcoin

- `NetworkId.BITCOIN_MAINNET`
- `NetworkId.BITCOIN_TESTNET`

#### Sui

- `NetworkId.SUI_MAINNET`
- `NetworkId.SUI_TESTNET`
- `NetworkId.SUI_DEVNET`

### Provider Network Support

| Provider Type | Network Support                                 |
| ------------- | ----------------------------------------------- |
| **Injected**  | All networks supported by Phantom extension     |
| **Embedded**  | All networks based on configured `addressTypes` |

## Transaction Examples

### Solana with @solana/web3.js

```tsx
import { VersionedTransaction, TransactionMessage, SystemProgram, PublicKey, Connection } from "@solana/web3.js";
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";

function SolanaExample() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const sendTransaction = async () => {
    // Get recent blockhash
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transfer instruction
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

    // No serialization or encoding needed!
    const result = await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction,
    });
  };
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
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";

function SolanaKitExample() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const sendTransaction = async () => {
    const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      tx => setTransactionMessageFeePayer(address(userPublicKey), tx),
      tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    );

    const transaction = compileTransaction(transactionMessage);

    const result = await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction,
    });
  };
}
```

### Ethereum with Viem

```tsx
import { parseEther, parseGwei, encodeFunctionData } from "viem";
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";

function EthereumExample() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const sendEth = async () => {
    const result = await signAndSendTransaction({
      networkId: NetworkId.ETHEREUM_MAINNET,
      transaction: {
        to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
        value: parseEther("1"), // 1 ETH
        gas: 21000n,
        gasPrice: parseGwei("20"), // 20 gwei
      },
    });
  };

  const sendToken = async () => {
    const result = await signAndSendTransaction({
      networkId: NetworkId.ETHEREUM_MAINNET,
      transaction: {
        to: tokenContractAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipientAddress, parseEther("100")],
        }),
        gas: 50000n,
        maxFeePerGas: parseGwei("30"),
        maxPriorityFeePerGas: parseGwei("2"),
      },
    });
  };
}
```

## Advanced Usage

### Multi-Chain Application

```tsx
import { useSignAndSendTransaction, NetworkId } from "@phantom/react-sdk";
import { VersionedTransaction, TransactionMessage, SystemProgram, PublicKey, Connection } from "@solana/web3.js";
import { parseEther } from "viem";

function MultiChainWallet() {
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const sendSolana = async () => {
    // Get recent blockhash
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(solanaAddress),
      toPubkey: new PublicKey(recipient),
      lamports: 1000000,
    });

    // Create VersionedTransaction
    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(solanaAddress),
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    return await signAndSendTransaction({
      networkId: NetworkId.SOLANA_MAINNET,
      transaction,
    });
  };

  const sendEthereum = async () => {
    return await signAndSendTransaction({
      networkId: NetworkId.ETHEREUM_MAINNET,
      transaction: {
        to: recipient,
        value: parseEther("0.1"),
        gas: 21000n,
      },
    });
  };

  return (
    <div>
      <button onClick={sendSolana}>Send SOL</button>
      <button onClick={sendEthereum}>Send ETH</button>
    </div>
  );
}
```

## Hooks Reference

Quick reference of all available hooks:

| Hook                        | Purpose                    | Returns                                        |
| --------------------------- | -------------------------- | ---------------------------------------------- |
| `useConnect`                | Connect to wallet          | `{ connect, isConnecting, error }`             |
| `useAccounts`               | Get wallet addresses       | `WalletAddress[]` or `null`                    |
| `useIsExtensionInstalled`   | Check extension status     | `{ isLoading, isInstalled }`                   |
| `useDisconnect`             | Disconnect from wallet     | `{ disconnect, isDisconnecting }`              |
| `useSignMessage`            | Sign text messages         | `{ signMessage, isSigning, error }`            |
| `useSignAndSendTransaction` | Sign and send transactions | `{ signAndSendTransaction, isSigning, error }` |
| `usePhantom`                | Get provider context       | `{ isConnected, isReady }`                     |

## Configuration Reference

```typescript
interface PhantomSDKConfig {
  providerType: "injected" | "embedded";
  appName?: string; // Optional app name for branding
  appLogo?: string; // Optional app logo URL for branding
  addressTypes?: AddressType[]; // Networks to enable (e.g., [AddressType.solana])

  // Required for embedded provider only
  apiBaseUrl?: string; // Phantom API base URL
  organizationId?: string; // Your organization ID
  authOptions?: {
    authUrl?: string; // Custom auth URL (optional)
    redirectUrl?: string; // Custom redirect URL (optional)
  };
  embeddedWalletType?: "app-wallet" | "user-wallet"; // Wallet type
  solanaProvider?: "web3js" | "kit"; // Solana library choice (default: 'web3js')
  autoConnect?: boolean; // Auto-connect to existing session on SDK instantiation (default: true for embedded, false for injected)

  // Debug options
  debug?: {
    enabled?: boolean; // Enable debug logging
    level?: "info" | "warn" | "error"; // Debug level
    callback?: (level: string, message: string, data?: any) => void; // Custom debug callback
  };
}
```

For more details, examples, and bundle optimization tips, see the [@phantom/browser-sdk documentation](../browser-sdk/README.md).
